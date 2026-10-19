"""
Tests for residual-target ML models with rolling refit (src/residual_ml_fix.py).
"""

import numpy as np
import pandas as pd
import pytest

from src.residual_ml_fix import DATA, fit_predict, horizon_metrics, load, rolling_predict

pytestmark = pytest.mark.skipif(not (DATA / "X_train.npy").exists(), reason="data_model_v2 missing")


@pytest.fixture(scope="module")
def loaded():
    meta, feats, y, wsi_t = load()
    return meta, feats, y, wsi_t, y - wsi_t[:, None]


def test_metadata_aligned_with_arrays(loaded):
    meta, _, y, wsi_t, _ = loaded
    panel = pd.read_csv(DATA.parent / "outputs" / "Marathwada_MODEL_DATASET_2003_2024.csv", parse_dates=["date"])
    wsi = panel.set_index(["district", "date"])["wsi"]
    sample = meta.sample(50, random_state=0)
    expected = np.array([wsi[(r.district, r.forecast_origin)] for r in sample.itertuples()])
    assert np.allclose(expected, wsi_t[sample.index], atol=1e-5)
    assert len(meta) == len(y)


def test_zero_shrinkage_equals_persistence(loaded):
    meta, feats, y, wsi_t, r = loaded
    te = (meta["split"] == "test").to_numpy()
    p = rolling_predict("Ridge_delta", 1000.0, 0.0, feats["Ridge_delta"], r, wsi_t, meta, te)
    assert np.allclose(p, wsi_t[te, None])


def test_rolling_refit_uses_only_observed_targets(loaded, monkeypatch):
    meta, feats, y, wsi_t, r = loaded
    import src.residual_ml_fix as mod

    seen = []
    real = mod.fit_predict

    def spy(name, alpha, F_tr, r_tr, F_te):
        seen.append(len(F_tr))
        return real(name, alpha, F_tr, r_tr, F_te)

    monkeypatch.setattr(mod, "fit_predict", spy)
    te = (meta["split"] == "test").to_numpy()
    origins = np.sort(meta.loc[te, "forecast_origin"].unique())
    mod.rolling_predict("Ridge_delta", 1000.0, 0.6, feats["Ridge_delta"], r, wsi_t, meta, te)
    expected = [int((meta["target_t3"] <= o).sum()) for o in origins]
    assert seen == expected
    assert all(b >= a for a, b in zip(seen, seen[1:]))


def test_fit_predict_shape(loaded):
    meta, feats, _, _, r = loaded
    tr = (meta["split"] == "train").to_numpy()
    out = fit_predict("Ridge_delta", 1.0, feats["Ridge_delta"][tr], r[tr], feats["Ridge_delta"][:5])
    assert out.shape == (5, 3) and np.isfinite(out).all()


def test_horizon_metrics_persistence_skill_zero():
    yt = np.array([[1.0, 2.0, 3.0], [0.0, -1.0, 2.0], [0.5, 0.5, 0.5]])
    p = np.full_like(yt, 0.2)
    m = horizon_metrics(p, yt, p)
    assert all(m[h]["skill"] == 0.0 for h in (1, 2, 3))
    assert m["overall"]["skill"] == 0.0
