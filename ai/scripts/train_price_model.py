"""Price-driver XGBoost regression pipeline for the Bali hotel dataset (Stage 1).

Validates the explainability *architecture* (XGBoost + SHAP) on an external
benchmark dataset -- not trained on Aceh data, see CLAUDE.md. Run:
    python scripts/train_price_model.py
"""
import re
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import KFold, train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "Updated_ScrapingHotelTiketcom.csv"
MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
TABLES_DIR = Path(__file__).resolve().parent.parent / "outputs" / "tables"

RANDOM_STATE = 42
SPARSE_LEVEL_THRESHOLD = 5  # group Location/Category levels with fewer rows into "Other"

# Facility keyword -> regex variant(s) to match (unioned, not summed, since the
# scraped blob repeats the same amenity under multiple section headers -- e.g.
# "Gym", "Fasilitas Gym", and "Pusat Kebugaran" are the same facility, and
# "Antar Jemput Bandara" appears both with and without a slash). Consolidated
# after checking real frequencies (see AI-02 report) so we don't double-count
# the same amenity as two separate binary columns.
#
# NOTE: plain substring matching, deliberately NOT \b-word-boundary-wrapped.
# The scraped Facilities blob has no separators between concatenated facility
# names (e.g. "...KebugaranACAntar..." -- "AC" has no word boundary around it
# at all), so \b patterns silently under-match short keywords like AC/Spa/
# Lift/Bar. Verified plain substring frequencies against manual inspection
# during EDA before choosing this.
FACILITY_KEYWORDS = {
    "kolam_renang": [r"Kolam Renang"],
    "ac": [r"AC"],
    "shower": [r"Shower"],
    "jemput_bandara": [r"Antar/?\s*Jemput Bandara"],
    "televisi": [r"Televisi"],
    "resepsionis_24jam": [r"Resepsionis 24 Jam"],
    "laundry": [r"Laundry"],
    "restoran": [r"Restoran"],
    "brankas": [r"Brankas"],
    "bar": [r"Bar"],
    "bebas_rokok": [r"Bebas Rokok"],
    "keamanan": [r"Keamanan"],
    "spa": [r"Spa"],
    "concierge": [r"Concierge"],
    "lift": [r"Lift"],
    "pijat": [r"Pijat"],
    "dokter": [r"Dokter"],
    "gym": [r"Gym", r"Fasilitas Gym", r"Pusat Kebugaran"],
    "kolam_renang_pribadi": [r"Kolam Renang Pribadi"],
    "kursi_roda": [r"Kursi Roda"],
    "porter": [r"Porter"],
    "smart_tv": [r"Smart TV"],
    "makanan_halal": [r"Makanan Halal"],
    "streaming": [r"Streaming"],
    "sarapan": [r"Sarapan"],
    "bidet": [r"Bidet"],
    "ruang_konferensi": [r"Ruang Konferensi"],
    # Excluded after checking real frequencies:
    #   WiFi (98.4%) / Parkir (96.6%) -- near-constant, ~no discriminative power
    #   Jacuzzi (3.1%) -- too rare, high overfitting risk on 444 rows
    #   Hewan Peliharaan -- ambiguous: every sampled row pairs it with "Tidak
    #     Diperbolehkan" (not allowed), so raw presence doesn't mean pet-friendly
}


def load_and_clean() -> pd.DataFrame:
    df = pd.read_csv(DATA_FILE, sep=";")
    before = len(df)
    df = df.drop_duplicates().reset_index(drop=True)
    print(f"[clean] dropped {before - len(df)} exact duplicate rows ({before} -> {len(df)})")

    df["Rating"] = df["Rating"].str.replace(",", ".", regex=False).astype(float)

    null_mask = df[["Price Starts From", "Location", "Category"]].isnull().any(axis=1)
    print(f"[clean] {null_mask.sum()} row(s) null in Price/Location/Category (also null in "
          f"Title/Facilities -- a fully-failed scrape entry, not a partial one):")
    print(df[null_mask].to_string())
    df = df.dropna(subset=["Price Starts From", "Location", "Category"]).reset_index(drop=True)
    print(f"[clean] {len(df)} rows remain after dropping it")

    return df


def group_sparse(series: pd.Series, threshold: int, label: str) -> pd.Series:
    counts = series.value_counts()
    sparse = counts[counts < threshold].index
    print(f"[{label}] {len(counts)} raw levels -> grouping {len(sparse)} level(s) with "
          f"<{threshold} rows into 'Other': {list(sparse)}")
    grouped = series.where(~series.isin(sparse), "Other")
    print(f"[{label}] {grouped.nunique()} levels after grouping:")
    print(grouped.value_counts().to_string())
    return grouped


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    print("\n=== Location: raw value_counts (51 levels) ===")
    print(df["Location"].value_counts().to_string())
    print("\n=== Category: raw value_counts (16 levels) ===")
    print(df["Category"].value_counts().to_string())

    # Location is consistently "District, Regency" -- every value has a comma.
    # Regency is Bali's real administrative unit, and it's already encoded in
    # the data itself, so use that instead of inventing a geographic clustering.
    regency = df["Location"].apply(lambda x: x.split(",")[-1].strip())
    print("\n=== Extracted Regency (part after last comma), before grouping ===")
    print(regency.value_counts().to_string())

    regency_grouped = group_sparse(regency, SPARSE_LEVEL_THRESHOLD, "regency")
    category_grouped = group_sparse(df["Category"], SPARSE_LEVEL_THRESHOLD, "category")

    facilities = df["Facilities"].fillna("")
    facility_features = {}
    print("\n=== Facility features (consolidated, frequency-filtered) ===")
    for name, patterns in FACILITY_KEYWORDS.items():
        combined = "|".join(patterns)
        hit = facilities.str.contains(combined, case=False, regex=True).astype(int)
        facility_features[f"fac_{name}"] = hit
        print(f"  fac_{name}: {hit.sum()}/{len(df)} = {hit.mean()*100:.1f}%")

    features = pd.DataFrame(facility_features, index=df.index)
    features["rating"] = df["Rating"]
    features["review_count"] = df["Review Count"]
    features["star"] = df["Star Hotel/Villa/Resort"]
    features = pd.concat(
        [features, pd.get_dummies(regency_grouped, prefix="regency"), pd.get_dummies(category_grouped, prefix="category")],
        axis=1,
    )
    return features


