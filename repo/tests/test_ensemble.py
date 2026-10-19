"""
Tests for AR-12 + Persistence Validation-Trained Horizon Ensemble.
"""

import os
import pytest
import numpy as np
import pandas as pd

from src.ar_persistence_ensemble import (
    ARPersistenceEnsembleForecaster,
    compute_comprehensive_metrics,
    run_ensemble_pipeline,
)
from src.baselines import load_sequence_arrays


@pytest.fixture(scope="module")
def sequence_arrays():
    """Loads authoritative sequence arrays from data_model_v2."""
    data_dir = "data_model_v2" if os.path.exists(os.path.join("data_model_v2", "X_train.npy")) else "data_model"
    return load_sequence_arrays(data_dir=data_dir)


def test_ensemble_initialization_and_weights_constraint():
    """Verifies that weights are initialized and constrained strictly in [0.0, 1.0]."""
    model = ARPersistenceEnsembleForecaster()
    assert model.name == "AR_Persistence_Ensemble"
    assert "h1" in model.alphas and "h2" in model.alphas and "h3" in model.alphas

    # Test optimize_weights bounds
    y_true = np.array([[1.0, 2.0, 3.0], [1.5, 2.5, 3.5]], dtype=np.float32)
    pred_ar = np.array([[1.2, 1.8, 3.2], [1.4, 2.6, 3.4]], dtype=np.float32)
    pred_pers = np.array([[0.8, 2.2, 2.8], [1.6, 2.4, 3.6]], dtype=np.float32)

    learned = model.optimize_weights(pred_ar=pred_ar, pred_pers=pred_pers, y_val=y_true)
    for h in ["h1", "h2", "h3"]:
        assert 0.0 <= learned[h] <= 1.0


def test_ensemble_prediction_blending_formula():
    """Verifies exact linear blending: y_ens = alpha * y_ar + (1 - alpha) * y_pers."""
    model = ARPersistenceEnsembleForecaster()
    model.alphas = {"h1": 1.0, "h2": 0.5, "h3": 0.0}

    pred_ar = np.array([[2.0, 4.0, 6.0]], dtype=np.float32)
    pred_pers = np.array([[1.0, 2.0, 3.0]], dtype=np.float32)

    ens_pred = model.predict(X=np.empty((1, 0)), pred_ar=pred_ar, pred_pers=pred_pers)

    # h1: 1.0 * 2.0 + 0.0 * 1.0 = 2.0
    # h2: 0.5 * 4.0 + 0.5 * 2.0 = 3.0
    # h3: 0.0 * 6.0 + 1.0 * 3.0 = 3.0
    assert np.isclose(ens_pred[0, 0], 2.0)
    assert np.isclose(ens_pred[0, 1], 3.0)
    assert np.isclose(ens_pred[0, 2], 3.0)


def test_ensemble_validation_improvement_and_pipeline_execution():
    """Verifies that running the ensemble pipeline strictly improves validation MAE over AR-12."""
    results = run_ensemble_pipeline()

    learned = results["learned_weights"]
    for h in ["h1", "h2", "h3"]:
        assert 0.0 <= learned[h] <= 1.0

    val_perf = results["validation_performance"]
    val_mae_ens = val_perf["ensemble"]["overall"]["mae"]
    val_mae_ar = val_perf["wsi_autoregression"]["overall"]["mae"]
    val_mae_pers = val_perf["persistence"]["overall"]["mae"]

    # Must improve over both components on validation
    assert val_mae_ens < val_mae_ar, f"Ensemble ({val_mae_ens}) did not beat AR ({val_mae_ar}) on validation!"
    assert val_mae_ens < val_mae_pers, f"Ensemble ({val_mae_ens}) did not beat Persistence ({val_mae_pers}) on validation!"

    # Ensure artifacts exist
    assert os.path.exists("results/ensemble/ensemble_config.json") or os.path.exists("repo/results/ensemble/ensemble_config.json")
    assert os.path.exists("results/ensemble/ensemble_validation_predictions.csv") or os.path.exists("repo/results/ensemble/ensemble_validation_predictions.csv")
    assert os.path.exists("results/ensemble/ensemble_diagnostic_predictions.csv") or os.path.exists("repo/results/ensemble/ensemble_diagnostic_predictions.csv")


def test_comprehensive_metrics_contract():
    """Verifies computation of MAE, RMSE, R2, Bias, and Skill metrics."""
    y_true = np.array([[1.0, 2.0, 3.0], [2.0, 1.0, 0.0]], dtype=np.float32)
    y_pred = np.array([[1.1, 1.9, 3.0], [2.2, 0.8, -0.1]], dtype=np.float32)
    persistence_mae = np.array([0.5, 0.5, 0.5])

    metrics = compute_comprehensive_metrics(y_true, y_pred, persistence_mae)
    assert "horizons" in metrics and "overall" in metrics
    assert set(metrics["overall"].keys()).issuperset({"mae", "rmse", "bias", "r2", "n", "skill_mae_vs_persistence"})
