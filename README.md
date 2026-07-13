# SmartPricing XAI

Website mobile-first untuk UMKM pariwisata Aceh (homestay, sewa motor, guide
wisata) yang memberikan rekomendasi harga smart promo & bundling berbasis
Explainable AI, lengkap dengan alasan yang bisa dibaca manusia ("Alasan
Algoritma") dan langkah approve/reject sebelum harga berubah — tidak pernah
diterapkan otomatis. Dibangun untuk hibah PKM-BMD/BP, Universitas
Muhammadiyah Aceh.

Lihat [CLAUDE.md](./CLAUDE.md) untuk konteks proyek lengkap: non-negotiables,
batasan infra free-tier, tech stack, algoritma inti, dan data model. Dokumen
ini (README) fokus ke cara menjalankan dan struktur repo.

## Status

Backend, frontend inti, sistem auth, dan perbaikan lokasi/geocoding sudah
berjalan di atas Supabase asli (lihat riwayat commit `H01`–`H22`, `PATCH-01`
sampai `PATCH-03`). Riset explainability terpisah (`/ai`, stage `AI-01`–`AI-07`)
sudah menghasilkan figure SHAP dan analisis sensitivitas untuk Paper B, tapi
belum pernah dan tidak akan pernah ikut ter-deploy bersama aplikasi utama.
Testing mitra nyata (H16–H17 dalam rencana kerja terpisah) belum berjalan —
data merchant di Supabase saat ini masih data uji internal ("Najwa" /
"Burgerlah"), bukan data UMKM pariwisata Aceh yang sesungguhnya.

## Struktur repo

```
smartpricingxai/
├── backend/          FastAPI + PostgreSQL (Supabase), API produksi
├── frontend/         React + Vite, website mobile-first
├── ai/               Pipeline riset XAI terpisah untuk Paper B — TIDAK pernah di-deploy
├── CLAUDE.md          Aturan & konteks proyek yang mengikat semua kerja di sini
└── syaratketentuan.md Teks Syarat & Ketentuan, dirender langsung di Akun
```

## Menjalankan secara lokal

### Backend (FastAPI)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate      # Windows; source .venv/bin/activate di macOS/Linux
pip install -r requirements.txt
cp .env.example .env        # isi API key, kredensial Supabase, dan SECRET_KEY
uvicorn app.main:app --reload
```

Tanpa `DB_USER`/`DB_PASSWORD`/`DB_HOST` (atau `DATABASE_URL`) terisi di
`.env`, `app/database.py` otomatis jatuh ke SQLite lokal (`smartpricing.db`)
— cukup untuk development tapi bukan data Supabase yang sesungguhnya.

Migrasi database pakai Alembic (`backend/alembic/versions/`):

```bash
alembic upgrade head
```

Jalankan test (plain assert, tanpa framework, lihat `backend/tests/`):

```bash
python tests/test_weighting.py   # engine rekomendasi, murni tanpa I/O
python tests/test_auth.py        # hash password & JWT
```

Smoke test API eksternal (OpenWeather, Geoapify) sebelum mengandalkan
rekomendasi hidup:

```bash
python scripts/test_apis.py
```

### Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Build produksi: `npm run build` (output ke `frontend/dist/`). Frontend
membaca `VITE_API_BASE_URL` (default `http://localhost:8000`) untuk
menentukan alamat backend.

### `/ai` — pipeline riset (opsional, terpisah total)

Hanya diperlukan untuk mengerjakan Paper B, tidak untuk menjalankan aplikasi:

```bash
cd ai
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Detail lengkap (dataset, keterbatasan, cara reproduce tiap stage) ada di
[ai/README.md](./ai/README.md) — termasuk peringatan eksplisit bahwa model
di sini divalidasi terhadap data Bali eksternal, bukan data Aceh, dan tidak
mencakup kategori sewa motor / guide wisata.

## Arsitektur backend

```
backend/app/
├── main.py              FastAPI app, CORS, health check, daftar router
├── database.py          Koneksi DB (Supabase/SQLite), load .env
├── models.py             SQLAlchemy models: Merchant, Service, Recommendation
├── schemas.py            Pydantic request/response schemas
├── auth.py               Hash password (bcrypt), JWT (pyjwt), get_current_merchant
├── geocoding.py           Geocoding teks bebas via Geoapify (fallback, lihat catatan di bawah)
├── maps_link.py           Parsing link Google Maps yang ditempel merchant (cara utama set lat/lon)
├── recommendation.py      Guard-rail HPP + konstruksi baris Recommendation
├── engine/weighting.py    Algoritma rekomendasi rule-based (lihat di bawah)
└── routers/
    ├── auth.py            POST /auth/register, /auth/login, DELETE /auth/account
    ├── merchants.py        GET/PUT /merchants/me, GET /merchants/me/stats
    ├── services.py         GET/POST /services, PUT /services/{id}/hpp, DELETE /services/{id}
    └── recommendations.py  GET /recommendations/current, /pending, POST /recommendations/{id}/respond
```

### Algoritma inti: rule-based, bukan model ML

`app/engine/weighting.py` menghasilkan rekomendasi dari tiga sinyal
independen — cuaca (OpenWeather), kalender lokal (hari libur/akhir pekan),
dan kepadatan lokasi (Geoapify Places) — masing-masing menyumbang poin
diskon bertanda dan satu potongan kalimat rationale Bahasa Indonesia.
`compute_recommendation()` murni (tanpa I/O) sehingga bisa diuji dengan
sinyal palsu; `generate_recommendation()` yang benar-benar memanggil API
live. Alasan yang ditampilkan ke merchant **adalah** mekanisme
perhitungannya sendiri, bukan pendekatan/estimasi — lihat
`ai/outputs/tables/xai_comparison.md` untuk perbandingan formal terhadap
pipeline SHAP-ML di `/ai`, dan alasan mengapa proyek ini launch dengan
rule-based sebagai mekanisme utama.

Guard-rail HPP (`app/recommendation.py`): `suggested_price` tidak pernah
boleh di bawah `service.hpp`, ditegakkan dua kali — sekali di dalam engine,
sekali lagi tepat sebelum baris `Recommendation` disimpan — supaya algoritma
masa depan yang lupa memanggil `clamp_to_hpp()` pun tidak bisa menembusnya.

### Lokasi merchant: link Google Maps, bukan alamat bebas

Awalnya lokasi di-geocode dari teks alamat bebas (`app/geocoding.py`, pakai
Geoapify Geocoding API). Ini terbukti gagal pada alamat Indonesia yang detail
(alamat jalan asli di Kuta Alam, Banda Aceh, hanya resolve dengan confidence
0.17 dan ditolak — lihat riwayat commit `H21`). Cara utama sekarang: merchant
menempel link Google Maps (long link, short link `maps.app.goo.gl`, atau
link dengan parameter `q=`/`query=`/`center=`) di Edit Profil, diparse
server-side oleh `app/maps_link.py` — termasuk mengikuti redirect short link
dan memprioritaskan koordinat pin (`!3d`/`!4d`) di atas titik tengah viewport
peta (`@lat,lon`), karena keduanya bisa berbeda cukup jauh pada link nyata.
Link yang tidak bisa di-parse **tidak pernah** jatuh ke lokasi default — API
akan menolak dengan HTTP 422 dan pesan jelas ke merchant.

## Model data

```
merchant       id, name, business_name, location, email, password_hash,
               is_active, latitude, longitude, geocoded_label
service        id, merchant_id, name, listed_price, hpp, is_active
recommendation id, service_id, suggested_price, rationale_text,
               weather_snapshot_json, status, created_at, responded_at
```

`is_active` di `merchant` dan `service` adalah soft-delete — riwayat
approve/reject harus tetap tersimpan untuk metrik adopsi Paper A, jadi
tidak pernah dihapus permanen lewat aksi pengguna biasa.

## Environment variables (backend/.env)

| Variable | Keterangan |
|---|---|
| `OPENWEATHER_API_KEY` | Sinyal cuaca untuk engine rekomendasi |
| `GEOAPIFY_API_KEY` | Kepadatan lokasi (Places) + geocoding cadangan |
| `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME` | Kredensial Supabase (di-percent-encode otomatis) |
| `DATABASE_URL` | Alternatif, override langsung — ini yang di-inject Render/Railway saat deploy |
| `SECRET_KEY` | Signing key JWT login — generate dengan `python -c "import secrets; print(secrets.token_hex(32))"` |

Semua rahasia ada di `.env`, sudah masuk `.gitignore` sejak commit pertama —
jangan pernah commit key asli.

## Konvensi commit

Satu commit per task, dengan ID yang memetakan langsung ke logbook hibah:
`H01`–`H22` untuk tahap pembangunan aplikasi utama (lihat `git log` untuk
urutan lengkap), `AI-01`–`AI-07` untuk pipeline riset `/ai`, dan `PATCH-01`
dst. untuk perbaikan yang tidak termasuk rencana kerja bernomor asli.
