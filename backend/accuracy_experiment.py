# Accuracy & Architecture Experiment Script (Phase Post-Research)
#
# Compares:
# 1. BASELINE 1: Scheduled arrival (delta = 0)
# 2. BASELINE 2: Scheduled arrival + current delay (delta = 0)
# 3. BASELINE 3: Historical segment mean delta
# 4. CONTROL MODEL: Current 16-feature XGBoost
# 5. TREATMENT 1: 16 features + historical_segment_delay_mean + historical_segment_delay_median
# 6. TREATMENT 2: Treatment 1 + accumulated_delay + delay_change

import os
import json
import math
import time
import pandas as pd
import numpy as np
import joblib
from xgboost import XGBRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error

def calculate_winkler_score(y_true, lower_bound, upper_bound, alpha=0.20):
    y_true = np.array(y_true)
    l = np.array(lower_bound)
    u = np.array(upper_bound)
    width = u - l
    under_penalty = (2.0 / alpha) * (l - y_true) * (y_true < l)
    over_penalty = (2.0 / alpha) * (y_true - u) * (y_true > u)
    winkler_scores = width + under_penalty + over_penalty
    return float(np.mean(winkler_scores))

# ==============================================================================
# 1. LOAD DATASET & PREPARE SEGMENTS
# ==============================================================================

csv_path = "backend/railway_ml_data.csv" if os.path.exists("backend/railway_ml_data.csv") else "railway_ml_data.csv"
df = pd.read_csv(csv_path)
df = df.sort_values(by=["train_number", "date", "sequence"]).reset_index(drop=True)

# Derive source station code for each row
df["source_station_code"] = df.groupby(["train_number", "date"])["station_code"].shift(1)
df["source_station_code"] = df["source_station_code"].fillna(df["station_code"])
df["segment_key"] = df["source_station_code"].astype(str) + "|" + df["station_code"].astype(str)

# Delta target calculation
df["prev_arr_delay"] = df.groupby(["train_number", "date"])["delay_arrival_minutes"].shift(1).fillna(0.0)
df["segment_delta"] = df["delay_arrival_minutes"] - df["prev_arr_delay"]

# Robust propagation features
origin_delays = df[df["is_origin"] == 1][["train_number", "date", "delay_arrival_minutes"]].rename(
    columns={"delay_arrival_minutes": "origin_delay"}
)
df = df.merge(origin_delays, on=["train_number", "date"], how="left")
df["origin_delay"] = df["origin_delay"].fillna(0.0)
df["accumulated_delay"] = df["delay_arrival_minutes"] - df["origin_delay"]
df["delay_change"] = df["delay_arrival_minutes"] - df["prev_arr_delay"]

# ==============================================================================
# 2. CHRONOLOGICAL FEATURE GENERATION (FAST DATE-DICTIONARY LOOKUP, LEAKAGE-SAFE)
# ==============================================================================

dates = sorted(df["date"].unique())
date_seg_stats = {}

