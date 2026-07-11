# CLAUDE.md — SmartPricing XAI

## Project
"Pemberdayaan UMKM Pariwisata Aceh Melalui Sistem Smart Promo & Bundling
Berbasis Explainable AI (XAI)" — PKM-BMD/BP grant, Universitas Muhammadiyah
Aceh. A mobile-first responsive **website** (not a native app) that helps
UMKM pariwisata (homestay, sewa motor, guide wisata) set smart cross-promo
pricing via Explainable AI recommendations, with a mandatory human-in-the-
loop approve/reject step.

## Non-negotiables (do not deviate without asking first)
- **Free-tier infra only.** Render/Railway/Supabase, OpenWeather free, Google
  Places free quota. Budget (Rp4jt total) is reserved for HKI filing (Rp400k)
  and journal APC (Rp1.5jt) — do not introduce any paid service or tier.
- **Website, not app.** Must work in a mobile browser, no install step. Design
  target: budget Android viewport (~360×800), not iPhone dimensions.
- **All user-facing UI copy is Bahasa Indonesia.** No English strings in
  anything a merchant sees.
- **Explainable AI is the thesis, not a feature.** Every pricing
  recommendation must ship with a plain-language rationale ("Alasan
  Algoritma") AND an explicit Approve/Reject action. Never auto-apply a price
  change. Both Paper A (adoption) and Paper B (architecture) depend on this
  being real and logged — don't fake or hardcode it.
- **HPP guard-rail is a hard constraint**, not a UI warning. The recommendation
  engine must be structurally incapable of suggesting a price below the
  merchant's declared HPP (Harga Pokok Penjualan).
- **Log every approve/reject decision** with timestamp and the rationale that
  was shown. This is required data for Paper A's engagement/adoption metrics
  — if it's not logged, it doesn't exist for the paper.

## Tech stack (locked per proposal Section G — don't substitute)
- Backend: Python, Flask or FastAPI
- Frontend: HTML/CSS/JS, React or Vue (minimalis — no heavy framework)
- Database: PostgreSQL or MySQL, free-tier hosted
- External APIs: OpenWeather (or BMKG) for weather; Google Places for
  location/crowd-density signal
- Hosting: Render or Railway (backend), same or Vercel (frontend)

## Core algorithm: hyper-localized weighting
**Inputs:** weather forecast, local cultural calendar (hari libur
lokal/waktu ibadah), visitor-density signal from Google Places.
**Output:** a discount/bundling suggestion + a rationale string that names
which input triggered it (e.g. "Cuaca: Mendung — wisata diprediksi ramai
akhir pekan ini").
**Guard-rail:** suggested_price must always be >= service.hpp. Enforce this
in the recommendation function itself, not just in the UI.

## Screens (exact copy/layout in the Figma AI prompt — match it)
1. **Saran AI** — home; current recommendation + rationale + approve/reject
2. **Katalog** — merchant's services/prices, link to edit HPP
3. **Input HPP** — set cost floor per service
4. **Akun** — profile, AI-notification toggle, help, logout

## Minimum data model
- `merchant` (id, name, business_name, location)
- `service` (id, merchant_id, name, listed_price, hpp)
- `recommendation` (id, service_id, suggested_price, rationale_text,
  weather_snapshot_json, status: pending/approved/rejected, created_at,
  responded_at)

## Out of scope for this build pass (H01–H15)
- Remote testing with mitra, SUS survey collection, analytics — Phase 3/4
  (H16+), separate work.
- Paper writing — Phase 5/6.
- Any paid service tier, any feature not listed above.

## Repo conventions
- `.env` for all secrets/API keys, add to `.gitignore` in the very first
  commit (H01) — never commit a key.
- Commit message per completed task ID, e.g. `H07: backend skeleton + routes`
  — this maps directly to the grant logbook Najwa maintains, keep it clean.
- Don't touch anything under a hypothetical `/logbook` or `/laporan` path —
  that's Najwa's admin track (N19–N21), not yours.
