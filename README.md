# SmartPricing XAI

Website mobile-first untuk UMKM pariwisata Aceh (homestay, sewa motor, guide
wisata) yang memberikan rekomendasi harga smart promo & bundling berbasis
Explainable AI, lengkap dengan alasan yang bisa dibaca manusia dan langkah
approve/reject sebelum harga berubah. Dibangun untuk hibah PKM-BMD/BP,
Universitas Muhammadiyah Aceh. Lihat [CLAUDE.md](./CLAUDE.md) untuk konteks
proyek lengkap (non-negotiables, tech stack, algoritma, dan data model).

## Menjalankan secara lokal

### Backend (FastAPI)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate      # Windows
pip install -r requirements.txt
cp .env.example .env        # isi API key & DATABASE_URL
uvicorn app.main:app --reload
```

### Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```
