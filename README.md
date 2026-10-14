# MARATHWADA WSI INTELLIGENCE
**Hydroclimatic Water Stress Monitoring, Forecasting & Simulation Platform**

A research web platform for the Marathwada region of Maharashtra, India (8 districts: Chhatrapati Sambhajinagar, Jalna, Beed, Dharashiv, Latur, Nanded, Parbhani, Hingoli) covering historical environmental records from 2003 through 2024.

---

## 1. System Architecture

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Recharts, Leaflet (EPSG:4326 GeoJSON Choropleth), Lucide React, Zod.
- **Backend**: Python FastAPI with Pydantic request/response schemas, scikit-learn, and XGBoost; Express dev server proxy with typed API client (`src/services/apiClient.ts`).
- **Research Repository**: [https://github.com/sanzzzz-g/marathwada-drought-wsi](https://github.com/sanzzzz-g/marathwada-drought-wsi)
  - `Marathwada_FINAL_MODEL_DATASET_2003_2024.csv`
  - `Marathwada_FINAL_AUDIT_DATASET_2003_2024_CORRECTED.csv`

---

## 2. Six Hydroclimatic WSI Components

1. **Rainfall Stress**: Normalized precipitation deficit relative to 30-year climatological normal (CHIRPS/IMD).
2. **Soil-Moisture Stress**: Root-zone volumetric soil moisture depletion across 0–100cm (ECMWF ERA5-Land).
3. **NDVI Vegetation Stress**: Inverted Vegetation Condition Index (VCI) from MODIS Terra/Aqua 250m.
4. **Land-Surface Temperature (LST) Stress**: Thermal anomaly positive deviation (MODIS 1km daytime).
5. **Groundwater Stress**: Depth to water table drop from GSDA and CGWB monitoring borewells.
6. **Surface-Water Stress**: Live reservoir storage deficit across major dams (Jayakwadi, Majalgaon, Yeldari, Manjara).

### Weighting Formulations
- **W0 (Equal Indicator Weights, Primary)**: $1/6$ for each of the six components.
- **W1 (Equal Domain Weights, Sensitivity)**: Rainfall 0.25, Soil 0.0833, NDVI 0.0833, LST 0.0833, Groundwater 0.25, Surface Water 0.25.

### Stress Severity Thresholds
- **Low / Normal**: $\text{WSI} < 0.50$
- **Moderate Stress**: $0.50 \le \text{WSI} < 1.50$
- **Severe Stress**: $\text{WSI} \ge 1.50$

---

## 3. Pre-Specified Model Suite & Residual Formulation

The core machine learning models predict the residual stress change delta:
$$\text{residual}(h) = \text{WSI}(t+h) - \text{WSI}(t)$$
$$\text{forecast}(h) = \text{WSI}(t) + \widehat{\text{residual}}(h)$$

Models benchmarked across horizons $h \in \{1, 2, 3\}$ months ahead:
- **M0**: Seasonal climatology
- **M1**: Persistence baseline ($\text{Skill\_MAE} = 0.000$)
- **M2**: Seasonal persistence
- **M3**: WSI autoregression using Ridge ($L_2$)
- **M4**: Direct multivariate Ridge
- **M5**: Residual Ridge (**Recommended candidate**, $+30.1\%$ Skill over persistence at H=1)
- **M6**: Residual XGBoost
- **REF**: Historical LSTM reference

### Temporal Split Structure
- **Training Targets**: Jan 2004 – Dec 2017 ($1,328$ sequences, origins Dec 2003 – Sep 2017)
- **Validation Targets**: Jan 2018 – Dec 2020 ($272$ sequences, origins Dec 2017 – Sep 2020)
- **Test Targets**: Jan 2021 – Dec 2024 ($368$ sequences, origins Dec 2020 – Sep 2024)
- **Boundary Exclusions**: Oct–Nov 2017 and Oct–Nov 2020 excluded to eliminate cross-boundary target window contamination.

---

## 4. Feature Readiness & Operational Status Audit

| Feature | Operational Status | Description |
| :--- | :--- | :--- |
| **8-District Historical Records (2003–2024)** | **Fully Functional** | 2,112 verified district-months with 0 missing observations. |
| **Interactive Leaflet Choropleth Map** | **Fully Functional** | Boundary polygons for all 8 districts with tooltips and metric switcher. |
| **District Operational Forecasts (H1..H3)** | **Fully Functional** | 3-month forward outlook with calibrated 90% prediction intervals. |
| **Model Laboratory & Diagnostics** | **Fully Functional** | Scored metrics, actual vs predicted scatter, and feature weights for M0–M6. |
| **Zod CSV Schema Validator** | **Fully Functional** | Client-side validation, duplicate detection, and missingness audit. |
| **Raw GitHub Dataset Synchronizer** | **Fully Functional** | Direct fetch from repository with branch/commit SHA selector. |
| **Independent Scarcity Tanker Validation** | **Fully Functional** | Official Maharashtra tanker deployment records with POD, FAR, and CSI. |
| **Scenario Simulator Sandbox** | **Simulated Sandbox** | Mode A (Index sensitivity) and Mode B (Forecast response surface). |
| **FastAPI REST Contract** | **Fully Functional** | Documented Pydantic schemas and endpoints in `backend/`. |

---

## 5. Local Setup and Commands

### Web Application (React / Vite)
```bash
# Install dependencies
npm install

# Run automated scientific invariant tests
npx tsx runTests.ts

# Start development server
npm run dev

# Build production bundle
npm run build
```

### Python FastAPI Backend
```bash
# Set up virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install requirements
pip install -r backend/requirements.txt

# Start FastAPI server
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 6. License & Data Citation

- Boundary geometry: Survey of India / GADM v4.1 administrative level-2 boundaries under Open Government Data (OGD) License - India.
- Environmental datasets: CHIRPS, ECMWF ERA5-Land, NASA MODIS, CGWB/GSDA, CWC.
- Research Code & UI: MIT / CC-BY-4.0.
