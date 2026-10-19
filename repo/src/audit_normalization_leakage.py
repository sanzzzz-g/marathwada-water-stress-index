"""
Audit Normalization & Climatological Leakage:
Compares the precomputed 2003-2017 calibrated features against
strictly causal historical features computed using data strictly up to fold_train_end.
"""

import os
import pandas as pd
import numpy as np

def audit_normalization_leakage(
    master_csv: str = "outputs/Marathwada_MASTER_AUDIT_DATASET_2003_2024.csv",
    output_dir: str = "results/rolling_backtest_audit_v2",
):
    os.makedirs(output_dir, exist_ok=True)
    df = pd.read_csv(master_csv)
    df["date"] = pd.to_datetime(df["date"])
    
    # Analyze Fold 1 (train end: 2010-12-01) and Fold 2 (train end: 2013-12-01)
    results = []
    
    folds = [
        ("Fold_1", pd.Timestamp("2010-12-01")),
        ("Fold_2", pd.Timestamp("2013-12-01")),
        ("Fold_3", pd.Timestamp("2016-12-01")),
    ]
    
    # Feature mappings: raw column -> precomputed standardized column
    # Soil: soil_water_storage_mm -> soil_stress_z
    # NDVI: ndvi -> ndvi_stress_z
    # LST: lst_celsius -> lst_stress_z
    # Surface water: surface_water_frequency -> surface_water_stress_z
    # Groundwater: groundwater_as_of_depth_m_bgl -> groundwater_stress_z
    
    for fold_name, cutoff in folds:
        hist_df = df[df["date"] <= cutoff].copy()
        
        # 1. Soil Moisture
        # Causal climatology (district-month mean on hist_df)
        soil_clim = hist_df.groupby(["district", "month"])["soil_water_storage_mm"].mean().to_dict()
        df[f"soil_clim_{fold_name}"] = [soil_clim.get((r["district"], int(r["month"])), np.nan) for _, r in df.iterrows()]
        df[f"soil_anom_{fold_name}"] = df["soil_water_storage_mm"] - df[f"soil_clim_{fold_name}"]
        hist_soil_std = df[df["date"] <= cutoff].groupby("district")[f"soil_anom_{fold_name}"].std(ddof=0).to_dict()
        df[f"soil_z_causal_{fold_name}"] = [
            -df.loc[idx, f"soil_anom_{fold_name}"] / hist_soil_std.get(r["district"], 1.0)
            for idx, r in df.iterrows()
        ]
        
        # 2. NDVI
        ndvi_clim = hist_df.groupby(["district", "month"])["ndvi"].mean().to_dict()
        df[f"ndvi_clim_{fold_name}"] = [ndvi_clim.get((r["district"], int(r["month"])), np.nan) for _, r in df.iterrows()]
        df[f"ndvi_anom_{fold_name}"] = df["ndvi"] - df[f"ndvi_clim_{fold_name}"]
        hist_ndvi_std = df[df["date"] <= cutoff].groupby("district")[f"ndvi_anom_{fold_name}"].std(ddof=0).to_dict()
        df[f"ndvi_z_causal_{fold_name}"] = [
            -df.loc[idx, f"ndvi_anom_{fold_name}"] / hist_ndvi_std.get(r["district"], 1.0)
            for idx, r in df.iterrows()
        ]
        
        # Compare causal feature with benchmark precomputed feature on the fold's evaluation period
        if fold_name == "Fold_1":
            eval_mask = (df["date"] >= "2011-01-01") & (df["date"] <= "2013-12-01")
        elif fold_name == "Fold_2":
            eval_mask = (df["date"] >= "2014-01-01") & (df["date"] <= "2016-12-01")
        else:
            eval_mask = (df["date"] >= "2017-01-01") & (df["date"] <= "2020-12-01")
            
        eval_df = df[eval_mask]
        
        # Pearson correlations and Mean Absolute Differences
        soil_corr = float(np.corrcoef(eval_df[f"soil_z_causal_{fold_name}"], eval_df["soil_stress_z"])[0, 1])
        soil_mad = float((eval_df[f"soil_z_causal_{fold_name}"] - eval_df["soil_stress_z"]).abs().mean())
        
        ndvi_corr = float(np.corrcoef(eval_df[f"ndvi_z_causal_{fold_name}"], eval_df["ndvi_stress_z"])[0, 1])
        ndvi_mad = float((eval_df[f"ndvi_z_causal_{fold_name}"] - eval_df["ndvi_stress_z"]).abs().mean())
        
        results.append({
            "fold": fold_name,
            "training_cutoff": cutoff.strftime("%Y-%m-%d"),
            "eval_period": f"{eval_df['date'].min().strftime('%Y-%m')} to {eval_df['date'].max().strftime('%Y-%m')}",
            "eval_observations": len(eval_df),
            "soil_z_correlation": round(soil_corr, 4),
            "soil_z_mean_abs_diff": round(soil_mad, 4),
            "ndvi_z_correlation": round(ndvi_corr, 4),
            "ndvi_z_mean_abs_diff": round(ndvi_mad, 4),
        })
        
    res_df = pd.DataFrame(results)
    res_df.to_csv(os.path.join(output_dir, "normalization_leakage_audit.csv"), index=False)
    print("--- NORMALIZATION LEAKAGE AUDIT RESULTS ---")
    print(res_df.to_string(index=False))
    return res_df

if __name__ == "__main__":
    audit_normalization_leakage()
