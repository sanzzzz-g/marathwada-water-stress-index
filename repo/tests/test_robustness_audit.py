import os
import json
import pandas as pd
import pytest

def test_robustness_audit_artifacts():
    repo_dir = os.path.join(os.path.dirname(__file__), "..")
    audit_dir = os.path.join(repo_dir, "results", "robustness_audit")
    assert os.path.exists(audit_dir), f"Directory {audit_dir} missing"

    # 1. Master JSON
    master_path = os.path.join(audit_dir, "robustness_audit_master_report.json")
    assert os.path.exists(master_path)
    with open(master_path) as f:
        data = json.load(f)
    assert "calibration_stability" in data
    assert "reproduced_comparisons" in data
    assert "multiple_comparisons" in data
    assert "drought_onset_validation" in data
    assert "deployment_readiness" in data

    # 2. Multiple comparisons table
    mult_csv = os.path.join(audit_dir, "multiple_comparisons_adjustment.csv")
    assert os.path.exists(mult_csv)
    mult_df = pd.read_csv(mult_csv)
    assert len(mult_df) == 3

    # 3. Drought onset validation
    onset_json = os.path.join(audit_dir, "drought_onset_validation.json")
    assert os.path.exists(onset_json)
    with open(onset_json) as f:
        on_data = json.load(f)
    assert on_data["Analysis_A"]["performance_by_horizon"]["H+1"]["model_performance"]["Persistence"]["hits"] == 0
    assert on_data["Analysis_A"]["performance_by_horizon"]["H+1"]["model_performance"]["WSI_Autoregression"]["hits"] == 0

    # 4. Reproduced comparisons
    rep_json = os.path.join(audit_dir, "reproduced_ar12_vs_persistence.json")
    assert os.path.exists(rep_json)
    with open(rep_json) as f:
        rep_data = json.load(f)
    assert rep_data["Analysis_A"]["total_evaluations"] == 2808
    assert rep_data["Analysis_B"]["total_evaluations"] == 2808
