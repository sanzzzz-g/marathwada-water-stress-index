"""
Fix for ML level bias: train Ridge / WSI-AR / XGBoost on residual targets
r_{t,h} = WSI(t+h) - WSI(t) instead of WSI levels, and evaluate two regimes:

  static   : fit on train, tune alpha + shrinkage weight w on validation,
             refit on train+val, predict test.
  rolling  : at every test origin, refit on all sequences whose last target
             date <= origin (no future targets), using the validation-tuned
             hyperparameters.

Prediction = WSI(t) + w * r_hat, so w=0 recovers persistence exactly.
"""

from pathlib import Path

import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler

try:
    from src.seas5_features import OUT as SEAS5_CSV, features_for
except ImportError:
    from seas5_features import OUT as SEAS5_CSV, features_for

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data_model_v2"
OUT = ROOT / "results" / "residual_ml_fix"
ALPHAS = [0.1, 1.0, 10.0, 100.0, 1000.0]
WEIGHTS = np.linspace(0, 1, 11)
XGB_PARAMS = dict(n_estimators=200, max_depth=3, learning_rate=0.05, subsample=0.8, random_state=42, n_jobs=-1)


def load():
    meta = pd.read_csv(DATA / "sequence_metadata.csv", parse_dates=["forecast_origin", "target_t3"])
    parts = {s: (np.load(DATA / f"X_{s}.npy"), np.load(DATA / f"y_{s}.npy")) for s in ("train", "val", "test")}
    # Arrays are stored per split in metadata order; metadata itself is sorted by district.
    X = np.concatenate([parts[s][0] for s in ("train", "val", "test")])
    y = np.concatenate([parts[s][1] for s in ("train", "val", "test")])
    meta = pd.concat([meta[meta["split"] == s] for s in ("train", "val", "test")], ignore_index=True)
    meta["split"] = meta["split"].replace({"val": "validation"})
    wsi_hist = X.mean(axis=2)  # WSI is the equal-weight mean of the 6 components
    wsi_t = wsi_hist[:, -1]
    month = meta["forecast_origin"].dt.month.to_numpy()
    season = np.c_[np.sin(2 * np.pi * month / 12), np.cos(2 * np.pi * month / 12)]
    feats = {
        "WSI_AR_delta": np.c_[wsi_hist, season],
        "Ridge_delta": np.c_[X.reshape(len(X), -1), season],
        "XGBoost_delta": np.c_[X.reshape(len(X), -1), season],
    }
    if SEAS5_CSV.exists():
        seas = features_for(meta)
        # SEAS5 interacts with season: monsoon rain anomalies matter far more than dry-season ones.
        seas_x = np.c_[seas, seas * season[:, :1], seas * season[:, 1:]]
        feats["WSI_AR_delta_seas5"] = np.c_[feats["WSI_AR_delta"], seas_x]
        feats["Ridge_delta_seas5"] = np.c_[feats["Ridge_delta"], seas_x]
        feats["XGBoost_delta_seas5"] = np.c_[feats["XGBoost_delta"], seas]
    return meta, feats, y, wsi_t


def make_model(name, alpha):
    return xgb.XGBRegressor(**XGB_PARAMS) if name.startswith("XGBoost") else Ridge(alpha=alpha)


def fit_predict(name, alpha, F_tr, r_tr, F_te):
    """One model per horizon; returns residual predictions (n, 3)."""
    sc = StandardScaler().fit(F_tr)
    A, B = sc.transform(F_tr), sc.transform(F_te)
    return np.column_stack([make_model(name, alpha).fit(A, r_tr[:, h]).predict(B) for h in range(3)])


def tune(name, F, r, wsi_t, y, tr, va):
    best = (np.inf, None, None)
    for a in ([None] if name.startswith("XGBoost") else ALPHAS):
        r_hat = fit_predict(name, a, F[tr], r[tr], F[va])
        for w in WEIGHTS:
            mae = np.abs(wsi_t[va, None] + w * r_hat - y[va]).mean()
            if mae < best[0]:
                best = (mae, a, w)
    return best[1], best[2]


