"""
Dual Multi-Regime Rolling-Origin Backtest & Scientific Evaluation.

Implements two rigorously separated analyses:
- Analysis A: Fixed-Index Retrospective Comparison (2003–2017 calibration, WSI >= 1.5).
- Analysis B: Causally Constructed Forecasting Evaluation (frozen 2003–2010 reference baseline).

Evaluation protocol:
- Target dates strictly <= 2020-12-01 (Recovery fold origins: 2017-01-01 to 2020-09-01).
- Total origins: 936 (Fold 1: 288, Fold 2: 288, Fold 3: 360).
- Total evaluations per model: 2,808 (936 * 3 horizons).
- Evaluates Persistence, Seasonal Persistence, WSI-AR, Multivariate Ridge, XGBoost, Residual LSTM.
- Calculates MAE, RMSE, Bias, R2, Skill, Corrected Directional Accuracy.
- Calculates Severe-Stress Contingency (Precision, Recall, F1, CSI, FAR) by horizon.
- Evaluates Episode-Level Onset Detection and Lead Time across documented episodes.
"""

import os
import json
import math
from typing import Dict, List, Tuple, Any
import numpy as np
import pandas as pd
from scipy import stats
from scipy.stats import gamma, norm
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler
import xgboost as xgb
import tensorflow as tf

FEATURES = [
    "spi_stress_z",
    "soil_stress_z",
    "ndvi_stress_z",
    "lst_stress_z",
    "groundwater_stress_z",
    "surface_water_stress_z",
]

SEVERE_THRESHOLD = 1.5


def wilson_score_ci(successes: int, total: int, confidence: float = 0.95):
    if total == 0:
        return 0.0, 0.0, 0.0
    p_hat = successes / total
    z = stats.norm.ppf(1 - (1 - confidence) / 2)
    denom = 1 + (z**2) / total
    center = (p_hat + (z**2) / (2 * total)) / denom
    margin = (z * math.sqrt((p_hat * (1 - p_hat) + (z**2) / (4 * total)) / total)) / denom
    return p_hat, max(0.0, center - margin), min(1.0, center + margin)


def diebold_mariano_test(e1: np.ndarray, e2: np.ndarray, h: int = 1):
    d = (np.abs(e1)) - (np.abs(e2))
    n = len(d)
    mean_d = np.mean(d)
    gamma0 = np.var(d, ddof=0)
    gamma_sum = 0.0
    for k in range(1, h):
        cov_k = np.cov(d[:-k], d[k:], ddof=0)[0, 1] if n > k else 0.0
        w = 1.0 - k / h
        gamma_sum += 2.0 * w * cov_k
    var_d = (gamma0 + gamma_sum) / n
    if var_d <= 1e-12:
        return float(mean_d), 0.0, 1.0
    stat = mean_d / np.sqrt(var_d)
    pval = 2.0 * (1.0 - stats.norm.cdf(abs(stat)))
    return float(mean_d), float(stat), float(pval)


def compute_cluster_pvalue(d_abs: np.ndarray, cluster_ids: pd.Series) -> Tuple[float, float, float]:
    n_obs = len(d_abs)
    groups = cluster_ids.unique()
    n_groups = len(groups)
    mean_d = float(np.mean(d_abs))
    df_cluster = pd.DataFrame({"diff": d_abs, "group": cluster_ids})
    cluster_sums = df_cluster.groupby("group")["diff"].apply(lambda s: np.sum(s - mean_d)).values
    cluster_var = (n_groups / (n_groups - 1)) * np.sum(cluster_sums ** 2) / (n_obs ** 2)
    cluster_se = float(np.sqrt(cluster_var))
    cluster_t = float(mean_d / cluster_se) if cluster_se > 0 else 0.0
    cluster_p = float(2.0 * (1.0 - stats.t.cdf(abs(cluster_t), df=n_groups - 1)))
    return mean_d, cluster_t, cluster_p


