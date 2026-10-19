import os
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np

def generate_figures(results_dir: str = "results/rolling_backtest_rigorous"):
    figs_dir = os.path.join(results_dir, "figures")
    os.makedirs(figs_dir, exist_ok=True)

    cont_df = pd.read_csv(os.path.join(results_dir, "continuous_metrics.csv"))
    warn_df = pd.read_csv(os.path.join(results_dir, "early_warning_metrics.csv"))
    dist_df = pd.read_csv(os.path.join(results_dir, "district_metrics.csv"))

    # Style
    plt.style.use("seaborn-v0_8-whitegrid" if "seaborn-v0_8-whitegrid" in plt.style.available else "default")
    colors = ["#2b5c8f", "#d95f02", "#7570b3", "#e7298a", "#66a61e", "#e6ab02"]

    # 1. MAE by Model and Regime Fold
    fig, ax = plt.subplots(figsize=(10, 6))
    fold_df = cont_df[cont_df["horizon"] == "Overall"]
    models = ["Persistence", "WSI_Autoregression", "Residual_LSTM", "XGBoost", "Ridge_Regression", "Seasonal_Persistence"]
    folds = ["Fold_1_Pre_Drought", "Fold_2_Drought_Peak", "Fold_3_Recovery", "All"]
    fold_labels = ["2011-2013 (Pre-Drought)", "2014-2016 (Drought Peak)", "2017-2020 (Recovery)", "Overall 2011-2020"]

    x = np.arange(len(folds))
    width = 0.13

    for i, m in enumerate(models):
        sub = fold_df[fold_df["model"] == m]
        vals = []
        for f in folds:
            row = sub[sub["fold"] == f]
            vals.append(row["mae"].values[0] if len(row) > 0 else 0)
        ax.bar(x + (i - 2.5) * width, vals, width, label=m.replace("_", " "), color=colors[i % len(colors)])

    ax.set_ylabel("Mean Absolute Error (MAE)", fontsize=11, fontweight="bold")
    ax.set_title("Forecast Accuracy (MAE) Across Hydroclimatic Regimes", fontsize=13, fontweight="bold")
    ax.set_xticks(x)
    ax.set_xticklabels(fold_labels, fontsize=10)
    ax.set_ylim(0, 1.25)
    ax.legend(frameon=True, loc="upper right")
    plt.tight_layout()
    fig_path1 = os.path.join(figs_dir, "mae_by_regime.png")
    plt.savefig(fig_path1, dpi=300)
    plt.close()

    # 2. Horizon Degradation (H+1, H+2, H+3)
    fig, ax = plt.subplots(figsize=(9, 5))
    h_df = cont_df[cont_df["fold"] == "All"]
    horizons = ["h1", "h2", "h3"]
    h_labels = ["H+1 (Next Month)", "H+2 (2 Months Ahead)", "H+3 (3 Months Ahead)"]

    for i, m in enumerate(models[:5]): # exclude seasonal persistence for scale
        sub = h_df[h_df["model"] == m]
        vals = [sub[sub["horizon"] == h]["mae"].values[0] for h in horizons]
        ax.plot(h_labels, vals, marker="o", linewidth=2.2, label=m.replace("_", " "), color=colors[i])

    ax.set_ylabel("MAE", fontsize=11, fontweight="bold")
    ax.set_title("Forecast Error Progression by Lead Horizon (2011–2020)", fontsize=13, fontweight="bold")
    ax.legend(frameon=True)
    plt.tight_layout()
    fig_path2 = os.path.join(figs_dir, "mae_by_horizon.png")
    plt.savefig(fig_path2, dpi=300)
    plt.close()

    # 3. Severe Stress Early Warning Quality (WSI >= 1.5)
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 5))
    overall_warn = warn_df[(warn_df["partition"] == "Overall_2011_2020") & (warn_df["model"].isin(models[:5]))]

    m_names = [m.replace("_", "\n") for m in overall_warn["model"]]
    ax1.bar(m_names, overall_warn["recall_pod"], color="#e7298a", alpha=0.85, label="Recall / POD")
    ax1.plot(m_names, overall_warn["precision"], color="#2b5c8f", marker="s", linewidth=2.5, label="Precision")
    ax1.set_ylabel("Score (0.0 to 1.0)", fontsize=11, fontweight="bold")
    ax1.set_title("Severe Stress (WSI >= 1.5) Detection Skill", fontsize=12, fontweight="bold")
    ax1.set_ylim(0, 1.05)
    ax1.legend(frameon=True)

    ax2.bar(m_names, overall_warn["csi_threat_score"], color="#7570b3", alpha=0.85, label="Critical Success Index (CSI)")
    ax2.set_ylabel("CSI Score", fontsize=11, fontweight="bold")
    ax2.set_title("Critical Success Index (CSI / Threat Score)", fontsize=12, fontweight="bold")
    ax2.set_ylim(0, 0.45)
    ax2.legend(frameon=True)

    plt.tight_layout()
    fig_path3 = os.path.join(figs_dir, "early_warning_contingency.png")
    plt.savefig(fig_path3, dpi=300)
    plt.close()

    print(f"[OK] Successfully saved all figures to: {figs_dir}")

if __name__ == "__main__":
    generate_figures()
