"""SHAP explainability figures for Paper B, using the model trained in AI-02.

Model was trained on log1p(Price Starts From). SHAP values are only additive
in the space a model was actually trained on, so everything here explains
contributions to log1p(price) -- NOT raw Rupiah. That's labeled explicitly on
every figure and in the CSV so it can't be misread later when pulled into the
paper. Run: python scripts/generate_shap_figures.py
"""
import sys
from pathlib import Path

import joblib
import matplotlib.pyplot as plt
import pandas as pd
import shap

sys.path.insert(0, str(Path(__file__).resolve().parent))
from train_price_model import engineer_features, load_and_clean  # noqa: E402

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
FIGURES_DIR = Path(__file__).resolve().parent.parent / "outputs" / "figures"
TABLES_DIR = Path(__file__).resolve().parent.parent / "outputs" / "tables"

DPI = 300
# Viridis instead of SHAP's default red/blue: perceptually monotonic in
# luminance (dark -> light), so it still reads correctly when the figure is
# printed or photocopied in grayscale. Red/blue often collapse to near-
# identical gray, silently destroying the "high vs low feature value" story.
GRAYSCALE_SAFE_CMAP = plt.get_cmap("viridis")


def main():
    FIGURES_DIR.mkdir(parents=True, exist_ok=True)
    TABLES_DIR.mkdir(parents=True, exist_ok=True)

    bundle = joblib.load(MODELS_DIR / "xgb_model.pkl")
    model = bundle["model"]
    feature_names = bundle["feature_names"]

    df = load_and_clean()
    X = engineer_features(df)
    X = X[feature_names]  # guarantee identical column order to training
    price = df["Price Starts From"].reset_index(drop=True)

    explainer = shap.TreeExplainer(model)
    shap_values = explainer(X)

    # === 1. SHAP summary (beeswarm) plot -- global feature importance ===
    plt.figure(figsize=(9, 7))
    shap.plots.beeswarm(shap_values, max_display=15, color=GRAYSCALE_SAFE_CMAP, show=False)
    plt.title(
        "SHAP Summary — Feature Contributions to log1p(Price)\n"
        "(Bali hotel listings, N=444, external benchmark dataset -- see CLAUDE.md)"
    )
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "shap_summary.png", dpi=DPI, bbox_inches="tight")
    plt.close()
    print("[saved] shap_summary.png")

    # === 2. Waterfall plots: low / mid / high price examples ===
    idx_high = int(price.idxmax())
    idx_low = int(price.idxmin())
    idx_mid = int((price - price.median()).abs().idxmin())
    examples = {"low": idx_low, "mid": idx_mid, "high": idx_high}

    for label, idx in examples.items():
        shap.plots.waterfall(shap_values[idx], max_display=12, show=False)
        actual_price = price.iloc[idx]
        # shap.plots.waterfall builds its own figure internally (ignores any
        # figsize set beforehand) and reserves no space for an extra title, so
        # the title has to go on above its own f(x) annotation with enough top
        # margin, and the save has to use bbox_inches="tight" or long title
        # text gets clipped at the figure's right/top edge instead of growing it.
        fig = plt.gcf()
        fig.suptitle(
            f"SHAP Waterfall — {label.title()}-Price Example\n"
            f"(actual price Rp {actual_price:,.0f}, row {idx})",
            fontsize=11, y=1.08,
        )
        plt.savefig(FIGURES_DIR / f"shap_waterfall_{label}.png", dpi=DPI, bbox_inches="tight")
        plt.close()
        print(f"[saved] shap_waterfall_{label}.png (row idx={idx}, price=Rp{actual_price:,.0f})")

    # === 3. Standard feature importance bar chart -- gain-based, a distinct
    # method from SHAP, for reviewers who prefer it. Single neutral color:
    # bar length carries the information, nothing color-dependent to lose.
    importances = pd.Series(model.feature_importances_, index=feature_names).sort_values(ascending=False)
    top_n = importances.head(15)
    plt.figure(figsize=(9, 7))
    plt.barh(top_n.index[::-1], top_n.values[::-1], color="#4c4c4c")
    plt.xlabel("XGBoost Feature Importance (gain)")
    plt.title("Standard Feature Importance — Top 15 Features")
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "feature_importance_bar.png", dpi=DPI, bbox_inches="tight")
    plt.close()
    print("[saved] feature_importance_bar.png")

    # === 4. Raw SHAP values as CSV ===
    shap_df = pd.DataFrame(shap_values.values, columns=feature_names)
    shap_df.insert(0, "row_index", X.index)
    shap_df.insert(1, "actual_price_idr", price.values)
    shap_df.insert(2, "base_value_log1p_price", shap_values.base_values)
    shap_df.insert(3, "predicted_log1p_price", shap_values.base_values + shap_values.values.sum(axis=1))
    shap_csv_path = TABLES_DIR / "shap_values.csv"
    shap_df.to_csv(shap_csv_path, index=False)
    print(f"[saved] {shap_csv_path}")


if __name__ == "__main__":
    main()
