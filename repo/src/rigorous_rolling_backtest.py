"""
Rigorous Multi-Regime Historical Rolling-Origin Backtest & Early-Warning Quality Audit.
Evaluates Persistence, Seasonal Persistence, WSI-AR, Multivariate Ridge, XGBoost, and Residual LSTM.
Evaluation Folds (2011–2020):
  - Fold 1: Pre-Drought Moderate Baseline (2011–2013)
  - Fold 2: Acute Drought Escalation & Peak (2014–2016)
  - Fold 3: Post-Drought Recovery & Normalization (2017–2020)
  - Overall: 10-Year Continuous Historical Diagnostic (2011–2020)
Strict causal preprocessing and temporal split boundaries. Zero test-set leakage (2021-2024 frozen).
"""

import os
import json
import argparse
from typing import Dict, List, Tuple, Any, Optional
from pathlib import Path

import numpy as np
import pandas as pd
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

SEVERE_STRESS_THRESHOLD = 1.5


def build_causal_data_for_fold(
    panel_df: pd.DataFrame,
    fold_train_end: pd.Timestamp,
    val_months: int = 12,
    lookback: int = 12,
    horizon: int = 3,
) -> Dict[str, Any]:
    """
    Constructs training and validation sets strictly using observations available up to fold_train_end.
    Standardizes features using statistics strictly from date <= fold_train_end.
    """
    hist_df = panel_df[panel_df["date"] <= fold_train_end].copy()
    districts = sorted(hist_df["district"].unique())

    # Causal standardization parameters fitted strictly up to fold_train_end
    scaler_params = {}
    std_df = hist_df.copy()
    for dist in districts:
        d_mask = std_df["district"] == dist
        scaler_params[dist] = {}
        for feat in FEATURES:
            vals = std_df.loc[d_mask, feat].values
            mean_val = float(np.mean(vals))
            std_val = float(np.std(vals))
            if std_val < 1e-6:
                std_val = 1.0
            scaler_params[dist][feat] = (mean_val, std_val)
            std_df.loc[d_mask, feat] = (vals - mean_val) / std_val

    # Sequence extraction
    X_all, y_all, wsi_all, wsi_origin_all, dates_all = [], [], [], [], []
    latest_allowed_origin = fold_train_end - pd.DateOffset(months=horizon)

    for dist in districts:
        dist_df = std_df[std_df["district"] == dist].sort_values("date").reset_index(drop=True)
        dates = dist_df["date"].tolist()
        feat_mat = dist_df[FEATURES].values.astype(np.float32)
        wsi_vec = dist_df["wsi"].values.astype(np.float32)
        n_rows = len(dist_df)

        for i in range(lookback - 1, n_rows - horizon):
            o_date = dates[i]
            if o_date <= latest_allowed_origin:
                X_sample = feat_mat[i - 11 : i + 1]
                y_sample = wsi_vec[i + 1 : i + 4]
                wsi_sample = wsi_vec[i - 11 : i + 1]
                origin_val = wsi_vec[i]

                X_all.append(X_sample)
                y_all.append(y_sample)
                wsi_all.append(wsi_sample)
                wsi_origin_all.append(origin_val)
                dates_all.append(o_date)

    X_all = np.array(X_all, dtype=np.float32)
    y_all = np.array(y_all, dtype=np.float32)
    wsi_all = np.array(wsi_all, dtype=np.float32)
    wsi_origin_all = np.array(wsi_origin_all, dtype=np.float32)
    dates_all = np.array(dates_all)

    # Train / Val split for LSTM early stopping (last val_months origins)
    val_cutoff_date = latest_allowed_origin - pd.DateOffset(months=val_months)
    train_idx = np.where(dates_all <= val_cutoff_date)[0]
    val_idx = np.where(dates_all > val_cutoff_date)[0]

    return {
        "scaler_params": scaler_params,
        "X_train": X_all[train_idx],
        "y_train": y_all[train_idx],
        "wsi_train": wsi_all[train_idx],
        "wsi_origin_train": wsi_origin_all[train_idx],
        "X_val": X_all[val_idx],
        "y_val": y_all[val_idx],
        "wsi_val": wsi_all[val_idx],
        "wsi_origin_val": wsi_origin_all[val_idx],
        "X_full": X_all,
        "y_full": y_all,
        "wsi_full": wsi_all,
        "wsi_origin_full": wsi_origin_all,
    }