def build_causal_dataset_b(master_csv: str = "outputs/Marathwada_MASTER_AUDIT_DATASET_2003_2024.csv") -> pd.DataFrame:
    """Builds completely causal indicators and WSI target using frozen 2003-2010 reference baseline."""
    df = pd.read_csv(master_csv)
    df["date"] = pd.to_datetime(df["date"])
    ref_mask = (df["date"] <= "2010-12-01")
    ref_df = df[ref_mask]
    
    # 1. SPI-3
    gamma_params = {}
    for (dist, m), grp in ref_df.groupby(["district", "month"]):
        vals = grp["rainfall_3m_mm"].values
        zeros = vals[vals <= 0.001]
        positives = vals[vals > 0.001]
        q = len(zeros) / len(vals)
        if len(positives) < 3:
            alpha = 1.0
            scale = max(float(np.mean(vals)), 1.0)
        else:
            shape, loc, scale = gamma.fit(positives, floc=0)
            alpha, scale = float(shape), float(scale)
        gamma_params[(dist, m)] = (q, alpha, scale)
        
    spi_vals = []
    for _, row in df.iterrows():
        dist, m, x = row["district"], int(row["month"]), row["rainfall_3m_mm"]
        q, alpha, scale = gamma_params[(dist, m)]
        if x <= 0.001:
            cdf = q
        else:
            cdf = q + (1.0 - q) * gamma.cdf(x, a=alpha, scale=scale)
        cdf = np.clip(cdf, 1e-7, 1.0 - 1e-7)
        spi_vals.append(norm.ppf(cdf))
        
    df["spi_3_causal"] = spi_vals
    df["spi_stress_causal"] = -df["spi_3_causal"]
    spi_m = df[ref_mask].groupby("district")["spi_stress_causal"].mean().to_dict()
    spi_s = df[ref_mask].groupby("district")["spi_stress_causal"].std(ddof=0).to_dict()
    df["spi_stress_z"] = [(r["spi_stress_causal"] - spi_m[r["district"]]) / max(spi_s[r["district"]], 1e-6) for _, r in df.iterrows()]
    
    # 2. Soil Moisture
    soil_clim = ref_df.groupby(["district", "month"])["soil_water_storage_mm"].mean().to_dict()
    df["soil_anom"] = df["soil_water_storage_mm"] - [soil_clim[(r["district"], int(r["month"]))] for _, r in df.iterrows()]
    soil_s = df[ref_mask].groupby("district")["soil_anom"].std(ddof=0).to_dict()
    df["soil_stress_z"] = [-r["soil_anom"] / max(soil_s[r["district"]], 1e-6) for _, r in df.iterrows()]
    
    # 3. NDVI
    ndvi_clim = ref_df.groupby(["district", "month"])["ndvi"].mean().to_dict()
    df["ndvi_anom"] = df["ndvi"] - [ndvi_clim[(r["district"], int(r["month"]))] for _, r in df.iterrows()]
    ndvi_s = df[ref_mask].groupby("district")["ndvi_anom"].std(ddof=0).to_dict()
    df["ndvi_stress_z"] = [-r["ndvi_anom"] / max(ndvi_s[r["district"]], 1e-6) for _, r in df.iterrows()]
    
    # 4. LST
    lst_clim = ref_df.groupby(["district", "month"])["lst_celsius"].mean().to_dict()
    df["lst_anom"] = df["lst_celsius"] - [lst_clim[(r["district"], int(r["month"]))] for _, r in df.iterrows()]
    lst_s = df[ref_mask].groupby("district")["lst_anom"].std(ddof=0).to_dict()
    df["lst_stress_z"] = [+r["lst_anom"] / max(lst_s[r["district"]], 1e-6) for _, r in df.iterrows()]
    
    # 5. Groundwater
    gw_clim = ref_df.groupby(["district", "month"])["groundwater_as_of_depth_m_bgl"].mean().to_dict()
    gw_d_fallback = ref_df.groupby("district")["groundwater_as_of_depth_m_bgl"].mean().to_dict()
    df["gw_anom"] = [r["groundwater_as_of_depth_m_bgl"] - gw_clim.get((r["district"], int(r["month"])), gw_d_fallback[r["district"]]) for _, r in df.iterrows()]
    gw_m = df[ref_mask].groupby("district")["gw_anom"].mean().to_dict()
    gw_s = df[ref_mask].groupby("district")["gw_anom"].std(ddof=0).to_dict()
    df["groundwater_stress_z"] = [(r["gw_anom"] - gw_m[r["district"]]) / max(gw_s[r["district"]], 1e-6) for _, r in df.iterrows()]
    
    # 6. Surface Water
    sw_clim = ref_df.groupby(["district", "month"])["surface_water_frequency"].mean().to_dict()
    df["sw_anom"] = df["surface_water_frequency"] - [sw_clim[(r["district"], int(r["month"]))] for _, r in df.iterrows()]
    sw_s = df[ref_mask].groupby("district")["sw_anom"].std(ddof=0).to_dict()
    df["surface_water_stress_z"] = [-r["sw_anom"] / max(sw_s[r["district"]], 1e-6) for _, r in df.iterrows()]
    
    # Target: WSI Causal
    df["wsi"] = df[FEATURES].mean(axis=1)
    return df