def run_cv(X: pd.DataFrame, y_raw: pd.Series) -> pd.DataFrame:
    y_log = np.log1p(y_raw)
    kf = KFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)

    rows = []
    for fold, (train_idx, test_idx) in enumerate(kf.split(X), start=1):
        X_train_full, X_test = X.iloc[train_idx], X.iloc[test_idx]
        y_train_full_log = y_log.iloc[train_idx]
        y_test_raw = y_raw.iloc[test_idx]

        # Inner split for early stopping -- never touches the outer test fold,
        # so the stopping decision can't leak into the reported CV metric.
        X_train, X_val, y_train_log, y_val_log = train_test_split(
            X_train_full, y_train_full_log, test_size=0.2, random_state=RANDOM_STATE
        )

        model = make_model()
        model.fit(X_train, y_train_log, eval_set=[(X_val, y_val_log)], verbose=False)

        pred_log = model.predict(X_test)
        pred_raw = np.expm1(pred_log)

        rmse = float(np.sqrt(mean_squared_error(y_test_raw, pred_raw)))
        mae = float(mean_absolute_error(y_test_raw, pred_raw))
        r2 = float(r2_score(y_test_raw, pred_raw))
        rows.append({"fold": fold, "rmse": rmse, "mae": mae, "r2": r2, "best_iteration": model.best_iteration})
        print(f"[fold {fold}] rmse={rmse:,.0f}  mae={mae:,.0f}  r2={r2:.3f}  best_iter={model.best_iteration}")

    return pd.DataFrame(rows)


def make_model(n_estimators: int = 500, early_stopping_rounds: int | None = 20) -> xgb.XGBRegressor:
    # Conservative on purpose: N=444, ~49 features. Shallow trees + strong L1/L2
    # + row/column subsampling + early stopping so the model generalizes instead
    # of memorizing 444 rows.
    return xgb.XGBRegressor(
        max_depth=3,
        n_estimators=n_estimators,
        learning_rate=0.05,
        reg_alpha=1.0,
        reg_lambda=2.0,
        subsample=0.8,
        colsample_bytree=0.8,
        min_child_weight=5,
        early_stopping_rounds=early_stopping_rounds,
        eval_metric="rmse",
        random_state=RANDOM_STATE,
    )


def main():
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    TABLES_DIR.mkdir(parents=True, exist_ok=True)

    df = load_and_clean()
    X = engineer_features(df)
    y = df["Price Starts From"]

    print(f"\n[features] {X.shape[1]} features x {X.shape[0]} rows "
          f"(~{X.shape[0]/X.shape[1]:.1f} rows per feature)")

    print("\n=== 5-fold cross-validation ===")
    cv_results = run_cv(X, y)

    summary = cv_results[["rmse", "mae", "r2"]].agg(["mean", "std"])
    print("\n=== CV summary (mean +/- std across 5 folds) ===")
    print(summary.to_string())

    r2_mean = summary.loc["mean", "r2"]
    if r2_mean > 0.9:
        print(f"\n[WARNING] mean CV R2 = {r2_mean:.3f} > 0.9 on only {len(df)} rows -- "
              f"this is a leakage red flag, not a result to celebrate. Investigate "
              f"before reporting it.")
    else:
        print(f"\n[check] mean CV R2 = {r2_mean:.3f} -- not suspiciously high for N={len(df)}.")

    metrics_out = cv_results.copy()
    metrics_out.loc["mean"] = ["mean", *summary.loc["mean"], cv_results["best_iteration"].mean()]
    metrics_out.loc["std"] = ["std", *summary.loc["std"], cv_results["best_iteration"].std()]
    metrics_path = TABLES_DIR / "model_metrics.csv"
    metrics_out.to_csv(metrics_path, index=False)
    print(f"\n[saved] {metrics_path}")

    # Final model must actually be trained on all rows (not just a train split).
    # Two steps: (1) a probe run with a held-out slice purely to pick the
    # early-stopping round count, that slice is never fit on; (2) refit fresh
    # on the FULL dataset using that fixed round count, no early stopping (no
    # held-out data left to monitor against).
    X_probe_train, X_probe_val, y_probe_train, y_probe_val = train_test_split(
        X, y, test_size=0.15, random_state=RANDOM_STATE
    )
    probe = make_model()
    probe.fit(
        X_probe_train, np.log1p(y_probe_train),
        eval_set=[(X_probe_val, np.log1p(y_probe_val))], verbose=False,
    )
    best_n_estimators = probe.best_iteration + 1
    print(f"\n[final model] early-stopping probe on {len(X_probe_train)}/{len(X_probe_val)} "
          f"split picked best_iteration={probe.best_iteration}")
    print(f"[final model] refitting on all {len(X)} rows with n_estimators={best_n_estimators}")

    final_model = make_model(n_estimators=best_n_estimators, early_stopping_rounds=None)
    final_model.fit(X, np.log1p(y))

    model_path = MODELS_DIR / "xgb_model.pkl"
    joblib.dump({"model": final_model, "feature_names": list(X.columns)}, model_path)
    print(f"[saved] {model_path}")


if __name__ == "__main__":
    main()
