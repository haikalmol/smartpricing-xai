# /ai — Paper B research pipeline

Separate from `/backend` and `/frontend`, never deployed (Render's Stage K
build doesn't touch this folder). See CLAUDE.md's "/ai folder" section for
scope and constraints.

## 1. What this is and why it exists

SmartPricing XAI's core claim (Paper A + Paper B) is that an XGBoost + SHAP
pipeline can generate plausible, human-readable pricing rationales for
tourism listings. Real Aceh UMKM data doesn't exist yet — mitra testing
(H16–H17) hasn't happened. This pipeline validates that the explainability
*architecture itself* works — that SHAP produces sensible, additive,
per-feature explanations for a tree-based pricing model — against an
established external dataset, so Paper B's methodology section has a working,
reproducible reference implementation ahead of real pilot data.

It answers "does this modeling + explainability approach behave sensibly on
real accommodation-pricing data?", not "what should an Aceh UMKM charge?".

## 2. Dataset

**Hotel Listings in Bali (Scraped Data)**
Kaggle: https://www.kaggle.com/datasets/anisyanugraheni/hotel-listings-in-bali-scraped-data
Uploaded by: `anisyanugraheni` (Kaggle username; dataset ID 8296401)
File used: `Updated_ScrapingHotelTiketcom.csv` (444 rows after cleaning, see
Stage 1 log for the dedup/null-drop trail)

Per the dataset's own description: the listings were scraped from
**Tiket.com** and are **unofficial, not provided directly by Tiket.com**.
The uploader states the data is "intended for research, analysis, and
educational use only" and that "all rights to the original data remain with
Tiket.com." This project's use — validating an explainability architecture
for a PKM research paper, not a commercial product — is consistent with
those terms. Prices/facilities may not reflect current real-world listings.

A second candidate dataset, `gusnara/data-hotel-airbnb-in-bali`, was
evaluated and rejected in Stage 1 (`ai/scripts/download_data.py` docstring
has the detail): no price column, no reviews/ratings, and several rows
outside Bali despite the dataset name.

## 3. Limitation — read before citing this in the paper

**This pipeline is trained on Bali hotel/villa/resort listings scraped from
Tiket.com. It is NOT trained on Aceh data, and it does NOT cover
SmartPricing XAI's full three-category scope.**

- SmartPricing XAI targets three UMKM categories: **homestay, sewa motor
  (motorbike rental), and guide wisata (tour guides)**. This dataset is
  accommodation listings only (hotel/villa/resort/guest house/etc.) — it
  covers, at best, an analogue of the homestay category. It says nothing
  about motorbike-rental or tour-guide pricing drivers.
- It validates the **explainability methodology and architecture** (does
  XGBoost + SHAP produce coherent, additive, plausible-looking pricing
  rationales on real accommodation data?) — it does not validate any
  Aceh-specific claim, and its feature importances (e.g. "star rating drives
  price") are Bali-hotel-market findings, not Aceh-UMKM findings.
- Correct framing for the paper: *"we validated our SHAP explainability
  pipeline against an established Indonesian tourism benchmark dataset
  (Bali hotel listings) ahead of pilot data availability."* Incorrect
  framing, to be caught in every editing pass: *"our model predicts Aceh
  UMKM demand"* or any claim implying coverage of sewa motor / guide wisata,
  or Aceh specifically. If a later draft blurs this distinction, fix the
  text, not the disclaimer.

## 4. Reproduce

```bash
cd ai
python -m venv .venv
./.venv/Scripts/activate       # .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
```

Kaggle API credentials required for the download step: place
`kaggle.json` at `~/.kaggle/kaggle.json` (or set `KAGGLE_USERNAME`/
`KAGGLE_KEY`). Never commit `kaggle.json` — already gitignored.

Stages, in order:

```bash
python scripts/download_data.py        # Stage 1: fetch the Kaggle dataset into ai/data/
python scripts/inspect_data.py         # Stage 1: shape/dtype/null sanity check
python scripts/train_price_model.py    # Stage 2: clean, engineer features, 5-fold CV, train final model
python scripts/generate_shap_figures.py  # Stage 3: SHAP figures + shap_values.csv
```

Outputs land in `ai/models/` (gitignored — regenerate locally, don't expect
`xgb_model.pkl` in git) and `ai/outputs/{figures,tables}/` (committed —
these feed Paper B directly).

**Note:** `xgboost` is pinned `<3.0` in `requirements.txt` — 3.x changed how
`base_score` is serialized in a way the current `shap` release can't parse.
If you bump either dependency, rerun the full Stage 2 → 3 chain and confirm
`shap.TreeExplainer(model)` still loads before trusting the output.

## 5. Pending — not yet built

A second, Aceh-specific analysis, covering all three business categories
(homestay, sewa motor, guide wisata) against real Supabase data, once mitra
testing (H16–H17) produces it (~Nov). This is **Stage 5**, deliberately not
started — building it now with fake data standing in for real results would
produce numbers that look like findings but aren't. Do not backfill this
section early.
