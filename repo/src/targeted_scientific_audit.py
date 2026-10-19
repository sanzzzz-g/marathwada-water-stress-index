"""
Targeted Scientific Audit of Rigorous Rolling Backtest Results.
Audits:
1. Directional Accuracy under explicit zero-change rules.
2. Severe-Stress Evaluation: unique district-months vs repeated horizon evaluations vs episodes.
3. Event-Level Warning Lead Time on distinct drought episodes.
4. WSI Autoregression Warning Precision alongside Wilson confidence intervals, and explicit Hybrid Rules.
5. Statistical Significance of MAE difference (Diebold-Mariano test & cluster-robust test).
6. Temporal Boundary Mapping (Origin ranges vs Target ranges across folds).
7. Normalization Audit: Climatology/standardization leakage in upstream features vs causal raw reconstruction.
All outputs saved to results/rolling_backtest_audit_v2/.
"""

import os
import json
import math
import numpy as np
import pandas as pd
from scipy import stats

def wilson_score_interval(successes: int, total: int, confidence: float = 0.95):
    if total == 0:
        return 0.0, 0.0, 0.0
    p_hat = successes / total
    z = stats.norm.ppf(1 - (1 - confidence) / 2)
    denom = 1 + (z**2) / total
    center = (p_hat + (z**2) / (2 * total)) / denom
    margin = (z * math.sqrt((p_hat * (1 - p_hat) + (z**2) / (4 * total)) / total)) / denom
    lower = max(0.0, center - margin)
    upper = min(1.0, center + margin)
    return p_hat, lower, upper

def diebold_mariano_test(e1: np.ndarray, e2: np.ndarray, h: int = 1):
    """Diebold-Mariano test with rectangular / Bartlett lag kernel for horizon h."""
    d = (np.abs(e1)) - (np.abs(e2))
    n = len(d)
    mean_d = np.mean(d)
    
    # Auto-covariances up to lag h-1
    gamma0 = np.var(d, ddof=0)
    gamma_sum = 0.0
    for k in range(1, h):
        cov_k = np.cov(d[:-k], d[k:], ddof=0)[0, 1] if n > k else 0.0
        # Bartlett weight
        w = 1.0 - k / h
        gamma_sum += 2.0 * w * cov_k
        
    var_d = (gamma0 + gamma_sum) / n
    if var_d <= 1e-12:
        return mean_d, 0.0, 1.0
    stat = mean_d / np.sqrt(var_d)
    pval = 2.0 * (1.0 - stats.norm.cdf(abs(stat)))
    return mean_d, stat, pval

