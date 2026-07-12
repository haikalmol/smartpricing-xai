"""Download the Bali hotel dataset from Kaggle into /ai/data.

Requires Kaggle API credentials at ~/.kaggle/kaggle.json (or the
KAGGLE_USERNAME/KAGGLE_KEY env vars). Run: python scripts/download_data.py

gusnara/data-hotel-airbnb-in-bali was tried first and rejected: 4,881 rows
but only 7 columns (link, judul, alamat, Kabupaten, kategori, tahun,
tuan_rumah) -- no price column at all, no reviews/ratings/availability, no
real property-type field, and the sample rows include addresses outside
Bali (Sumatera Barat, East Java) despite the dataset's name. Unusable as a
pricing-model training set.
"""
from pathlib import Path

from kaggle.api.kaggle_api_extended import KaggleApi

DATASET = "anisyanugraheni/hotel-listings-in-bali-scraped-data"
DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def main():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    api = KaggleApi()
    api.authenticate()
    print(f"Downloading {DATASET} into {DATA_DIR} ...")
    api.dataset_download_files(DATASET, path=str(DATA_DIR), unzip=True)
    print("Done.")


if __name__ == "__main__":
    main()
