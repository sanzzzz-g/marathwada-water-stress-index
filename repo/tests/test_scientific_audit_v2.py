import os
import json
import pandas as pd
import pytest

def test_audit_v2_artifacts():
    audit_dir = os.path.join(os.path.dirname(__file__), "..", "results", "rolling_backtest_audit_v2")
    assert os.path.exists(audit_dir), f"Audit directory {audit_dir} missing"
    
    # 1. Directional accuracy audit
    dir_csv = os.path.join(audit_dir, "directional_accuracy_audit.csv")
    assert os.path.exists(dir_csv)
    dir_df = pd.read_csv(dir_csv)
    p_row = dir_df[dir_df["model"] == "Persistence"].iloc[0]
    assert p_row["strict_sign_match_pct"] == 0.0
    assert p_row["informative_nonzero_dir_acc_pct"] == 0.0
    
    # 2. Severe stress counts
    json_path = os.path.join(audit_dir, "scientific_audit_results.json")
    assert os.path.exists(json_path)
    with open(json_path) as f:
        data = json.load(f)
    assert data["severe_stress_counts"]["total_horizon_evaluations_severe"] == 78
    assert data["severe_stress_counts"]["unique_district_months_severe"] == 26
    assert data["severe_stress_counts"]["distinct_drought_episodes_count"] == 11
    
    # 3. Hybrid decision rules
    hyb_csv = os.path.join(audit_dir, "hybrid_decision_rules_evaluation.csv")
    assert os.path.exists(hyb_csv)
    hyb_df = pd.read_csv(hyb_csv)
    assert len(hyb_df) == 4
    
    # 4. Normalization leakage audit
    norm_csv = os.path.join(audit_dir, "normalization_leakage_audit.csv")
    assert os.path.exists(norm_csv)
    norm_df = pd.read_csv(norm_csv)
    assert len(norm_df) == 3
