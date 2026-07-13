# Rule-Based Engine vs. SHAP-ML Pipeline — Comparison for Paper B

Every cell below cites a real artifact from this project (a file, a measured
number, a live-verified test from an earlier stage) rather than a generic
literature claim about rule-based systems or SHAP in the abstract. "Rule-based
engine" is the production system (`backend/app/engine/weighting.py`),
currently live. "SHAP-ML pipeline" is the research pipeline validated in
AI-01–06 against an external Bali benchmark dataset — never deployed, per
CLAUDE.md's `/ai` folder scope.

| Axis | Rule-Based Engine (production) | SHAP-ML Pipeline (AI-01–06 research) |
|---|---|---|
| **Transparency** | The stated rationale *is* the mechanism. `rationale_text` is produced by the same line that picks the price adjustment — `dominant = max(contributions, key=lambda c: abs(c.points))` (`weighting.py`). No approximation step sits between the decision and its explanation. | Post-hoc approximation of a 49-feature XGBoost ensemble. SHAP values are provably additive only in the space the model was trained on — `log1p(price)` — confirmed in AI-03 (`base_value + Σcontributions` reconstructs the prediction to within 1.2e-6). They are **not** validly expm1-transformable per feature into a Rupiah-space explanation, so the "real" rationale a merchant would read cannot be recovered feature-by-feature from the raw SHAP output. |
| **Data requirements** | Zero historical data. Runs correctly from day one — live-verified in the H21/H22 location-bug fix by geocoding real Aceh locations (Sabang, Lhokseumawe) and confirming genuine OpenWeather/Geoapify responses drove the output. No training phase exists. | Required N=444 rows (after cleaning 458 raw scraped rows, AI-02) from an **external Bali hotel dataset**, because real Aceh UMKM data doesn't exist yet. Production Supabase currently holds **exactly 1 real merchant record** (queried live for this table) — nowhere near enough to train anything on today. |
| **Infra / compute cost** | Ships in `backend/requirements.txt` — 10 packages, zero ML libraries. Measured cold-import time for its actual runtime deps (`fastapi`, `sqlalchemy`, `requests`, `bcrypt`, `jwt`), same machine: **0.41s**. No model artifact to load; one recommendation = 2 live HTTP calls + a dict lookup. | `ai/requirements.txt` carries 13 packages including `xgboost`, `shap`, `scikit-learn`, `pandas`, `numpy` — CLAUDE.md deliberately keeps these out of `backend/requirements.txt` so Render's free-tier build never carries them. Measured cold-import time for the equivalent ML deps (`xgboost`, `shap`, `sklearn`, `pandas`, `numpy`), same machine: **1.42s (~3.4x)**. The trained artifact itself (`xgb_model.pkl`) is 123 KB and would additionally need loading plus a `TreeExplainer` instantiation before a single prediction. |
| **Explanation fidelity** | Exact, not approximated. The AI-06 sensitivity sweep (189 real scenarios through the actual production function) reproduces the engine's discrete thresholds (`DENSITY_LOW_THRESHOLD=5`, `DENSITY_HIGH_THRESHOLD=15`) with zero deviation, every time — the explanation is a direct readout of the computation, not an estimate of it. | Locally accurate — Shapley values are additive by construction for a given row (AI-03, confirmed to 1.2e-6). But a beeswarm/global-importance summary can misrepresent a specific merchant's case, since it's aggregated across all 444 training rows, not computed uniquely for theirs. Cross-validated **R² = 0.333 ± 0.074** (5-fold, AI-02/AI-03 retrain) — the model explains roughly a third of price variance on held-out Bali data, so even a faithful local SHAP explanation is explaining a moderately noisy model, not a demonstrated pricing law. |
| **Adaptability** | Manual recalibration only. Thresholds like `DENSITY_LOW_THRESHOLD`/`DENSITY_HIGH_THRESHOLD` (`weighting.py`) are hardcoded constants a developer edits and redeploys. | Can in principle retrain on accumulated real approve/reject feedback once it exists. The wiring already exists but is deliberately inert: `ai/scripts/analyze_production_data.py` (AI-05) reuses `backend/app`'s own SQLAlchemy models to query real `Merchant`/`Service`/`Recommendation` history, but `compute_approval_rates()` is not called anywhere yet — gated on H16–H17 pilot data (~Nov). |
| **Suitability for target users** | A single Bahasa Indonesia sentence naming one concrete cause (e.g. *"Cuaca: Mendung — wisata diprediksi ramai akhir pekan ini"*) — matches CLAUDE.md's "Alasan Algoritma" spec directly, with no translation layer, legible without statistical literacy. | A beeswarm plot or waterfall chart (AI-03 outputs) assumes the reader can parse signed per-feature contributions, a coordinate axis, and a log-transformed target — appropriate for a methodology section, not a homestay owner's phone screen. CLAUDE.md's target device is a budget-Android 360×800 viewport; none of the AI-03 figures were designed to render there. |