def train_residual_lstm(fold_data: Dict[str, Any], seed: int = 42) -> tf.keras.Model:
    tf.keras.utils.set_random_seed(seed)
    y_res_train = fold_data["y_train"] - fold_data["wsi_origin_train"][:, None]
    y_res_val = fold_data["y_val"] - fold_data["wsi_origin_val"][:, None]

    inputs = tf.keras.Input(shape=(12, 6), name="seq_input")
    x = tf.keras.layers.LSTM(32, return_sequences=False, name="lstm_layer")(inputs)
    x = tf.keras.layers.Dropout(0.20, name="dropout_layer")(x)
    x = tf.keras.layers.Dense(16, activation="relu", name="dense_layer")(x)
    outputs = tf.keras.layers.Dense(3, activation="linear", name="output_layer")(x)

    model = tf.keras.Model(inputs=inputs, outputs=outputs)
    model.compile(optimizer=tf.keras.optimizers.Adam(learning_rate=0.001), loss=tf.keras.losses.Huber(delta=1.0), metrics=["mae"])
    early_stop = tf.keras.callbacks.EarlyStopping(monitor="val_loss", patience=3, restore_best_weights=True)

    model.fit(
        fold_data["X_train"],
        y_res_train,
        validation_data=(fold_data["X_val"], y_res_val),
        epochs=12,
        batch_size=32,
        callbacks=[early_stop],
        verbose=0,
    )
    return model