def train_residual_lstm(fold_data: Dict[str, Any], seed: int = 42) -> tf.keras.Model:
    """Trains a fresh Residual LSTM on fold training data with validation early stopping."""
    tf.keras.utils.set_random_seed(seed)
    
    # Target residuals: r = y - wsi_origin
    y_res_train = fold_data["y_train"] - fold_data["wsi_origin_train"][:, None]
    y_res_val = fold_data["y_val"] - fold_data["wsi_origin_val"][:, None]

    inputs = tf.keras.Input(shape=(12, 6), name="seq_input")
    x = tf.keras.layers.LSTM(32, return_sequences=False, name="lstm_layer")(inputs)
    x = tf.keras.layers.Dropout(0.20, name="dropout_layer")(x)
    x = tf.keras.layers.Dense(16, activation="relu", name="dense_layer")(x)
    outputs = tf.keras.layers.Dense(3, activation="linear", name="output_layer")(x)

    model = tf.keras.Model(inputs=inputs, outputs=outputs, name=f"Residual_LSTM_fold")
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
        loss=tf.keras.losses.Huber(delta=1.0),
        metrics=["mae"],
    )

    early_stop = tf.keras.callbacks.EarlyStopping(
        monitor="val_loss",
        patience=3,
        restore_best_weights=True,
    )

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