## Sources

- Cross-validated metrics: `ai/outputs/tables/model_metrics.csv` (5-fold CV, retrained under `xgboost<3.0`, AI-03)
- SHAP additivity check: AI-03 report (`shap_values.csv` sanity check, max reconstruction error 1.2e-6)
- Sensitivity sweep: `ai/outputs/tables/sensitivity_grid.csv`, `ai/outputs/figures/sensitivity_analysis.png` (AI-06, 189 scenarios)
- Dataset size: `ai/data/Updated_ScrapingHotelTiketcom.csv` (458 raw rows, 444 after cleaning per AI-02/AI-03 run logs)
- Production merchant count: live query against Supabase at time of writing (`SELECT count(*) FROM merchant` → 1)
- Model artifact size: `ai/models/xgb_model.pkl`, 125,784 bytes
- Dependency lists: `backend/requirements.txt` (10 packages, no ML libs), `ai/requirements.txt` (13 packages)
- Cold-import timings: measured on the development machine via `python -c "import time; ..."` against each project's own `.venv`, not a Render production benchmark — a relative-magnitude data point, not a deployment SLA claim
- Rule-based live verification: H21 (geocoding fix) and H22 (rationale location-labeling) diagnosis reports, this session

## Synthesis (draft for Paper B discussion section)

SmartPricing XAI launches with the rule-based engine
(`backend/app/engine/weighting.py`) as its production recommendation
mechanism, not the SHAP-ML pipeline validated in AI-01–06. The reason is not
preference but the evidence above: the rule-based engine's rationale is
definitionally exact — the same code path that computes the discount also
names the dominant cause (AI-06) — requires no training data and was
live-verified against real Aceh locations with zero historical merchants on
file (H21/H22), and runs on Render's free tier with a measured ~3.4x lighter
cold-import footprint than the ML stack (0.41s vs 1.42s for equivalent
runtime imports) and no model artifact to serve. The SHAP-ML pipeline, by
contrast, is validated *architecture*, not a validated *product*: its
0.333 ± 0.074 cross-validated R² (5-fold, N=444) describes a Bali hotel
benchmark dataset, not Aceh UMKM pricing, and production Supabase currently
holds one real merchant record — nowhere near enough to retrain on. This is
precisely the gap `ai/scripts/analyze_production_data.py` (AI-05) was built
inert for: once H16–H17 pilot testing (~Nov) produces real accumulated
approve/reject history, its `compute_approval_rates()` and a future
retraining pipeline become viable, and SHAP's capacity to retrain on real
feedback is a genuine adaptability advantage the rule engine cannot match
without a developer manually re-deriving thresholds. Until that data exists,
positioning SHAP-ML as a validated future direction — architecture proven,
waiting on real data — is the more defensible claim for a Sinta 2 reviewer
than asserting it as the launch mechanism on the strength of an external
benchmark dataset alone.