def execute_analysis(
    panel_df: pd.DataFrame,
    analysis_label: str,
    output_dir: str,
) -> Dict[str, Any]:
    os.makedirs(output_dir, exist_ok=True)
    panel_df = panel_df.copy()
    panel_df["date"] = pd.to_datetime(panel_df["date"])
    districts = sorted(panel_df["district"].unique())
    truth_lookup = {(r["district"], r["date"].strftime("%Y-%m-%d")): float(r["wsi"]) for _, r in panel_df.iterrows()}

    # Folds with strictly truncated Fold 3 (origins 2017-01 to 2020-09 so targets <= 2020-12-01)
    folds = [
        {
            "name": "Fold_1_Pre_Drought",
            "period": "2011–2013",
            "train_end": pd.Timestamp("2010-12-01"),
            "eval_start": pd.Timestamp("2011-01-01"),
            "eval_end": pd.Timestamp("2013-12-01"),
        },
        {
            "name": "Fold_2_Drought_Peak",
            "period": "2014–2016",
            "train_end": pd.Timestamp("2013-12-01"),
            "eval_start": pd.Timestamp("2014-01-01"),
            "eval_end": pd.Timestamp("2016-12-01"),
        },
        {
            "name": "Fold_3_Recovery",
            "period": "2017–2020",
            "train_end": pd.Timestamp("2016-12-01"),
            "eval_start": pd.Timestamp("2017-01-01"),
            "eval_end": pd.Timestamp("2020-09-01"),  # Truncated so H+3 targets <= 2020-12-01
        },
    ]

    all_predictions = []
    print(f"\n==========================================================================")
    print(f"RUNNING {analysis_label}")
    print(f"Output Directory: {output_dir}")
    print(f"==========================================================================")

    for f_idx, fold in enumerate(folds, 1):
        f_name = fold["name"]
        t_end = fold["train_end"]
        e_start = fold["eval_start"]
        e_end = fold["eval_end"]
        print(f"\n--> {f_name}: Train <= {t_end.strftime('%Y-%m')} | Eval Origins: {e_start.strftime('%Y-%m')} to {e_end.strftime('%Y-%m')}")

        # Build causal fold data
        hist_df = panel_df[panel_df["date"] <= t_end].copy()
        scaler_params = {}
        std_df = hist_df.copy()
        for dist in districts:
            d_mask = std_df["district"] == dist
            scaler_params[dist] = {}
            for feat in FEATURES:
                vals = std_df.loc[d_mask, feat].values
                m_val, s_val = float(np.mean(vals)), float(np.std(vals))
                if s_val < 1e-6:
                    s_val = 1.0
                scaler_params[dist][feat] = (m_val, s_val)
                std_df.loc[d_mask, feat] = (vals - m_val) / s_val

        # Extract sequence tensors
        X_all, y_all, wsi_all, wsi_orig_all, dates_all = [], [], [], [], []
        latest_allowed = t_end - pd.DateOffset(months=3)
        for dist in districts:
            dist_df = std_df[std_df["district"] == dist].sort_values("date").reset_index(drop=True)
            d_dates = dist_df["date"].tolist()
            f_mat = dist_df[FEATURES].values.astype(np.float32)
            w_vec = dist_df["wsi"].values.astype(np.float32)
            for i in range(11, len(dist_df) - 3):
                o_date = d_dates[i]
                if o_date <= latest_allowed:
                    X_all.append(f_mat[i - 11 : i + 1])
                    y_all.append(w_vec[i + 1 : i + 4])
                    wsi_all.append(w_vec[i - 11 : i + 1])
                    wsi_orig_all.append(w_vec[i])
                    dates_all.append(o_date)

        X_all = np.array(X_all, dtype=np.float32)
        y_all = np.array(y_all, dtype=np.float32)
        wsi_all = np.array(wsi_all, dtype=np.float32)
        wsi_orig_all = np.array(wsi_orig_all, dtype=np.float32)
        dates_all = np.array(dates_all)

        val_cutoff = latest_allowed - pd.DateOffset(months=12)
        tr_idx = np.where(dates_all <= val_cutoff)[0]
        val_idx = np.where(dates_all > val_cutoff)[0]

        fold_data = {
            "X_train": X_all[tr_idx], "y_train": y_all[tr_idx], "wsi_origin_train": wsi_orig_all[tr_idx],
            "X_val": X_all[val_idx], "y_val": y_all[val_idx], "wsi_origin_val": wsi_orig_all[val_idx],
            "X_full": X_all, "y_full": y_all, "wsi_full": wsi_all,
        }

        # Fit models
        # 1. WSI Autoregression
        scaler_wsi = StandardScaler()
        wsi_scaled = scaler_wsi.fit_transform(fold_data["wsi_full"])
        ar_model = Ridge(alpha=10.0).fit(wsi_scaled, fold_data["y_full"])

        # 2. Multivariate Ridge
        X_flat = fold_data["X_full"].reshape(len(fold_data["X_full"]), -1)
        scaler_x = StandardScaler()
        X_scaled = scaler_x.fit_transform(X_flat)
        ridge_model = Ridge(alpha=1.0).fit(X_scaled, fold_data["y_full"])

        # 3. XGBoost
        xgb_models = []
        for h in range(3):
            m_xgb = xgb.XGBRegressor(n_estimators=50, max_depth=3, learning_rate=0.08, subsample=0.8, random_state=42, n_jobs=-1)
            m_xgb.fit(X_flat, fold_data["y_full"][:, h], verbose=False)
            xgb_models.append(m_xgb)

        # 4. Residual LSTM
        lstm_model = train_residual_lstm(fold_data, seed=42)

        # Monthly Rolling Inference
        origin_dates = pd.date_range(start=e_start, end=e_end, freq="MS")
        for orig_t in origin_dates:
            orig_str = orig_t.strftime("%Y-%m-%d")
            for dist in districts:
                dist_hist = panel_df[(panel_df["district"] == dist) & (panel_df["date"] <= orig_t)].sort_values("date").reset_index(drop=True)
                if len(dist_hist) < 12:
                    continue
                hist_12 = dist_hist.iloc[-12:]
                f_mat = np.zeros((12, 6), dtype=np.float32)
                for f_idx, feat in enumerate(FEATURES):
                    m_val, s_val = scaler_params[dist][feat]
                    f_mat[:, f_idx] = (hist_12[feat].values - m_val) / s_val
                w_12 = hist_12["wsi"].values.astype(np.float32)
                origin_wsi = float(w_12[-1])

                # Forecasts
                p_persist = np.repeat(origin_wsi, 3)
                p_seasonal = np.zeros(3, dtype=np.float32)
                for h in range(1, 4):
                    lag_key = (dist, (orig_t + pd.DateOffset(months=h) - pd.DateOffset(months=12)).strftime("%Y-%m-%d"))
                    p_seasonal[h - 1] = truth_lookup.get(lag_key, origin_wsi)
                p_ar = ar_model.predict(scaler_wsi.transform(w_12.reshape(1, -1)))[0]
                p_ridge = ridge_model.predict(scaler_x.transform(f_mat.reshape(1, -1)))[0]
                p_xgb = np.array([xgb_models[h].predict(f_mat.reshape(1, -1))[0] for h in range(3)], dtype=np.float32)
                p_lstm = origin_wsi + lstm_model.predict(f_mat.reshape(1, 12, 6), verbose=0)[0]

                preds_dict = {
                    "Persistence": p_persist,
                    "Seasonal_Persistence": p_seasonal,
                    "WSI_Autoregression": p_ar,
                    "Ridge_Regression": p_ridge,
                    "XGBoost": p_xgb,
                    "Residual_LSTM": p_lstm,
                }

                for h in range(1, 4):
                    target_date = (orig_t + pd.DateOffset(months=h)).strftime("%Y-%m-%d")
                    actual_wsi = truth_lookup.get((dist, target_date), np.nan)
                    if np.isnan(actual_wsi):
                        continue
                    # Verify target constraint
                    if target_date > "2020-12-01":
                        continue

                    for m_name, p_arr in preds_dict.items():
                        pred_wsi = float(p_arr[h - 1])
                        err = pred_wsi - actual_wsi
                        act_delta = actual_wsi - origin_wsi
                        pred_delta = pred_wsi - origin_wsi

                        # Corrected directional rules
                        sign_act = 1 if act_delta > 1e-5 else (-1 if act_delta < -1e-5 else 0)
                        sign_pred = 1 if pred_delta > 1e-5 else (-1 if pred_delta < -1e-5 else 0)
                        strict_dir = (sign_act == sign_pred)
                        nonzero_dir = (sign_act == sign_pred) and (sign_pred != 0)
                        bin_dir = (act_delta > 0) == (pred_delta > 0)

                        is_severe_actual = (actual_wsi >= SEVERE_THRESHOLD)
                        is_severe_pred = (pred_wsi >= SEVERE_THRESHOLD)

                        all_predictions.append({
                            "analysis": analysis_label,
                            "fold": f_name,
                            "model": m_name,
                            "district": dist,
                            "forecast_origin": orig_str,
                            "target_date": target_date,
                            "horizon": f"h{h}",
                            "origin_wsi": round(origin_wsi, 6),
                            "actual_wsi": round(actual_wsi, 6),
                            "predicted_wsi": round(pred_wsi, 6),
                            "error": round(err, 6),
                            "absolute_error": round(abs(err), 6),
                            "squared_error": round(err ** 2, 6),
                            "strict_dir_correct": strict_dir,
                            "nonzero_dir_correct": nonzero_dir,
                            "bin_dir_correct": bin_dir,
                            "severe_actual": is_severe_actual,
                            "severe_pred": is_severe_pred,
                        })

    pred_df = pd.DataFrame(all_predictions)
    pred_df.to_csv(os.path.join(output_dir, "predictions.csv"), index=False)
    print(f"[OK] Generated {len(pred_df)} predictions. Target Range: {pred_df['target_date'].min()} to {pred_df['target_date'].max()}")

    # =========================================================================
    # Continuous Metrics
    # =========================================================================
    models_list = sorted(pred_df["model"].unique())
    cont_records = []
    p_df = pred_df[pred_df["model"] == "Persistence"]

    def calc_reg_metrics(sub_df: pd.DataFrame, p_sub_df: pd.DataFrame, extra: Dict[str, Any]):
        mae = float(sub_df["absolute_error"].mean())
        rmse = float(np.sqrt(sub_df["squared_error"].mean()))
        bias = float(sub_df["error"].mean())
        p_mae = float(p_sub_df["absolute_error"].mean())
        skill = float(1.0 - mae / p_mae) * 100.0 if p_mae > 0 else 0.0
        ss_res = float(((sub_df["actual_wsi"] - sub_df["predicted_wsi"]) ** 2).sum())
        ss_tot = float(((sub_df["actual_wsi"] - sub_df["actual_wsi"].mean()) ** 2).sum())
        r2 = float(1.0 - ss_res / ss_tot) if ss_tot > 0 else 0.0
        strict_dir = float(sub_df["strict_dir_correct"].mean() * 100.0)
        bin_dir = float(sub_df["bin_dir_correct"].mean() * 100.0)

        res = {
            "count": len(sub_df),
            "mae": round(mae, 4),
            "rmse": round(rmse, 4),
            "bias": round(bias, 4),
            "r2": round(r2, 4),
            "skill_vs_persistence": round(skill, 2),
            "strict_sign_match_pct": round(strict_dir, 2),
            "binary_increase_acc_pct": round(bin_dir, 2),
        }
        res.update(extra)
        return res

    for m in models_list:
        m_df = pred_df[pred_df["model"] == m]
        # Overall
        cont_records.append(calc_reg_metrics(m_df, p_df, {"model": m, "horizon": "Overall", "fold": "All"}))
        # By Fold
        for f in ["Fold_1_Pre_Drought", "Fold_2_Drought_Peak", "Fold_3_Recovery"]:
            cont_records.append(calc_reg_metrics(m_df[m_df["fold"] == f], p_df[p_df["fold"] == f], {"model": m, "horizon": "Overall", "fold": f}))
        # By Horizon
        for h in ["h1", "h2", "h3"]:
            cont_records.append(calc_reg_metrics(m_df[m_df["horizon"] == h], p_df[p_df["horizon"] == h], {"model": m, "horizon": h, "fold": "All"}))

    cont_df = pd.DataFrame(cont_records)
    cont_df.to_csv(os.path.join(output_dir, "continuous_metrics.csv"), index=False)

    # =========================================================================
    # Severe Early Warning Contingency
    # =========================================================================
    warn_records = []
    for h in ["Overall", "h1", "h2", "h3"]:
        for m in models_list:
            if h == "Overall":
                sub = pred_df[pred_df["model"] == m]
            else:
                sub = pred_df[(pred_df["model"] == m) & (pred_df["horizon"] == h)]
            tp = int(((sub["severe_actual"] == True) & (sub["severe_pred"] == True)).sum())
            fp = int(((sub["severe_actual"] == False) & (sub["severe_pred"] == True)).sum())
            fn = int(((sub["severe_actual"] == True) & (sub["severe_pred"] == False)).sum())
            tn = int(((sub["severe_actual"] == False) & (sub["severe_pred"] == False)).sum())
            act_sev = tp + fn
            alarms = tp + fp
            prec = (tp / alarms) if alarms > 0 else 0.0
            rec = (tp / act_sev) if act_sev > 0 else 0.0
            f1 = (2 * prec * rec / (prec + rec)) if (prec + rec) > 0 else 0.0
            csi = (tp / (tp + fp + fn)) if (tp + fp + fn) > 0 else 0.0
            p_hat, ci_low, ci_high = wilson_score_ci(tp, alarms, confidence=0.95)

            warn_records.append({
                "model": m,
                "horizon": h,
                "evaluations": len(sub),
                "actual_severe": act_sev,
                "alarms_issued": alarms,
                "tp_hits": tp,
                "fp_false_alarms": fp,
                "fn_misses": fn,
                "tn_correct_rejections": tn,
                "precision": round(prec, 4),
                "wilson_ci_95_low": round(ci_low, 4),
                "wilson_ci_95_high": round(ci_high, 4),
                "recall_pod": round(rec, 4),
                "f1_score": round(f1, 4),
                "csi": round(csi, 4),
            })
    warn_df = pd.DataFrame(warn_records)
    warn_df.to_csv(os.path.join(output_dir, "early_warning_metrics.csv"), index=False)

    # =========================================================================
    # Episode-Level Onset Lead Time
    # =========================================================================
    sev_targets = pred_df[pred_df["model"] == "Persistence"][pred_df["severe_actual"] == True][["district", "target_date"]].drop_duplicates()
    sev_targets["target_date"] = pd.to_datetime(sev_targets["target_date"])
    episodes = []
    for dist, grp in sev_targets.groupby("district"):
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
                episodes.append({"district": dist, "start_date": cur_ep[0].strftime("%Y-%m-%d"), "end_date": cur_ep[-1].strftime("%Y-%m-%d"), "duration": len(cur_ep)})
                cur_ep = [d]
        if cur_ep:
            episodes.append({"district": dist, "start_date": cur_ep[0].strftime("%Y-%m-%d"), "end_date": cur_ep[-1].strftime("%Y-%m-%d"), "duration": len(cur_ep)})

    onset_records = []
    for ep in episodes:
        dist = ep["district"]
        s_date = pd.to_datetime(ep["start_date"])
        s_str = ep["start_date"]
        for h in [1, 2, 3]:
            orig_str = (s_date - pd.DateOffset(months=h)).strftime("%Y-%m-%d")
            for m in models_list:
                row = pred_df[(pred_df["model"] == m) & (pred_df["district"] == dist) & (pred_df["forecast_origin"] == orig_str) & (pred_df["target_date"] == s_str)]
                if len(row) > 0:
                    pred_w = float(row["predicted_wsi"].values[0])
                    orig_w = float(row["origin_wsi"].values[0])
                    act_w = float(row["actual_wsi"].values[0])
                    onset_records.append({
                        "district": dist,
                        "episode_start": s_str,
                        "duration": ep["duration"],
                        "lead_horizon": f"H+{h}",
                        "model": m,
                        "origin_wsi": round(orig_w, 4),
                        "actual_wsi": round(act_w, 4),
                        "predicted_wsi": round(pred_w, 4),
                        "onset_hit": bool(pred_w >= SEVERE_THRESHOLD),
                    })
    onset_df = pd.DataFrame(onset_records)
    onset_df.to_csv(os.path.join(output_dir, "event_onset_predictions.csv"), index=False)

    return {
        "pred_df": pred_df,
        "cont_df": cont_df,
        "warn_df": warn_df,
        "episodes": episodes,
        "onset_df": onset_df,
    }


