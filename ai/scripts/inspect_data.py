"""Print shape, dtypes, and null counts for the downloaded dataset. Sanity
check before building anything on top of it. Run: python scripts/inspect_data.py
"""
from pathlib import Path

import pandas as pd

DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "Updated_ScrapingHotelTiketcom.csv"


def main():
    df = pd.read_csv(DATA_FILE, sep=";")

    print("=== SHAPE ===")
    print(df.shape)

    print("\n=== COLUMNS + DTYPES ===")
    print(df.dtypes)

    print("\n=== NULL COUNTS ===")
    null_counts = df.isnull().sum()
    null_pct = (null_counts / len(df) * 100).round(1)
    print(pd.DataFrame({"nulls": null_counts, "pct": null_pct}))

    print("\n=== DUPLICATE ROWS ===")
    print(df.duplicated().sum())


if __name__ == "__main__":
    main()
