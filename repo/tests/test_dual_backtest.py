import os
import json
import pandas as pd
import pytest

def test_dual_backtest_artifacts():
    repo_dir = os.path.join(os.path.dirname(__file__), "..")
    dir_a = os.path.join(repo_dir, "results", "backtest_analysis_a_fixed_index")
    dir_b = os.path.join(repo_dir, "results", "backtest_analysis_b_causal_reference")
    dir_rec = os.path.join(repo_dir, "results", "backtest_dual_reconciliation")
    
    for d in [dir_a, dir_b, dir_rec]:
        assert os.path.exists(d), f"Directory {d} missing"
        
    # Check predictions for Analysis A and B
    for d_path, name in [(dir_a, "Analysis A"), (dir_b, "Analysis B")]:
        pred_csv = os.path.join(d_path, "predictions.csv")
        assert os.path.exists(pred_csv), f"predictions.csv missing in {name}"
        df = pd.read_csv(pred_csv)
        
        # 6 models * 936 origins * 3 horizons = 16,848 predictions
        assert len(df) == 16848, f"Expected 16848 predictions in {name}, got {len(df)}"
        assert df["target_date"].max() <= "2020-12-01", f"Target dates in {name} exceed 2020-12-01: {df['target_date'].max()}"
        assert not df["predicted_wsi"].isna().any()
        assert not df["actual_wsi"].isna().any()
        
    # Check reconciliation summary
    summary_path = os.path.join(dir_rec, "reconciliation_summary.json")
    assert os.path.exists(summary_path)
    with open(summary_path) as f:
        data = json.load(f)
    assert "Analysis_A_Fixed_Index" in data["analysis_comparison"]
    assert "Analysis_B_Causal_Reference" in data["analysis_comparison"]
