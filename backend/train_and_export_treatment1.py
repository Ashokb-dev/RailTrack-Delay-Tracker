# Train & Export Treatment 1 Model and Historical Segment Stats Artifact

import os
import json
import pandas as pd
import numpy as np
import joblib
from xgboost import XGBRegressor

# 1. Load Dataset
csv_path = "backend/railway_ml_data.csv" if os.path.exists("backend/railway_ml_data.csv") else "railway_ml_data.csv"
df = pd.read_csv(csv_path)
df = df.sort_values(by=["train_number", "date", "sequence"]).reset_index(drop=True)

# Derive source station code and segment key
df["source_station_code"] = df.groupby(["train_number", "date"])["station_code"].shift(1)
df["source_station_code"] = df["source_station_code"].fillna(df["station_code"])
df["segment_key"] = df["source_station_code"].astype(str) + "|" + df["station_code"].astype(str)

# Delta target calculation
df["prev_arr_delay"] = df.groupby(["train_number", "date"])["delay_arrival_minutes"].shift(1).fillna(0.0)
df["target_delay_delta"] = df.groupby(["train_number", "date"])["delay_arrival_minutes"].shift(-1) - df["delay_arrival_minutes"]

# Clean last station of each journey where target_delay_delta is NaN
df_model = df.dropna(subset=["target_delay_delta"]).copy()

# 2. Build Historical Segment Stats Artifact (Using Jan 15-18 data prior to Jan 19 test set)
hist_data = df_model[df_model["date"] < "2024-01-19"].copy()
global_mean = float(hist_data["target_delay_delta"].mean())
global_median = float(hist_data["target_delay_delta"].median())

segment_stats = {}
for seg_key, group in hist_data.groupby("segment_key"):
    if len(group) > 0:
        segment_stats[seg_key] = {
            "mean": round(float(group["target_delay_delta"].mean()), 2),
            "median": round(float(group["target_delay_delta"].median()), 2),
            "count": int(len(group))
        }

stats_artifact = {
    "global_mean": round(global_mean, 2),
    "global_median": round(global_median, 2),
    "segment_count": len(segment_stats),
    "segments": segment_stats
}

with open("backend/historical_segment_stats.json", "w") as f:
    json.dump(stats_artifact, f, indent=2)

print(f"[SUCCESS] Generated historical_segment_stats.json with {len(segment_stats)} unique segment lookups.")

# 3. Add Leakage-Safe Historical Features to Training DataFrame
dates = sorted(df_model["date"].unique())
date_seg_stats = {}

for d in dates:
    prior_df = df_model[(df_model["date"] < d) & (df_model["sequence"] > 1)]
    if len(prior_df) > 0:
        g_mean = float(prior_df["target_delay_delta"].mean())
        g_median = float(prior_df["target_delay_delta"].median())
        s_groups = prior_df.groupby("segment_key")["target_delay_delta"]
        date_seg_stats[d] = {
            "global_mean": g_mean,
            "global_median": g_median,
            "means": s_groups.mean().to_dict(),
            "medians": s_groups.median().to_dict(),
            "counts": s_groups.count().to_dict()
        }
    else:
        date_seg_stats[d] = {
            "global_mean": 0.0,
            "global_median": 0.0,
            "means": {},
            "medians": {},
            "counts": {}
        }

hist_means = []
hist_medians = []
hist_counts = []

for idx, row in df_model.iterrows():
    r_date = row["date"]
    seg_key = row["segment_key"]
    st = date_seg_stats[r_date]
    
    if seg_key in st["means"]:
        h_mean = st["means"][seg_key]
        h_median = st["medians"][seg_key]
        h_count = st["counts"][seg_key]
    else:
        h_mean = st["global_mean"]
        h_median = st["global_median"]
        h_count = 0
        
    hist_means.append(h_mean)
    hist_medians.append(h_median)
    hist_counts.append(h_count)

df_model["historical_segment_delay_mean"] = hist_means
df_model["historical_segment_delay_median"] = hist_medians
df_model["historical_segment_observation_count"] = hist_counts

# 4. Feature List (Treatment 1: 18 Features)
FEATURES = [
    'sequence', 'is_origin', 'is_destination', 'scheduled_hour',
    'scheduled_departure_hour', 'day_of_week',
    'dwell_time_scheduled_mins', 'inter_station_scheduled_mins',
    'platform_num', 'prev_delay_arrival', 'prev_delay_departure',
    'delay_trend', 'journey_max_delay_so_far', 'journey_avg_delay_so_far',
    'remaining_stations_count', 'remaining_scheduled_mins',
    'historical_segment_delay_mean', 'historical_segment_delay_median'
]

train_df = df_model[df_model["date"].isin(["2024-01-15", "2024-01-16", "2024-01-17"])].copy()

model = XGBRegressor(
    n_estimators=300,
    learning_rate=0.05,
    max_depth=6,
    subsample=0.8,
    colsample_bytree=0.8,
    objective="reg:squarederror",
    random_state=42
)

model.fit(train_df[FEATURES], train_df["target_delay_delta"])

os.makedirs("backend/models", exist_ok=True)
joblib.dump(model, "backend/models/best_model_v1.pkl")
print("[SUCCESS] Saved Treatment 1 model to backend/models/best_model_v1.pkl")
