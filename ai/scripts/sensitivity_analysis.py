"""Sensitivity analysis of the PRODUCTION rule-based recommendation engine.

Not a trained model, not synthetic training data. This exercises the real
`compute_recommendation` from backend/app/engine/weighting.py -- the exact
code the live app calls -- against a systematic grid of hypothetical inputs,
to visualize how the algorithm actually behaves across the input space it
was designed for. No refactor of weighting.py was needed: `compute_recommendation`
is already a pure function of (listed_price, hpp, weather, density, calendar)
with no I/O (see its own docstring) -- only `generate_recommendation` wraps it
with the live OpenWeather/Geoapify calls, and this script deliberately never
touches that wrapper.

listed_price/hpp are fixed at values far enough apart (Rp100,000 / Rp1) that
the HPP guard-rail never clamps across the grid -- discount_pct is undiluted
algorithm output, not price-dependent (compute_recommendation computes it
independently of listed_price/hpp; they only affect the post-hoc price clamp).

Run: python scripts/sensitivity_analysis.py
"""
import sys
from decimal import Decimal
from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from app.engine.weighting import (  # noqa: E402
    DENSITY_HIGH_THRESHOLD,
    DENSITY_LOW_THRESHOLD,
    CalendarSignal,
    DensitySignal,
    WeatherSignal,
    compute_recommendation,
)

FIGURES_DIR = Path(__file__).resolve().parent.parent / "outputs" / "figures"
TABLES_DIR = Path(__file__).resolve().parent.parent / "outputs" / "tables"
DPI = 300

LISTED_PRICE = Decimal(100000)
HPP = Decimal(1)  # far below listed_price -- guard-rail never fires, see module docstring

# Real OpenWeather "main" categories the engine's _WEATHER_RULES actually keys
# on (see weighting.py) -- task asked for clear/cloudy/rain specifically, a
# representative subset of the six the engine handles.
WEATHER_SCENARIOS = [
    ("Clear", WeatherSignal("Clear", "cerah", 30.0)),
    ("Clouds", WeatherSignal("Clouds", "berawan", 28.0)),
    ("Rain", WeatherSignal("Rain", "hujan sedang", 26.0)),
]

CALENDAR_SCENARIOS = [
    ("Hari Biasa", CalendarSignal(is_holiday=False, holiday_name=None, is_weekend=False)),
    ("Akhir Pekan", CalendarSignal(is_holiday=False, holiday_name=None, is_weekend=True)),
    ("Hari Libur Nasional", CalendarSignal(is_holiday=True, holiday_name="(contoh) Hari Libur Nasional", is_weekend=False)),
]

DENSITY_COUNTS = list(range(0, 21))  # spans both DENSITY_LOW_THRESHOLD(5) and DENSITY_HIGH_THRESHOLD(15)

# Fixed categorical order (never cycled) -- validated colorblind-safe slots,
# from the project's data-viz palette (slots 1/2/3: blue/aqua/yellow).
WEATHER_COLOR = {"Clear": "#2a78d6", "Clouds": "#1baf7a", "Rain": "#eda100"}
WEATHER_STYLE = {"Clear": "-", "Clouds": "--", "Rain": ":"}
WEATHER_MARKER = {"Clear": "o", "Clouds": "s", "Rain": "^"}


def run_grid() -> pd.DataFrame:
    rows = []
    for weather_label, weather in WEATHER_SCENARIOS:
        for calendar_label, calendar in CALENDAR_SCENARIOS:
            for density_count in DENSITY_COUNTS:
                density = DensitySignal(nearby_count=density_count)
                result = compute_recommendation(LISTED_PRICE, HPP, weather, density, calendar)
                # Same tie-break the real engine uses (max() on first-encountered
                # max in [weather, calendar, density] order) -- not re-derived,
                # replicated exactly so "dominant" here means what it means live.
                dominant = max(result.contributions, key=lambda c: abs(c.points))
                rows.append(
                    {
                        "weather_condition": weather_label,
                        "calendar_type": calendar_label,
                        "density_count": density_count,
                        "discount_pct": float(result.discount_pct),
                        "suggestion_type": result.suggestion_type,
                        "dominant_input": dominant.input_name,
                        "rationale_text": result.rationale_text,
                    }
                )
    return pd.DataFrame(rows)


def plot_grid(df: pd.DataFrame):
    fig, axes = plt.subplots(1, 3, figsize=(15, 6.5), sharey=True)

    for ax, (calendar_label, _) in zip(axes, CALENDAR_SCENARIOS):
        subset = df[df["calendar_type"] == calendar_label]
        for weather_label, _ in WEATHER_SCENARIOS:
            line = subset[subset["weather_condition"] == weather_label].sort_values("density_count")
            ax.plot(
                line["density_count"],
                line["discount_pct"],
                label=weather_label,
                color=WEATHER_COLOR[weather_label],
                linestyle=WEATHER_STYLE[weather_label],
                marker=WEATHER_MARKER[weather_label],
                markevery=3,
                markersize=6,
                linewidth=2,
            )
        # Recessive reference lines at the engine's own discrete thresholds --
        # this is where the step-function jumps in the curves come from.
        for threshold in (DENSITY_LOW_THRESHOLD, DENSITY_HIGH_THRESHOLD):
            ax.axvline(threshold, color="#c3c2b7", linestyle=":", linewidth=1, zorder=0)
        ax.set_title(calendar_label, fontsize=12)
        ax.set_xlabel("Kepadatan lokasi (jumlah tempat wisata di sekitar)")
        ax.set_ylim(-1, 26)
        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)

    axes[0].set_ylabel("Discount / adjustment (%)")

    # Fixed real space (not negative/below-canvas coordinates) for suptitle,
    # legend, and caption -- avoids the legend box colliding with the middle
    # panel's x-axis label that a negative bbox_to_anchor produced.
    fig.subplots_adjust(top=0.82, bottom=0.30, wspace=0.08)

    handles, labels = axes[0].get_legend_handles_labels()
    fig.legend(handles, labels, title="Weather condition", loc="lower center", ncol=3, bbox_to_anchor=(0.5, 0.13))

    fig.suptitle(
        "Rule-Based Engine Sensitivity: Discount % vs. Location Density,\n"
        "Faceted by Calendar Type, Colored by Weather Condition",
        fontsize=13,
        y=0.98,
    )
    fig.text(
        0.5, 0.015,
        "Synthetic input scenarios exercised against the production rule-based engine\n"
        "(real code, real logic, hypothetical inputs) -- not synthetic training data, not a trained model.\n"
        "Dotted vertical lines mark the engine's own density thresholds (5, 15) where behavior steps.",
        ha="center", fontsize=9.5, color="#52514e",
    )

    fig.savefig(FIGURES_DIR / "sensitivity_analysis.png", dpi=DPI, bbox_inches="tight")
    plt.close(fig)
    print("[saved] sensitivity_analysis.png")


def main():
    FIGURES_DIR.mkdir(parents=True, exist_ok=True)
    TABLES_DIR.mkdir(parents=True, exist_ok=True)

    df = run_grid()
    print(f"[grid] {len(df)} scenarios "
          f"({len(WEATHER_SCENARIOS)} weather x {len(CALENDAR_SCENARIOS)} calendar x {len(DENSITY_COUNTS)} density)")

    csv_path = TABLES_DIR / "sensitivity_grid.csv"
    df.to_csv(csv_path, index=False)
    print(f"[saved] {csv_path}")

    plot_grid(df)


if __name__ == "__main__":
    main()