def rolling_predict(name, alpha, w, F, r, wsi_t, meta, mask):
    """Refit at each origin in `mask` on sequences whose last target <= origin."""
    idx = np.where(mask)[0]
    origins = meta["forecast_origin"].to_numpy()
    out = np.zeros((len(idx), 3))
    for origin in np.unique(origins[idx]):
        known = (meta["target_t3"] <= origin).to_numpy()
        at = idx[origins[idx] == origin]
        out[np.searchsorted(idx, at)] = wsi_t[at, None] + w * fit_predict(name, alpha, F[known], r[known], F[at])
    return out


def horizon_metrics(p, yt, p_pers):
    out = {}
    for h in range(3):
        e = p[:, h] - yt[:, h]
        mae, mae_p = np.abs(e).mean(), np.abs(p_pers[:, h] - yt[:, h]).mean()
        out[h + 1] = {
            "mae": round(float(mae), 4),
            "rmse": round(float(np.sqrt((e ** 2).mean())), 4),
            "bias": round(float(e.mean()), 4),
            "r2": round(float(1 - (e ** 2).sum() / ((yt[:, h] - yt[:, h].mean()) ** 2).sum()), 4),
            "n": int(len(e)),
            "skill": round(float(1 - mae / mae_p), 4),
        }
    e_all, ep_all = p - yt, p_pers - yt
    out["overall"] = {
        "mae": round(float(np.abs(e_all).mean()), 4),
        "rmse": round(float(np.sqrt((e_all ** 2).mean())), 4),
        "r2": round(float(1 - (e_all ** 2).sum() / ((yt - yt.mean()) ** 2).sum()), 4),
        "skill": round(float(1 - np.abs(e_all).mean() / np.abs(ep_all).mean()), 4),
    }
    return out


def main():
    meta, feats, y, wsi_t = load()
    r = y - wsi_t[:, None]
    tr, va, te = (meta["split"] == s for s in ("train", "validation", "test"))
    tr, va, te = tr.to_numpy(), va.to_numpy(), te.to_numpy()
    pers = np.repeat(wsi_t[:, None], 3, axis=1)
    preds = {"Persistence": pers[te]}
    config, detail = {}, {}

    for name, F in feats.items():
        alpha, w = tune(name, F, r, wsi_t, y, tr, va)
        config[name] = {"alpha": alpha, "shrink_w": float(w)}
        trva = tr | va
        preds[f"{name}_static"] = wsi_t[te, None] + w * fit_predict(name, alpha, F[trva], r[trva], F[te])
        preds[f"{name}_rolling"] = rolling_predict(name, alpha, w, F, r, wsi_t, meta, te)
        val_roll = rolling_predict(name, alpha, w, F, r, wsi_t, meta, va)
        detail[f"{name}_rolling"] = {
            "test": horizon_metrics(preds[f"{name}_rolling"], y[te], pers[te]),
            "validation": horizon_metrics(val_roll, y[va], pers[va]),
        }

    yt = y[te]
    rows = []
    for m, p in preds.items():
        mae = np.abs(p - yt).mean(axis=0)
        rows.append({"model": m, "mae_h1": mae[0], "mae_h2": mae[1], "mae_h3": mae[2],
                     "overall_mae": mae.mean(), "bias": (p - yt).mean()})
    res = pd.DataFrame(rows)
    p_mae = res.loc[res.model == "Persistence", ["mae_h1", "mae_h2", "mae_h3", "overall_mae"]].to_numpy()
    for i, c in enumerate(["h1", "h2", "h3", "overall"]):
        res[f"skill_{c}"] = 1 - res[["mae_h1", "mae_h2", "mae_h3", "overall_mae"]].iloc[:, i] / p_mae[0, i]

    OUT.mkdir(parents=True, exist_ok=True)
    res.round(4).to_csv(OUT / "test_metrics.csv", index=False)
    pd.Series(config).to_json(OUT / "config.json", indent=2)
    pd.Series(detail).to_json(OUT / "rolling_detail_metrics.json", indent=2)
    print(pd.Series(config).to_string())
    print(res.round(3).to_string(index=False))
    return res


if __name__ == "__main__":
    main()
