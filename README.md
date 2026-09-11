# 🚆 RailTrack AI — Railway Delay Prediction

> 🏆 **Winner — Internal Hackathon (2-Round Competition)**

A full-stack Indian Railway live train tracking and future-station delay prediction application powered by a trained XGBoost machine learning model.

---

## Overview

RailTrack AI tracks live train movements across Indian Railway stations and predicts arrival delay deltas at upcoming stations on a train's route. It combines live telemetry from the RailRadar API with an XGBoost regression model trained on historical train movement records.

---

## Key Features

- **Live Train Tracking**: Consumes real-time station arrival and departure telemetry via the RailRadar API.
- **AI Delay Prediction**: Predicts delay deltas at future stations using an XGBoost gradient boosting model.
- **Conformal Calibration**: Computes prediction confidence bounds for uncertainty estimation.
- **Station-by-Station Timeline**: Displays scheduled, actual, and predicted arrival/departure times.
- **Delay Trend Chart**: Visualizes delay propagation across the route using Recharts.
- **Destination ETA**: Computes estimated final destination arrival times based on current delay context.

---

## Architecture

```
┌─────────────────────────┐       ┌──────────────────────────────┐       ┌──────────────────────┐
│     React Frontend      │──────▶│      Express.js Backend      │──────▶│    RailRadar API     │
│   (Vite + Tailwind)     │◀──────│     (Node.js / port 5000)    │       │     (Live Data)      │
└─────────────────────────┘       └──────────────┬───────────────┘       └──────────────────────┘
                                                 │
                                                 ▼
                                      ┌──────────────────────┐
                                      │   Python ML Engine   │
                                      │   (predict_xgb.py)   │
                                      │   best_model_v1.pkl  │
                                      └──────────────────────┘
```

---

## Machine Learning Model Details

| Parameter | Specification / Metric |
|-----------|------------------------|
| **Algorithm** | XGBoost Regressor |
| **Training Dataset** | ~22,000 historical station movement events |
| **Mean Absolute Error (MAE)** | 5.34 min |
| **Root Mean Squared Error (RMSE)** | 9.00 min |
| **R² Score** | 0.76 |

- **Target Variable**: Delay delta at downstream station (minutes added/recovered).
- **Features Used**: `prev_delay_arrival`, `sequence`, `scheduled_hour`, `inter_station_scheduled_mins`, `dwell_time_scheduled_mins`, `day_of_week`, `platform_num`.

---

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Recharts, Lucide Icons
- **Backend**: Node.js, Express.js
- **Machine Learning**: Python 3.10+, XGBoost, Scikit-Learn, Pandas, Joblib
- **External API**: RailRadar API

---

## Getting Started

### Prerequisites

- Node.js ≥ 20.x
- Python ≥ 3.10
- Python packages: `xgboost`, `scikit-learn`, `pandas`, `joblib`

### 1. Repository Setup

```bash
git clone https://github.com/Ashokb-dev/RailTrack-Delay-Tracker.git
cd RailTrack-Delay-Tracker
```

### 2. Backend Setup

```bash
cd backend
npm install

# Set up environment variables
cp env.example .env
# Edit .env and set PORT and RAILRADAR_API_KEY

# Install Python ML dependencies
pip install xgboost scikit-learn pandas joblib

# Ensure trained model file exists at backend/models/best_model_v1.pkl

npm start
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install

# Optional: set custom VITE_API_URL in .env
cp env.example .env

npm run dev
```

Application runs at `http://localhost:5173`.

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/search-trains` | Finds active trains for an origin and destination pair |
| `POST` | `/predict-future-stations` | Returns live telemetry merged with XGBoost delay predictions |
| `GET` | `/search-stations?query=` | Auto-suggests station names by search query |

---

## Author

**Ashok K.**  
B.Tech Information Science and Engineering — National Institute of Engineering, Mysore  
Contact: [AshokB8910@gmail.com](mailto:AshokB8910@gmail.com)  
GitHub: [Ashokb-dev](https://github.com/Ashokb-dev)
