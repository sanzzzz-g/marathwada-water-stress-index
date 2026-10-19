"""
ECMWF SEAS5 seasonal forecast features (precipitation + 2m temperature).

Raw: data/seas5/seas5_<year>.grib (CDS 'seasonal-monthly-single-levels', system 51,
monthly_mean, lead months 1-3, 1-degree grid over Marathwada).

For each district (nearest grid cell to its headquarters), init month and lead,
the ensemble mean is converted to a z-score against the district x target-month x
lead climatology fitted on init dates <= 2017-12 (train period only).

Alignment: a sequence with origin t (WSI(t) observed at end of month t) uses the
forecast initialised on the 1st of month t+1, whose leads 1..3 cover t+1..t+3.
"""

from pathlib import Path

import numpy as np
import pandas as pd
import xarray as xr

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "seas5"
OUT = ROOT / "data" / "seas5_features.csv"
TRAIN_END = pd.Timestamp("2017-12-01")

DISTRICT_COORDS = {
    "Chhatrapati Sambhajinagar": (19.8762, 75.3433),
    "Jalna": (19.841, 75.8864),
    "Beed": (18.9891, 75.7601),
    "Latur": (18.4088, 76.5604),
    "Dharashiv": (18.186, 76.0419),
    "Nanded": (19.1383, 77.321),
    "Parbhani": (19.2608, 76.7748),
    "Hingoli": (19.7173, 77.1494),
}
VARS = {"tprate": "precip", "2t": "t2m"}


def build() -> pd.DataFrame:
    rows = []
    for f in sorted(RAW.glob("seas5_*.grib")):
        for short, name in VARS.items():
            ds = xr.open_dataset(f, engine="cfgrib", filter_by_keys={"shortName": short},
                                 backend_kwargs={"time_dims": ("forecastMonth", "time"), "indexpath": ""})
            da = ds[list(ds.data_vars)[0]].mean("number")
            for district, (lat, lon) in DISTRICT_COORDS.items():
                s = da.sel(latitude=lat, longitude=lon, method="nearest").to_dataframe(name="value").reset_index()
                s["district"], s["var"] = district, name
                rows.append(s[["district", "var", "time", "forecastMonth", "value"]])
    df = pd.concat(rows, ignore_index=True).rename(columns={"time": "init", "forecastMonth": "lead"})
    df["init"] = pd.to_datetime(df["init"]).dt.to_period("M").dt.to_timestamp()
    # lead 1 = the initialisation month itself
    df["target_month"] = (df["init"].dt.month + df["lead"] - 2) % 12 + 1

    clim = (df[df["init"] <= TRAIN_END]
            .groupby(["district", "var", "target_month", "lead"])["value"].agg(["mean", "std"]))
    df = df.join(clim, on=["district", "var", "target_month", "lead"])
    df["z"] = (df["value"] - df["mean"]) / df["std"]

    wide = df.pivot_table(index=["district", "init"], columns=["var", "lead"], values="z")
    wide.columns = [f"seas_{v}_l{l}" for v, l in wide.columns]
    wide = wide.reset_index()
    wide.to_csv(OUT, index=False)
    return wide


def features_for(meta: pd.DataFrame) -> np.ndarray:
    """(n, 6) SEAS5 z-scores for each sequence, using the forecast issued at origin + 1 month."""
    seas = pd.read_csv(OUT, parse_dates=["init"])
    key = pd.DataFrame({"district": meta["district"].to_numpy(),
                        "init": (pd.DatetimeIndex(meta["forecast_origin"]) + pd.offsets.MonthBegin(1)).to_numpy()})
    cols = [c for c in seas.columns if c.startswith("seas_")]
    merged = key.merge(seas, on=["district", "init"], how="left")
    return merged[cols].to_numpy()


if __name__ == "__main__":
    w = build()
    print(w.shape, w["init"].min(), w["init"].max())
    print(w.isna().sum().sum(), "missing values")
