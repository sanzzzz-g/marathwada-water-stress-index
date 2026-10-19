import os
import pandas as pd
import pytest

def test_rigorous_backtest_artifacts():
    results_dir = os.path.join(os.path.dirname(__file__), "..", "results", "rolling_backtest_rigorous")
    assert os.path.exists(results_dir), f"Directory {results_dir} does not exist"

    pred_path = os.path.join(results_dir, "predictions.csv")
    assert os.path.exists(pred_path), "predictions.csv missing"
    pred_df = pd.read_csv(pred_path)

    # 6 models * 960 origins (36 + 36 + 48 months * 8 districts) * 3 horizons = 17,280 rows
    assert len(pred_df) == 17280, f"Expected 17280 predictions, got {len(pred_df)}"
    assert not pred_df["predicted_wsi"].isna().any(), "Found NaN in predicted_wsi"
    assert not pred_df["actual_wsi"].isna().any(), "Found NaN in actual_wsi"

    cont_path = os.path.join(results_dir, "continuous_metrics.csv")
    assert os.path.exists(cont_path), "continuous_metrics.csv missing"
    cont_df = pd.read_csv(cont_path)
    assert len(cont_df) > 0

    warn_path = os.path.join(results_dir, "early_warning_metrics.csv")
    assert os.path.exists(warn_path), "early_warning_metrics.csv missing"
    warn_df = pd.read_csv(warn_path)
    assert len(warn_df) > 0

    dist_path = os.path.join(results_dir, "district_metrics.csv")
    assert os.path.exists(dist_path), "district_metrics.csv missing"
    dist_df = pd.read_csv(dist_path)
    assert len(dist_df) == 48 # 8 districts * 6 models