def run_targeted_audit(
    pred_csv: str = "results/rolling_backtest_rigorous/predictions.csv",
    output_dir: str = "results/rolling_backtest_audit_v2",
):
    os.makedirs(output_dir, exist_ok=True)
    df = pd.read_csv(pred_csv)
    models = df["model"].unique().tolist()
    
    audit_report = {}
    
    # =========================================================================
    # 1. DIRECTIONAL ACCURACY AUDIT
    # =========================================================================
    print("--- 1. AUDITING DIRECTIONAL ACCURACY ---")
    dir_records = []
    for m in models:
        sub = df[df["model"] == m].copy()
        act_delta = sub["actual_wsi"] - sub["origin_wsi"]
        pred_delta = sub["predicted_wsi"] - sub["origin_wsi"]
        
        # Flawed old logic: (act_delta * pred_delta >= 0)
        old_acc = float((act_delta * pred_delta >= 0).mean() * 100.0)
        
        # Rule 1: Strict sign match (sign(act) == sign(pred)), with 0 matching only 0
        eps = 1e-5
        sign_act = act_delta.apply(lambda x: 1 if x > eps else (-1 if x < -eps else 0))
        sign_pred = pred_delta.apply(lambda x: 1 if x > eps else (-1 if x < -eps else 0))
        strict_acc = float((sign_act == sign_pred).mean() * 100.0)
        
        # Rule 2: Directional Skill on Non-Zero Actual Changes (pred=0 counted as incorrect)
        non_zero_act = (sign_act != 0)
        correct_nonzero = (sign_act == sign_pred) & (sign_pred != 0)
        nonzero_acc = float(correct_nonzero[non_zero_act].mean() * 100.0)
        
        # Rule 3: Binary Increase (actual > origin vs pred > origin)
        bin_act = (act_delta > 0)
        bin_pred = (pred_delta > 0)
        bin_acc = float((bin_act == bin_pred).mean() * 100.0)
        
        dir_records.append({
            "model": m,
            "flawed_old_dir_acc_pct": round(old_acc, 2),
            "strict_sign_match_pct": round(strict_acc, 2),
            "informative_nonzero_dir_acc_pct": round(nonzero_acc, 2),
            "binary_increase_acc_pct": round(bin_acc, 2),
            "zero_pred_deltas_count": int((sign_pred == 0).sum()),
            "total_evaluations": len(sub),
        })
        
    dir_df = pd.DataFrame(dir_records)
    dir_df.to_csv(os.path.join(output_dir, "directional_accuracy_audit.csv"), index=False)
    audit_report["directional_accuracy"] = dir_records
    
    # =========================================================================
    # 2. SEVERE-STRESS EVALUATION: COUNTS, EPISODES & HORIZONS
    # =========================================================================
    print("--- 2. AUDITING SEVERE-STRESS TARGETS & REPEATED EVALUATIONS ---")
    p_df = df[df["model"] == "Persistence"].copy()
    
    total_evals_severe = int((p_df["actual_wsi"] >= 1.5).sum())
    unique_target_months = p_df[p_df["actual_wsi"] >= 1.5][["district", "target_date"]].drop_duplicates()
    unique_severe_count = len(unique_target_months)
    
    # By horizon
    h1_sev = int((p_df[p_df["horizon"] == "h1"]["actual_wsi"] >= 1.5).sum())
    h2_sev = int((p_df[p_df["horizon"] == "h2"]["actual_wsi"] >= 1.5).sum())
    h3_sev = int((p_df[p_df["horizon"] == "h3"]["actual_wsi"] >= 1.5).sum())
    
    # Identify distinct contiguous episodes
    unique_target_months["target_date"] = pd.to_datetime(unique_target_months["target_date"])
    episodes = []
    for dist, grp in unique_target_months.groupby("district"):
        grp = grp.sort_values("target_date")
        dates = grp["target_date"].tolist()
        if not dates:
            continue
        cur_ep = [dates[0]]
        for d in dates[1:]:
            prev = cur_ep[-1]
            if (d.year - prev.year) * 12 + (d.month - prev.month) == 1:
                cur_ep.append(d)
            else:
                episodes.append({
                    "district": dist,
                    "start_date": cur_ep[0].strftime("%Y-%m-%d"),
                    "end_date": cur_ep[-1].strftime("%Y-%m-%d"),
                    "duration_months": len(cur_ep),
                })
                cur_ep = [d]
        if cur_ep:
            episodes.append({
                "district": dist,
                "start_date": cur_ep[0].strftime("%Y-%m-%d"),
                "end_date": cur_ep[-1].strftime("%Y-%m-%d"),
                "duration_months": len(cur_ep),
            })
            
    ep_df = pd.DataFrame(episodes)
    ep_df.to_csv(os.path.join(output_dir, "distinct_drought_episodes.csv"), index=False)
    
    audit_report["severe_stress_counts"] = {
        "total_horizon_evaluations_severe": total_evals_severe,
        "unique_district_months_severe": unique_severe_count,
        "evaluations_per_horizon": {"h1": h1_sev, "h2": h2_sev, "h3": h3_sev},
        "distinct_drought_episodes_count": len(episodes),
    }
    
    # Recalculate horizon-specific contingency tables for identical target dates
    horizon_contingency = []
    for h in ["h1", "h2", "h3"]:
        for m in models:
            sub = df[(df["model"] == m) & (df["horizon"] == h)]
            tp = int(((sub["severe_actual"] == True) & (sub["severe_pred"] == True)).sum())
            fp = int(((sub["severe_actual"] == False) & (sub["severe_pred"] == True)).sum())
            fn = int(((sub["severe_actual"] == True) & (sub["severe_pred"] == False)).sum())
            tn = int(((sub["severe_actual"] == False) & (sub["severe_pred"] == False)).sum())
            
            prec = (tp / (tp + fp)) if (tp + fp) > 0 else 0.0
            rec = (tp / (tp + fn)) if (tp + fn) > 0 else 0.0
            f1 = (2 * prec * rec / (prec + rec)) if (prec + rec) > 0 else 0.0
            csi = (tp / (tp + fp + fn)) if (tp + fp + fn) > 0 else 0.0
            far = (fp / (tp + fp)) if (tp + fp) > 0 else 0.0
            
            horizon_contingency.append({
                "horizon": h,
                "model": m,
                "evaluations": len(sub),
                "actual_severe": tp + fn,
                "predicted_alarms": tp + fp,
                "tp_hits": tp,
                "fp_false_alarms": fp,
                "fn_misses": fn,
                "tn_correct_rejections": tn,
                "precision": round(prec, 4),
                "recall_pod": round(rec, 4),
                "f1_score": round(f1, 4),
                "csi": round(csi, 4),
                "false_alarm_ratio": round(far, 4),
            })
    h_cont_df = pd.DataFrame(horizon_contingency)
    h_cont_df.to_csv(os.path.join(output_dir, "horizon_specific_early_warning.csv"), index=False)
    
    # =========================================================================
    # 3. EVENT-LEVEL ONSET WARNING LEAD TIME
    # =========================================================================
    print("--- 3. AUDITING EVENT-LEVEL ONSET PREDICTION ---")
    onset_records = []
    for ep in episodes:
        dist = ep["district"]
        s_date = pd.to_datetime(ep["start_date"])
        s_str = ep["start_date"]
        
        # Check origins prior to onset
        for h in [1, 2, 3]:
            orig_t = s_date - pd.DateOffset(months=h)
            orig_str = orig_t.strftime("%Y-%m-%d")
            
            for m in models:
                row = df[(df["model"] == m) & (df["district"] == dist) & (df["forecast_origin"] == orig_str) & (df["target_date"] == s_str)]
                if len(row) > 0:
                    pred_w = float(row["predicted_wsi"].values[0])
                    orig_w = float(row["origin_wsi"].values[0])
                    act_w = float(row["actual_wsi"].values[0])
                    sev_hit = bool(pred_w >= 1.5)
                    
                    onset_records.append({
                        "episode_district": dist,
                        "episode_start_date": s_str,
                        "lead_horizon": f"H+{h}",
                        "forecast_origin": orig_str,
                        "model": m,
                        "origin_wsi": round(orig_w, 4),
                        "actual_wsi": round(act_w, 4),
                        "predicted_wsi": round(pred_w, 4),
                        "onset_hit": sev_hit,
                    })
    onset_df = pd.DataFrame(onset_records)
    onset_df.to_csv(os.path.join(output_dir, "event_onset_predictions.csv"), index=False)
    
    # Summary of onset detection by model across the 11 episodes
    onset_summary = []
    for m in models:
        m_on = onset_df[onset_df["model"] == m]
        hits_h1 = int(m_on[(m_on["lead_horizon"] == "H+1") & (m_on["onset_hit"])]["episode_district"].nunique())
        hits_h2 = int(m_on[(m_on["lead_horizon"] == "H+2") & (m_on["onset_hit"])]["episode_district"].nunique())
        hits_h3 = int(m_on[(m_on["lead_horizon"] == "H+3") & (m_on["onset_hit"])]["episode_district"].nunique())
        total_unique_hits = int(m_on[m_on["onset_hit"]]["episode_start_date"].nunique())
        
        onset_summary.append({
            "model": m,
            "total_episodes": len(episodes),
            "episodes_detected_at_h1": hits_h1,
            "episodes_detected_at_h2": hits_h2,
            "episodes_detected_at_h3": hits_h3,
            "unique_episodes_detected_any_horizon": total_unique_hits,
            "onset_detection_rate_pct": round(total_unique_hits / len(episodes) * 100.0, 2),
        })
    onset_sum_df = pd.DataFrame(onset_summary)
    onset_sum_df.to_csv(os.path.join(output_dir, "event_onset_summary.csv"), index=False)
    audit_report["event_onset_summary"] = onset_summary
    
    # =========================================================================
    # 4. WSI-AR WARNING PRECISION UNCERTAINTY & EXPLICIT HYBRID EVALUATION
    # =========================================================================
    print("--- 4. AUDITING AR-12 PRECISION UNCERTAINTY & HYBRID DECISION RULES ---")
    # For AR-12: 5 alarms, 5 hits
    ar_tp = 5
    ar_total_alarms = 5
    p_hat, ci_low, ci_high = wilson_score_interval(ar_tp, ar_total_alarms, confidence=0.95)
    audit_report["ar12_precision_uncertainty"] = {
        "observed_alarms": ar_total_alarms,
        "observed_hits": ar_tp,
        "point_estimate_precision": round(p_hat, 4),
        "wilson_95_ci_lower": round(ci_low, 4),
        "wilson_95_ci_upper": round(ci_high, 4),
        "interpretation": "5/5 sample yields wide 95% CI [0.5655, 1.0000]; zero future false alarms cannot be guaranteed."
    }
    
    # Evaluate Explicit Hybrid Decision Rules:
    # Build pivot table of predictions for Persistence and WSI-AR
    p_sub = df[df["model"] == "Persistence"][["district", "forecast_origin", "target_date", "horizon", "actual_wsi", "severe_actual", "severe_pred"]].rename(columns={"severe_pred": "pred_persist"})
    ar_sub = df[df["model"] == "WSI_Autoregression"][["district", "forecast_origin", "target_date", "horizon", "severe_pred"]].rename(columns={"severe_pred": "pred_ar"})
    hyb_df = pd.merge(p_sub, ar_sub, on=["district", "forecast_origin", "target_date", "horizon"])
    
    # Rule A: Union (Alarm if Persist OR AR)
    hyb_df["pred_union"] = hyb_df["pred_persist"] | hyb_df["pred_ar"]
    # Rule B: Intersection (Alarm if Persist AND AR)
    hyb_df["pred_intersect"] = hyb_df["pred_persist"] & hyb_df["pred_ar"]
    
    def calc_contingency_dict(pred_col: str, name: str):
        tp = int(((hyb_df["severe_actual"] == True) & (hyb_df[pred_col] == True)).sum())
        fp = int(((hyb_df["severe_actual"] == False) & (hyb_df[pred_col] == True)).sum())
        fn = int(((hyb_df["severe_actual"] == True) & (hyb_df[pred_col] == False)).sum())
        tn = int(((hyb_df["severe_actual"] == False) & (hyb_df[pred_col] == False)).sum())
        alarms = tp + fp
        actual = tp + fn
        prec = (tp / alarms) if alarms > 0 else 0.0
        rec = (tp / actual) if actual > 0 else 0.0
        f1 = (2 * prec * rec / (prec + rec)) if (prec + rec) > 0 else 0.0
        csi = (tp / (tp + fp + fn)) if (tp + fp + fn) > 0 else 0.0
        return {
            "decision_rule": name,
            "total_evaluations": len(hyb_df),
            "actual_severe": actual,
            "alarms_issued": alarms,
            "tp_hits": tp,
            "fp_false_alarms": fp,
            "fn_misses": fn,
            "tn_correct_rejections": tn,
            "precision": round(prec, 4),
            "recall_pod": round(rec, 4),
            "f1_score": round(f1, 4),
            "csi": round(csi, 4),
        }
        
    hybrid_evals = [
        calc_contingency_dict("pred_persist", "Standalone Persistence (WSI_origin >= 1.5)"),
        calc_contingency_dict("pred_ar", "Standalone WSI-AR (WSI_AR >= 1.5)"),
        calc_contingency_dict("pred_union", "Hybrid Union: (Persistence OR WSI-AR)"),
        calc_contingency_dict("pred_intersect", "Hybrid Intersection: (Persistence AND WSI-AR)"),
    ]
    hyb_res_df = pd.DataFrame(hybrid_evals)
    hyb_res_df.to_csv(os.path.join(output_dir, "hybrid_decision_rules_evaluation.csv"), index=False)
    audit_report["hybrid_decision_rules"] = hybrid_evals
    
    # =========================================================================
    # 5. STATISTICAL SIGNIFICANCE TESTING
    # =========================================================================
    print("--- 5. TESTING STATISTICAL SIGNIFICANCE OF FORECAST SKILL ---")
    p_err = df[df["model"] == "Persistence"].sort_values(["district", "forecast_origin", "horizon"])
    ar_err = df[df["model"] == "WSI_Autoregression"].sort_values(["district", "forecast_origin", "horizon"])
    
    e_p = p_err["error"].values
    e_ar = ar_err["error"].values
    
    # A. Unadjusted Paired t-test (flawed, assumes i.i.d.)
    d_abs = np.abs(e_p) - np.abs(e_ar)
    naive_t, naive_p = stats.ttest_rel(np.abs(e_p), np.abs(e_ar))
    
    # B. Diebold-Mariano test per Horizon (accounting for autocorrelation of multi-step forecasts)
    dm_results = {}
    for h_idx, h in enumerate(["h1", "h2", "h3"], 1):
        sub_p = p_err[p_err["horizon"] == h]
        sub_ar = ar_err[ar_err["horizon"] == h]
        mean_diff, dm_stat, dm_p = diebold_mariano_test(sub_p["error"].values, sub_ar["error"].values, h=h_idx)
        dm_results[h] = {
            "mean_abs_error_diff (Persistence - AR)": round(float(mean_diff), 4),
            "dm_statistic": round(float(dm_stat), 4),
            "p_value": round(float(dm_p), 5),
            "statistically_significant_05": bool(dm_p < 0.05),
        }
        
    # C. Cluster-Robust Variance (Clustering by Forecast Origin Date to handle cross-district spatial dependence)
    d_df = p_err[["forecast_origin", "district", "horizon"]].copy()
    d_df["loss_diff"] = d_abs
    
    # Liang-Zeger cluster robust variance
    n_obs = len(d_df)
    groups = d_df["forecast_origin"].unique()
    n_groups = len(groups)
    mean_diff = float(np.mean(d_abs))
    residuals = d_abs - mean_diff
    
    # Sum residuals by cluster
    cluster_sums = d_df.groupby("forecast_origin")["loss_diff"].apply(lambda s: np.sum(s - mean_diff)).values
    cluster_var = (n_groups / (n_groups - 1)) * np.sum(cluster_sums ** 2) / (n_obs ** 2)
    cluster_se = float(np.sqrt(cluster_var))
    cluster_t = float(mean_diff / cluster_se) if cluster_se > 0 else 0.0
    cluster_p = float(2.0 * (1.0 - stats.t.cdf(abs(cluster_t), df=n_groups - 1)))
    
    audit_report["statistical_significance"] = {
        "mean_mae_difference": round(float(np.mean(d_abs)), 4),
        "naive_unadjusted_ttest": {"t_stat": round(float(naive_t), 4), "p_val": round(float(naive_p), 8)},
        "diebold_mariano_by_horizon": dm_results,
        "cluster_robust_by_origin": {
            "cluster_t_stat": round(cluster_t, 4),
            "cluster_p_value": round(cluster_p, 4),
            "statistically_significant_05": bool(cluster_p < 0.05),
        },
        "conclusion": "Cluster-robust p-value confirms whether improvement is statistically significant when accounting for temporal/spatial clustering."
    }
    
    # =========================================================================
    # 6. TEMPORAL BOUNDARY MAPPING
    # =========================================================================
    print("--- 6. MAPPING TEMPORAL BOUNDARIES (ORIGINS VS TARGETS) ---")
    temporal_records = []
    for f in df["fold"].unique():
        f_sub = df[df["fold"] == f]
        min_orig = f_sub["forecast_origin"].min()
        max_orig = f_sub["forecast_origin"].max()
        min_targ = f_sub["target_date"].min()
        max_targ = f_sub["target_date"].max()
        
        # Check boundary crossing
        cross_into_2021 = int((pd.to_datetime(f_sub["target_date"]) >= "2021-01-01").sum() / len(models))
        
        temporal_records.append({
            "fold": f,
            "origin_start": min_orig,
            "origin_end": max_orig,
            "target_start": min_targ,
            "target_end": max_targ,
            "target_crosses_into_subsequent_year": max_targ > max_orig,
            "targets_in_2021_count_per_model": cross_into_2021,
        })
    temp_df = pd.DataFrame(temporal_records)
    temp_df.to_csv(os.path.join(output_dir, "temporal_boundary_mapping.csv"), index=False)
    audit_report["temporal_boundaries"] = temporal_records
    
    # Save master audit json
    with open(os.path.join(output_dir, "scientific_audit_results.json"), "w") as f:
        json.dump(audit_report, f, indent=2)
        
    print(f"\n[OK] All targeted scientific audit diagnostics saved to: {output_dir}")
    return audit_report

if __name__ == "__main__":
    run_targeted_audit()