def run_dual_backtest():
    # 1. Run Analysis A: Fixed-Index Retrospective Comparison
    panel_a = pd.read_csv("outputs/Marathwada_MODEL_DATASET_2003_2024.csv")
    res_a = execute_analysis(
        panel_df=panel_a,
        analysis_label="Analysis_A_Fixed_Index_2003_2017",
        output_dir="results/backtest_analysis_a_fixed_index",
    )

    # 2. Run Analysis B: Causally Constructed Forecasting Evaluation (frozen 2003-2010 reference)
    panel_b = build_causal_dataset_b("outputs/Marathwada_MASTER_AUDIT_DATASET_2003_2024.csv")
    res_b = execute_analysis(
        panel_df=panel_b,
        analysis_label="Analysis_B_Causal_Reference_2003_2010",
        output_dir="results/backtest_analysis_b_causal_reference",
    )

    # 3. Dual Reconciliation & Statistical Testing
    out_rec = "results/backtest_dual_reconciliation"
    os.makedirs(out_rec, exist_ok=True)

    # Statistical significance on truncated targets <= 2020-12
    p_a = res_a["pred_df"][res_a["pred_df"]["model"] == "Persistence"].sort_values(["district", "forecast_origin", "horizon"])
    ar_a = res_a["pred_df"][res_a["pred_df"]["model"] == "WSI_Autoregression"].sort_values(["district", "forecast_origin", "horizon"])
    d_a = np.abs(p_a["error"].values) - np.abs(ar_a["error"].values)
    mean_a, t_a, pval_a = compute_cluster_pvalue(d_a, p_a["forecast_origin"])

    p_b = res_b["pred_df"][res_b["pred_df"]["model"] == "Persistence"].sort_values(["district", "forecast_origin", "horizon"])
    ar_b = res_b["pred_df"][res_b["pred_df"]["model"] == "WSI_Autoregression"].sort_values(["district", "forecast_origin", "horizon"])
    d_b = np.abs(p_b["error"].values) - np.abs(ar_b["error"].values)
    mean_b, t_b, pval_b = compute_cluster_pvalue(d_b, p_b["forecast_origin"])

    # Diebold Mariano
    dm_a = {h: diebold_mariano_test(p_a[p_a["horizon"] == h]["error"].values, ar_a[ar_a["horizon"] == h]["error"].values, h=int(h[1])) for h in ["h1", "h2", "h3"]}
    dm_b = {h: diebold_mariano_test(p_b[p_b["horizon"] == h]["error"].values, ar_b[ar_b["horizon"] == h]["error"].values, h=int(h[1])) for h in ["h1", "h2", "h3"]}

    summary_data = {
        "analysis_comparison": {
            "Analysis_A_Fixed_Index": {
                "reference_period": "2003-01 to 2017-12 (Stationary benchmark calibration)",
                "total_predictions_per_model": len(p_a),
                "origin_dates": f"{p_a['forecast_origin'].min()} to {p_a['forecast_origin'].max()}",
                "target_dates": f"{p_a['target_date'].min()} to {p_a['target_date'].max()}",
                "persistence_mae": round(float(p_a["absolute_error"].mean()), 4),
                "wsi_ar_mae": round(float(ar_a["absolute_error"].mean()), 4),
                "mae_improvement": round(float(mean_a), 4),
                "skill_pct": round(float((1.0 - ar_a["absolute_error"].mean() / p_a["absolute_error"].mean()) * 100.0), 2),
                "cluster_robust_pvalue": round(float(pval_a), 4),
                "diebold_mariano": dm_a,
                "severe_episodes_count": len(res_a["episodes"]),
            },
            "Analysis_B_Causal_Reference": {
                "reference_period": "2003-01 to 2010-12 (Frozen pre-evaluation calibration)",
                "total_predictions_per_model": len(p_b),
                "origin_dates": f"{p_b['forecast_origin'].min()} to {p_b['forecast_origin'].max()}",
                "target_dates": f"{p_b['target_date'].min()} to {p_b['target_date'].max()}",
                "persistence_mae": round(float(p_b["absolute_error"].mean()), 4),
                "wsi_ar_mae": round(float(ar_b["absolute_error"].mean()), 4),
                "mae_improvement": round(float(mean_b), 4),
                "skill_pct": round(float((1.0 - ar_b["absolute_error"].mean() / p_b["absolute_error"].mean()) * 100.0), 2),
                "cluster_robust_pvalue": round(float(pval_b), 4),
                "diebold_mariano": dm_b,
                "severe_episodes_count": len(res_b["episodes"]),
            },
        }
    }

    with open(os.path.join(out_rec, "reconciliation_summary.json"), "w") as f:
        json.dump(summary_data, f, indent=2)

    print("\n==========================================================================")
    print("DUAL RECONCILIATION SUMMARY COMPLETED SUCCESSFULLY")
    print(f"Summary saved to: {out_rec}/reconciliation_summary.json")
    print("==========================================================================")


if __name__ == "__main__":
    run_dual_backtest()