for d in dates:
    # Strictly prior date records only (date < d)
    prior_df = df[(df["date"] < d) & (df["sequence"] > 1)]
    if len(prior_df) > 0:
        global_mean = float(prior_df["segment_delta"].mean())
        global_median = float(prior_df["segment_delta"].median())
        
        # Group by segment_key
        seg_groups = prior_df.groupby("segment_key")["segment_delta"]
        seg_means = seg_groups.mean().to_dict()
        seg_medians = seg_groups.median().to_dict()
        seg_counts = seg_groups.count().to_dict()
        
        date_seg_stats[d] = {
            "global_mean": global_mean,
            "global_median": global_median,
            "means": seg_means,
            "medians": seg_medians,
            "counts": seg_counts
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

for idx, row in df.iterrows():
    r_date = row["date"]
    seg_key = row["segment_key"]
    stats = date_seg_stats[r_date]
    
    if seg_key in stats["means"]:
        h_mean = stats["means"][seg_key]
        h_median = stats["medians"][seg_key]
        h_count = stats["counts"][seg_key]
    else:
        h_mean = stats["global_mean"]
        h_median = stats["global_median"]
        h_count = 0
        
    hist_means.append(h_mean)
    hist_medians.append(h_median)
    hist_counts.append(h_count)

df["historical_segment_delay_mean"] = hist_means
df["historical_segment_delay_median"] = hist_medians
df["historical_segment_observation_count"] = hist_counts

# ==============================================================================
# 3. FEATURE SET DEFINITIONS
# ==============================================================================

BASE_16_FEATURES = [
    'sequence', 'is_origin', 'is_destination', 'scheduled_hour',
    'scheduled_departure_hour', 'day_of_week',
    'dwell_time_scheduled_mins', 'inter_station_scheduled_mins',
    'platform_num', 'prev_delay_arrival', 'prev_delay_departure',
    'delay_trend', 'journey_max_delay_so_far', 'journey_avg_delay_so_far',
    'remaining_stations_count', 'remaining_scheduled_mins'
]

TREATMENT_1_FEATURES = BASE_16_FEATURES + [
    'historical_segment_delay_mean',
    'historical_segment_delay_median'
]

TREATMENT_2_FEATURES = TREATMENT_1_FEATURES + [
    'accumulated_delay',
    'delay_change'
]

# ==============================================================================
# 4. CHRONOLOGICAL DATA SPLITS
# ==============================================================================

train_df = df[df["date"].isin(["2024-01-15", "2024-01-16", "2024-01-17"]) & (df["is_origin"] == 0)].copy()
cal_df = df[df["date"] == "2024-01-18"].copy()
test_df = df[df["date"] == "2024-01-19"].copy()

print(f"Train samples (Jan 15-17): {len(train_df)}")
print(f"Cal samples   (Jan 18):    {len(cal_df)}")
print(f"Test samples  (Jan 19):    {len(test_df)}")

# Train Control (Base 16)
m_control = XGBRegressor(n_estimators=300, learning_rate=0.05, max_depth=6, subsample=0.8, colsample_bytree=0.8, objective="reg:squarederror", random_state=42)
m_control.fit(train_df[BASE_16_FEATURES], train_df["target_delay_delta"])

# Train Treatment 1 (16 + Hist Mean/Median)
m_t1 = XGBRegressor(n_estimators=300, learning_rate=0.05, max_depth=6, subsample=0.8, colsample_bytree=0.8, objective="reg:squarederror", random_state=42)
m_t1.fit(train_df[TREATMENT_1_FEATURES], train_df["target_delay_delta"])

# Train Treatment 2 (Treatment 1 + Robust Propagation)
m_t2 = XGBRegressor(n_estimators=300, learning_rate=0.05, max_depth=6, subsample=0.8, colsample_bytree=0.8, objective="reg:squarederror", random_state=42)
m_t2.fit(train_df[TREATMENT_2_FEATURES], train_df["target_delay_delta"])

# ==============================================================================
# 5. REPLAY EVALUATION FUNCTION FOR A GIVEN MODEL
# ==============================================================================

def run_replay(model, feature_list, eval_dates=["2024-01-19"], is_baseline_hist_mean=False):
    replay_rows = []
    
    for (train_num, date_str), group in df.groupby(['train_number', 'date']):
        if date_str not in eval_dates:
            continue
        group = group.sort_values('sequence').reset_index(drop=True)
        n_stations = len(group)
        if n_stations < 2:
            continue
            
        dest_row = group[group['is_destination'] == 1]
        if dest_row.empty:
            dest_row = group.iloc[[-1]]
        actual_dest_delay = float(dest_row.iloc[0]['delay_arrival_minutes'])
        dest_sched_mins = float(dest_row.iloc[0]['scheduled_arrival_minutes'])
        delays = group['delay_arrival_minutes'].values
        sched_mins_list = group['scheduled_arrival_minutes'].values
        
        for k in range(n_stations - 1):
            delays_so_far = list(delays[:k + 1])
            last_delay = float(delays[k])
            prev_last_delay = float(delays[k - 1]) if k > 0 else last_delay
            running_max = float(np.max(delays_so_far))
            running_sum = float(np.sum(delays_so_far))
            running_count = len(delays_so_far)
            origin_d = float(delays[0])
            
            for j in range(k + 1, n_stations):
                st_row = group.iloc[j]
                st_sched_mins = float(sched_mins_list[j])
                rem_stations = n_stations - 1 - j
                rem_sched_mins = dest_sched_mins - st_sched_mins
                if rem_sched_mins < 0:
                    rem_sched_mins += 1440
                rem_sched_mins = max(0, rem_sched_mins)
                
                delay_trend = last_delay - prev_last_delay
                max_delay_so_far = running_max
                avg_delay_so_far = running_sum / running_count
                accum_d = last_delay - origin_d
                d_change = delay_trend
                
                row_dict = {
                    "sequence": st_row["sequence"],
                    "is_origin": st_row["is_origin"],
                    "is_destination": st_row["is_destination"],
                    "scheduled_hour": st_row["scheduled_hour"],
                    "scheduled_departure_hour": st_row["scheduled_departure_hour"],
                    "day_of_week": st_row["day_of_week"],
                    "dwell_time_scheduled_mins": st_row["dwell_time_scheduled_mins"],
                    "inter_station_scheduled_mins": st_row["inter_station_scheduled_mins"],
                    "platform_num": st_row["platform_num"],
                    "prev_delay_arrival": last_delay,
                    "prev_delay_departure": last_delay,
                    "delay_trend": delay_trend,
                    "journey_max_delay_so_far": max_delay_so_far,
                    "journey_avg_delay_so_far": avg_delay_so_far,
                    "remaining_stations_count": rem_stations,
                    "remaining_scheduled_mins": rem_sched_mins,
                    "historical_segment_delay_mean": st_row["historical_segment_delay_mean"],
                    "historical_segment_delay_median": st_row["historical_segment_delay_median"],
                    "accumulated_delay": accum_d,
                    "delay_change": d_change
                }
                
                if is_baseline_hist_mean:
                    pred_delta = float(st_row["historical_segment_delay_mean"])
                else:
                    row_feat = pd.DataFrame([row_dict])
                    pred_delta = float(model.predict(row_feat[feature_list])[0])
                    
                next_d = last_delay + pred_delta
                prev_last_delay = last_delay
                last_delay = next_d
                running_max = max(running_max, next_d)
                running_sum += next_d
                running_count += 1
                
            horizon = (n_stations - 1) - k
            curr_delay = last_delay
            abs_err = abs(actual_dest_delay - curr_delay)
            signed_err = actual_dest_delay - curr_delay
            
            replay_rows.append({
                'train_number': train_num,
                'date': date_str,
                'k': k,
                'horizon': horizon,
                'start_delay': float(delays[k]),
                'pred_dest_delay': curr_delay,
                'actual_dest_delay': actual_dest_delay,
                'abs_err': abs_err,
                'signed_err': signed_err
            })
            
    return pd.DataFrame(replay_rows)

# ==============================================================================
# 6. RUN EVALUATION ACROSS ALL BASELINES & MODELS
# ==============================================================================

# Baseline 1: Scheduled Arrival (delta = 0, current_delay = 0)
base1_rows = []
for (train_num, date_str), group in df.groupby(['train_number', 'date']):
    if date_str != "2024-01-19": continue
    group = group.sort_values('sequence').reset_index(drop=True)
    dest_row = group[group['is_destination'] == 1]
    if dest_row.empty: dest_row = group.iloc[[-1]]
    actual_dest_delay = float(dest_row.iloc[0]['delay_arrival_minutes'])
    for k in range(len(group) - 1):
        horizon = (len(group) - 1) - k
        pred_dest_delay = 0.0
        base1_rows.append({'horizon': horizon, 'abs_err': abs(actual_dest_delay - pred_dest_delay), 'signed_err': actual_dest_delay - pred_dest_delay})
res_b1 = pd.DataFrame(base1_rows)

# Baseline 2: Scheduled Arrival + Current Delay (delta = 0)
base2_rows = []
for (train_num, date_str), group in df.groupby(['train_number', 'date']):
    if date_str != "2024-01-19": continue
    group = group.sort_values('sequence').reset_index(drop=True)
    dest_row = group[group['is_destination'] == 1]
    if dest_row.empty: dest_row = group.iloc[[-1]]
    actual_dest_delay = float(dest_row.iloc[0]['delay_arrival_minutes'])
    delays = group['delay_arrival_minutes'].values
    for k in range(len(group) - 1):
        horizon = (len(group) - 1) - k
        pred_dest_delay = float(delays[k])
        base2_rows.append({'horizon': horizon, 'abs_err': abs(actual_dest_delay - pred_dest_delay), 'signed_err': actual_dest_delay - pred_dest_delay})
res_b2 = pd.DataFrame(base2_rows)

# Baseline 3: Historical Segment Mean Delta
res_b3 = run_replay(None, [], eval_dates=["2024-01-19"], is_baseline_hist_mean=True)

# Control Model (Base 16 XGBoost)
res_control = run_replay(m_control, BASE_16_FEATURES, eval_dates=["2024-01-19"])

# Treatment 1 (16 Features + Hist Mean/Median)
res_t1 = run_replay(m_t1, TREATMENT_1_FEATURES, eval_dates=["2024-01-19"])

# Treatment 2 (Treatment 1 + Robust Propagation)
res_t2 = run_replay(m_t2, TREATMENT_2_FEATURES, eval_dates=["2024-01-19"])

def print_summary(name, res_df):
    mae = float(res_df['abs_err'].mean())
    rmse = float(np.sqrt((res_df['signed_err']**2).mean()))
    medae = float(res_df['abs_err'].median())
    bias = float(res_df['signed_err'].mean())
    h1 = res_df[res_df['horizon'] == 1]
    h1_mae = float(h1['abs_err'].mean()) if len(h1) > 0 else 0.0
    print(f"| {name:<42} | MAE: {mae:5.2f}m | RMSE: {rmse:5.2f}m | MedAE: {medae:5.2f}m | Bias: {bias:5.2f}m | H1 MAE: {h1_mae:5.2f}m |")
    return {"mae": mae, "rmse": rmse, "medae": medae, "bias": bias, "h1_mae": h1_mae}

print("\n" + "=" * 90)
print("ACCURACY EXPERIMENT EVALUATION SUMMARY (UNTOUCHED TEST SET: 2024-01-19)")
print("=" * 90)
s_b1 = print_summary("Baseline 1: Scheduled Arrival (No Delay)", res_b1)
s_b2 = print_summary("Baseline 2: Scheduled + Current Delay", res_b2)
s_b3 = print_summary("Baseline 3: Historical Segment Mean", res_b3)
s_ctrl = print_summary("Control Model: Base 16 XGBoost", res_control)
s_t1 = print_summary("Treatment 1: Base 16 + Hist Mean/Median", res_t1)
s_t2 = print_summary("Treatment 2: Treatment 1 + Propagation", res_t2)
print("=" * 90)

# Save artifact
stats_output = {
    "Baseline 1": s_b1,
    "Baseline 2": s_b2,
    "Baseline 3": s_b3,
    "Control Model": s_ctrl,
    "Treatment 1": s_t1,
    "Treatment 2": s_t2
}
with open("backend/accuracy_experiment_results.json", "w") as f:
    json.dump(stats_output, f, indent=2)