def run_rigorous_backtest(
    panel_csv: str = "outputs/Marathwada_MODEL_DATASET_2003_2024.csv",
    output_dir: str = "results/rolling_backtest_rigorous",
) -> Dict[str, Any]:
    """Executes the full 2011–2020 rolling backtest across 3 regimes."""
    os.makedirs(output_dir, exist_ok=True)
    panel_df = pd.read_csv(panel_csv)
    panel_df["date"] = pd.to_datetime(panel_df["date"])

    districts = sorted(panel_df["district"].unique())
    truth_lookup = {
        (row["district"], row["date"].strftime("%Y-%m-%d")): float(row["wsi"])
        for _, row in panel_df.iterrows()
    }

    # Define Folds
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
            "eval_end": pd.Timestamp("2020-12-01"),
        },
    ]

    all_prediction_records = []

    print("==========================================================================")
    print("STARTING RIGOROUS MULTI-REGIME EXPANDING-WINDOW BACKTEST (2011–2020)")
    print("==========================================================================")

    for fold_idx, fold in enumerate(folds, start=1):
        fold_name = fold["name"]
        eval_start = fold["eval_start"]
        eval_end = fold["eval_end"]
        train_end = fold["train_end"]
        print(f"\n---> FOLD {fold_idx}: {fold_name} ({fold['period']})")
        print(f"      Causal Training Window: 2003-12 to {train_end.strftime('%Y-%m')}")
        print(f"      Evaluation Window: {eval_start.strftime('%Y-%m')} to {eval_end.strftime('%Y-%m')}")

        # 1. Build causal training & validation data for this fold
        fold_data = build_causal_data_for_fold(panel_df, fold_train_end=train_end)
        scaler_params = fold_data["scaler_params"]
        print(f"      Training Sequences: {len(fold_data['X_train'])}, Validation Sequences: {len(fold_data['X_val'])}")

        # 2. Train / Fit Models on this fold's available historical data
        print("      Fitting baseline and ML models on fold training data...")
        # WSI-AR (Ridge on 12-lag WSI trajectory)
        scaler_wsi = StandardScaler()
        wsi_tr_scaled = scaler_wsi.fit_transform(fold_data["wsi_full"])
        ar_model = Ridge(alpha=10.0)
        ar_model.fit(wsi_tr_scaled, fold_data["y_full"])

        # Multivariate Ridge (72 flattened features)
        X_tr_flat = fold_data["X_full"].reshape(len(fold_data["X_full"]), -1)
        scaler_x = StandardScaler()
        X_tr_scaled = scaler_x.fit_transform(X_tr_flat)
        ridge_model = Ridge(alpha=1.0)
        ridge_model.fit(X_tr_scaled, fold_data["y_full"])

        # XGBoost (3 decoupled horizon regressors)
        xgb_models = []
        for h in range(3):
            xgb_m = xgb.XGBRegressor(
                n_estimators=50,
                max_depth=3,
                learning_rate=0.08,
                subsample=0.8,
                random_state=42,
                n_jobs=-1,
            )
            xgb_m.fit(X_tr_flat, fold_data["y_full"][:, h], verbose=False)
            xgb_models.append(xgb_m)

        # Residual LSTM (Trained with early stopping on fold validation set)
        print("      Training Residual LSTM with early stopping on fold validation split...")
        lstm_model = train_residual_lstm(fold_data, seed=42)

        # 3. Monthly Rolling Inference across the fold's evaluation period
        origin_dates = pd.date_range(start=eval_start, end=eval_end, freq="MS")
        print(f"      Executing untouched monthly rolling inference across {len(origin_dates)} origins...")

        for origin_t in origin_dates:
            origin_str = origin_t.strftime("%Y-%m-%d")

            # Extract current origin feature tensor causally normalized with scaler_params
            for dist in districts:
                dist_hist = panel_df[(panel_df["district"] == dist) & (panel_df["date"] <= origin_t)].sort_values("date").reset_index(drop=True)
                if len(dist_hist) < 12:
                    continue

                # Causal scaling matching fold parameters
                feat_mat = np.zeros((12, 6), dtype=np.float32)
                hist_12 = dist_hist.iloc[-12:]
                for f_idx, feat in enumerate(FEATURES):
                    m_val, s_val = scaler_params[dist][feat]
                    raw_vals = hist_12[feat].values
                    feat_mat[:, f_idx] = (raw_vals - m_val) / s_val

                wsi_12 = hist_12["wsi"].values.astype(np.float32)
                origin_wsi = float(wsi_12[-1])

                # Forecast generation
                # 1. Persistence
                p_persist = np.repeat(origin_wsi, 3)

                # 2. Seasonal Persistence (lag 12 from truth lookup)
                p_seasonal = np.zeros(3, dtype=np.float32)
                for h in range(1, 4):
                    t_date = origin_t + pd.DateOffset(months=h)
                    lag_key = (dist, (t_date - pd.DateOffset(months=12)).strftime("%Y-%m-%d"))
                    p_seasonal[h - 1] = truth_lookup.get(lag_key, origin_wsi)

                # 3. WSI Autoregression
                wsi_input_scaled = scaler_wsi.transform(wsi_12.reshape(1, -1))
                p_ar = ar_model.predict(wsi_input_scaled)[0]

                # 4. Multivariate Ridge
                x_flat_scaled = scaler_x.transform(feat_mat.reshape(1, -1))
                p_ridge = ridge_model.predict(x_flat_scaled)[0]

                # 5. XGBoost
                p_xgb = np.array([xgb_models[h].predict(feat_mat.reshape(1, -1))[0] for h in range(3)], dtype=np.float32)

                # 6. Residual LSTM
                p_res = lstm_model.predict(feat_mat.reshape(1, 12, 6), verbose=0)[0]
                p_lstm = origin_wsi + p_res

                preds_dict = {
                    "Persistence": p_persist,
                    "Seasonal_Persistence": p_seasonal,
                    "WSI_Autoregression": p_ar,
                    "Ridge_Regression": p_ridge,
                    "XGBoost": p_xgb,
                    "Residual_LSTM": p_lstm,
                }

                for h in range(1, 4):
                    target_date = (origin_t + pd.DateOffset(months=h)).strftime("%Y-%m-%d")
                    actual_wsi = truth_lookup.get((dist, target_date), np.nan)
                    if np.isnan(actual_wsi):
                        continue

                    for m_name, p_arr in preds_dict.items():
                        pred_wsi = float(p_arr[h - 1])
                        err = pred_wsi - actual_wsi

                        # Directional trend: did WSI increase relative to origin?
                        actual_delta = actual_wsi - origin_wsi
                        pred_delta = pred_wsi - origin_wsi
                        dir_correct = (actual_delta * pred_delta >= 0)

                        # Severe stress event (WSI >= 1.5)
                        is_severe_actual = (actual_wsi >= SEVERE_STRESS_THRESHOLD)
                        is_severe_pred = (pred_wsi >= SEVERE_STRESS_THRESHOLD)

                        all_prediction_records.append({
                            "fold": fold_name,
                            "fold_period": fold["period"],
                            "model": m_name,
                            "district": dist,
                            "forecast_origin": origin_str,
                            "target_date": target_date,
                            "horizon": f"h{h}",
                            "origin_wsi": round(origin_wsi, 6),
                            "actual_wsi": round(actual_wsi, 6),
                            "predicted_wsi": round(pred_wsi, 6),
                            "error": round(err, 6),
                            "absolute_error": round(abs(err), 6),
                            "squared_error": round(err ** 2, 6),
                            "dir_correct": dir_correct,
                            "severe_actual": is_severe_actual,
                            "severe_pred": is_severe_pred,
                        })

    pred_df = pd.DataFrame(all_prediction_records)
    pred_csv_path = os.path.join(output_dir, "predictions.csv")
    pred_df.to_csv(pred_csv_path, index=False)
    print(f"\n[OK] Saved all {len(pred_df)} backtest predictions to: {pred_csv_path}")

    # =========================================================================
    # 4. COMPUTE CONTINUOUS FORECASTING METRICS (MAE, RMSE, BIAS, R2, SKILL)
    # =========================================================================
    print("\nComputing continuous regression metrics across folds and horizons...")
    models = sorted(pred_df["model"].unique())
    folds_list = sorted(pred_df["fold"].unique().tolist())
    metrics_records = []

    # Helper for continuous metrics
    def compute_reg_metrics(sub_df: pd.DataFrame, p_sub_df: pd.DataFrame, label: str, extra: Dict[str, Any]):
        mae = float(sub_df["absolute_error"].mean())
        rmse = float(np.sqrt(sub_df["squared_error"].mean()))
        bias = float(sub_df["error"].mean())
        p_mae = float(p_sub_df["absolute_error"].mean())
        skill = float(1.0 - mae / p_mae) if p_mae > 0 else 0.0
        ss_res = float(((sub_df["actual_wsi"] - sub_df["predicted_wsi"]) ** 2).sum())
        ss_tot = float(((sub_df["actual_wsi"] - sub_df["actual_wsi"].mean()) ** 2).sum())
        r2 = float(1.0 - ss_res / ss_tot) if ss_tot > 0 else 0.0
        dir_acc = float(sub_df["dir_correct"].mean() * 100.0)

        res = {
            "partition": label,
            "count": len(sub_df),
            "mae": round(mae, 4),
            "rmse": round(rmse, 4),
            "bias": round(bias, 4),
            "r2": round(r2, 4),
            "skill_vs_persistence": round(skill * 100.0, 2),
            "directional_accuracy_pct": round(dir_acc, 2),
        }
        res.update(extra)
        return res

    for m in models:
        m_df = pred_df[pred_df["model"] == m]
        p_df = pred_df[pred_df["model"] == "Persistence"]

        # 1. Overall (2011–2020)
        metrics_records.append(compute_reg_metrics(m_df, p_df, "Overall_2011_2020", {"model": m, "horizon": "Overall", "fold": "All"}))

        # 2. By Fold
        for f in folds_list:
            f_m = m_df[m_df["fold"] == f]
            f_p = p_df[p_df["fold"] == f]
            metrics_records.append(compute_reg_metrics(f_m, f_p, f, {"model": m, "horizon": "Overall", "fold": f}))

        # 3. By Horizon Overall
        for h in ["h1", "h2", "h3"]:
            h_m = m_df[m_df["horizon"] == h]
            h_p = p_df[p_df["horizon"] == h]
            metrics_records.append(compute_reg_metrics(h_m, h_p, f"Overall_{h}", {"model": m, "horizon": h, "fold": "All"}))

    metrics_df = pd.DataFrame(metrics_records)
    metrics_csv_path = os.path.join(output_dir, "continuous_metrics.csv")
    metrics_df.to_csv(metrics_csv_path, index=False)
    print(f"[OK] Saved continuous metrics to: {metrics_csv_path}")

    # =========================================================================
    # 5. COMPUTE SEVERE-STRESS EARLY-WARNING QUALITY (WSI >= 1.5)
    # =========================================================================
    print("\nComputing severe-stress (WSI >= 1.5) early-warning contingency metrics...")
    warning_records = []

    def compute_contingency(sub_df: pd.DataFrame, label: str, extra: Dict[str, Any]):
        n_total = len(sub_df)
        tp = int(((sub_df["severe_actual"] == True) & (sub_df["severe_pred"] == True)).sum())
        fp = int(((sub_df["severe_actual"] == False) & (sub_df["severe_pred"] == True)).sum())
        fn = int(((sub_df["severe_actual"] == True) & (sub_df["severe_pred"] == False)).sum())
        tn = int(((sub_df["severe_actual"] == False) & (sub_df["severe_pred"] == False)).sum())

        actual_events = tp + fn
        pred_alarms = tp + fp

        precision = (tp / pred_alarms) if pred_alarms > 0 else 0.0
        recall = (tp / actual_events) if actual_events > 0 else 0.0
        f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0
        csi = (tp / (tp + fp + fn)) if (tp + fp + fn) > 0 else 0.0
        far = (fp / pred_alarms) if pred_alarms > 0 else 0.0

        res = {
            "partition": label,
            "total_evaluations": n_total,
            "actual_severe_events": actual_events,
            "predicted_alarms": pred_alarms,
            "tp_hits": tp,
            "fp_false_alarms": fp,
            "fn_misses": fn,
            "tn_correct_rejections": tn,
            "precision": round(precision, 4),
            "recall_pod": round(recall, 4),
            "f1_score": round(f1, 4),
            "csi_threat_score": round(csi, 4),
            "false_alarm_ratio": round(far, 4),
        }
        res.update(extra)
        return res

    for m in models:
        m_df = pred_df[pred_df["model"] == m]

        # Overall
        warning_records.append(compute_contingency(m_df, "Overall_2011_2020", {"model": m, "horizon": "Overall", "fold": "All"}))

        # By Fold
        for f in folds_list:
            f_m = m_df[m_df["fold"] == f]
            warning_records.append(compute_contingency(f_m, f, {"model": m, "horizon": "Overall", "fold": f}))

        # By Horizon
        for h in ["h1", "h2", "h3"]:
            h_m = m_df[m_df["horizon"] == h]
            warning_records.append(compute_contingency(h_m, f"Overall_{h}", {"model": m, "horizon": h, "fold": "All"}))

    warning_df = pd.DataFrame(warning_records)
    warning_csv_path = os.path.join(output_dir, "early_warning_metrics.csv")
    warning_df.to_csv(warning_csv_path, index=False)
    print(f"[OK] Saved early warning contingency metrics to: {warning_csv_path}")

    # =========================================================================
    # 6. COMPUTE DISTRICT-WISE PERFORMANCE
    # =========================================================================
    district_records = []
    for dist in districts:
        for m in models:
            sub = pred_df[(pred_df["district"] == dist) & (pred_df["model"] == m)]
            p_sub = pred_df[(pred_df["district"] == dist) & (pred_df["model"] == "Persistence")]
            mae = float(sub["absolute_error"].mean())
            rmse = float(np.sqrt(sub["squared_error"].mean()))
            p_mae = float(p_sub["absolute_error"].mean())
            skill = float(1.0 - mae / p_mae) if p_mae > 0 else 0.0

            tp = int(((sub["severe_actual"] == True) & (sub["severe_pred"] == True)).sum())
            fp = int(((sub["severe_actual"] == False) & (sub["severe_pred"] == True)).sum())
            fn = int(((sub["severe_actual"] == True) & (sub["severe_pred"] == False)).sum())
            actual_events = tp + fn
            recall = (tp / actual_events) if actual_events > 0 else 0.0
            precision = (tp / (tp + fp)) if (tp + fp) > 0 else 0.0

            district_records.append({
                "district": dist,
                "model": m,
                "evaluations": len(sub),
                "mae": round(mae, 4),
                "rmse": round(rmse, 4),
                "skill_vs_persistence": round(skill * 100.0, 2),
                "actual_severe_events": actual_events,
                "tp_hits": tp,
                "fp_false_alarms": fp,
                "fn_misses": fn,
                "recall_pod": round(recall, 4),
                "precision": round(precision, 4),
            })

    dist_df = pd.DataFrame(district_records)
    dist_csv_path = os.path.join(output_dir, "district_metrics.csv")
    dist_df.to_csv(dist_csv_path, index=False)
    print(f"[OK] Saved district disaggregated metrics to: {dist_csv_path}")

    return {
        "pred_df": pred_df,
        "metrics_df": metrics_df,
        "warning_df": warning_df,
        "dist_df": dist_df,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--panel-path", default="outputs/Marathwada_MODEL_DATASET_2003_2024.csv")
    parser.add_argument("--output-dir", default="results/rolling_backtest_rigorous")
    args = parser.parse_args()

    run_rigorous_backtest(panel_csv=args.panel_path, output_dir=args.output_dir)
