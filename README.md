# 🚆 RailTrack AI — Railway Delay Prediction

> 🏆 **Winner — Smart India Internal Hackathon 2026 (2-Round Competition)**

A full-stack Indian Railway live train tracking and future-station delay prediction application powered by a trained XGBoost machine learning model.

## 🚀 Live Application

**Live Website:**  
https://rail-track-ai-dynamic-delay-predict.vercel.app/

**Backend API:**  
https://railtrack-ai-dynamic-delay-predictor.onrender.com

The frontend is deployed on **Vercel**, while the Express.js backend and Python/XGBoost prediction engine are deployed on **Render**.

---

## Overview

RailTrack AI tracks live train movements across Indian Railway stations and predicts how delay will evolve across the remaining journey.

It combines:

- Live train telemetry from the **RailRadar API**
- Historical train movement data
- A trained **XGBoost regression model**
- Python-based prediction inference
- Delay uncertainty estimation through conformal calibration

The system uses the train's **current live state** together with learned historical delay patterns to forecast delay at upcoming stations and estimate the destination arrival time.

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

### Production Architecture

```text
┌──────────────────────────────┐
│       User / Browser         │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│     Vercel Frontend          │
│   React + Vite + Tailwind    │
└──────────────┬───────────────┘
               │ HTTPS API
               ▼
┌──────────────────────────────┐
│      Render Backend          │
│      Node.js + Express       │
└──────────────┬───────────────┘
               │
       ┌───────┴────────┐
       ▼                ▼
┌──────────────┐  ┌──────────────────────┐
│ RailRadar API│  │  Python ML Engine    │
│  Live Data   │  │  predict_xgb.py      │
└──────────────┘  │  XGBoost Model       │
                  │ best_model_v1.pkl     │
                  └──────────────────────┘
