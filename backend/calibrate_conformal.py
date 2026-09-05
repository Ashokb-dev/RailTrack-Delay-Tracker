import os
import json
import math
import time
import pandas as pd
import numpy as np
import joblib

def calculate_winkler_score(y_true, lower_bound, upper_bound, alpha=0.20):
    """
    Calculates the Winkler Score for interval forecasts.
    W(y, l, u) = (u - l) + (2/alpha)*(l - y)*I(y < l) + (2/alpha)*(y - u)*I(y > u)
    Penalty multiplier (2 / 0.20) = 10.
    """
    y_true = np.array(y_true)
    l = np.array(lower_bound)
    u = np.array(upper_bound)
    
    width = u - l
    under_penalty = (2.0 / alpha) * (l - y_true) * (y_true < l)
    over_penalty = (2.0 / alpha) * (y_true - u) * (y_true > u)
    
    winkler_scores = width + under_penalty + over_penalty
    return float(np.mean(winkler_scores))

def run_calibration(
    csv_path="railway_ml_data.csv",
    model_path="models/best_model_v1.pkl",
    output_params_path="calibration_params.json",
    alpha=0.20
):
    print("=" * 70)
    print("RAILTRACK AI - CONFORMAL RESIDUAL CALIBRATION ENGINE (PHASE 2)")
    print("Strict Chronological Train / Calibration / Evaluation Split")
    print("Dynamic Recursive Features + Remaining Journey Features")
    print("=" * 70)
    
    if not os.path.exists(csv_path):
        if os.path.exists("backend/railway_ml_data.csv"):
            csv_path = "backend/railway_ml_data.csv"
        else:
            raise FileNotFoundError(f"Source dataset not found at {csv_path}")
            
    if not os.path.exists(model_path):
        if os.path.exists("backend/models/best_model_v1.pkl"):
            model_path = "backend/models/best_model_v1.pkl"
        elif os.path.exists("best_model_v1.pkl"):
            model_path = "best_model_v1.pkl"
        else:
            raise FileNotFoundError(f"Point model not found at {model_path}")
        
    df = pd.read_csv(csv_path)
    model = joblib.load(model_path)
    
    print(f"Dataset loaded: {len(df)} rows across {df['train_number'].nunique()} trains.")
    
    # 16 Features (Phase 2)
    FEATURES = [
        'sequence', 'is_origin', 'is_destination', 'scheduled_hour',
        'scheduled_departure_hour', 'day_of_week',
        'dwell_time_scheduled_mins', 'inter_station_scheduled_mins',
        'platform_num', 'prev_delay_arrival', 'prev_delay_departure',
        'delay_trend', 'journey_max_delay_so_far', 'journey_avg_delay_so_far',
        'remaining_stations_count', 'remaining_scheduled_mins'
    ]
    
    cal_dates = ['2024-01-18']
    test_dates = ['2024-01-19']
    
    print(f"Calibration Period: {cal_dates[0]}")
    print(f"Evaluation Period:  {test_dates[0]}")
    
    # Execute Historical Replay with Dynamic Recursive Features
    print("\nExecuting historical recursive prediction replay with Phase-2 dynamic features...")
    t0 = time.time()
    replay_rows = []
    
    for (train_num, date_str), group in df.groupby(['train_number', 'date']):
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
        
        is_cal = date_str in cal_dates
        is_test = date_str in test_dates
        
        if not (is_cal or is_test):
            continue
        
        for k in range(n_stations - 1):
            # Dynamic state tracking initialized from observed history up to k
            delays_so_far = list(delays[:k + 1])
            last_delay = float(delays[k])
            prev_last_delay = float(delays[k - 1]) if k > 0 else last_delay
            running_max = float(np.max(delays_so_far))
            running_sum = float(np.sum(delays_so_far))
            running_count = len(delays_so_far)
            
            # Predict step-by-step target destination delay
            for j in range(k + 1, n_stations):
                st_row = group.iloc[j]
                st_sched_mins = float(sched_mins_list[j])
                
                # Remaining journey features
                rem_stations = n_stations - 1 - j
                rem_sched_mins = dest_sched_mins - st_sched_mins
                if rem_sched_mins < 0:
                    rem_sched_mins += 1440
                rem_sched_mins = max(0, rem_sched_mins)
                
                # Dynamic delay features
                delay_trend = last_delay - prev_last_delay
                max_delay_so_far = running_max
                avg_delay_so_far = running_sum / running_count
                
                row_feat = pd.DataFrame([{
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
                    "remaining_scheduled_mins": rem_sched_mins
                }])
                
                pred_delta = float(model.predict(row_feat[FEATURES])[0])
                next_d = last_delay + pred_delta
                
                # Update dynamic state for next step
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
                'is_cal': is_cal,
                'is_test': is_test,
                'k': k,
                'horizon': horizon,
                'start_delay': float(delays[k]),
                'pred_dest_delay': curr_delay,
                'actual_dest_delay': actual_dest_delay,
                'abs_err': abs_err,
                'signed_err': signed_err
            })

    rdf = pd.DataFrame(replay_rows)
    cal_df = rdf[rdf['is_cal'] == True].copy()
    test_df = rdf[rdf['is_test'] == True].copy()
    
    print(f"Replay complete in {time.time()-t0:.2f}s.")
    print(f"Calibration observations (2024-01-18): {len(cal_df)}")
    print(f"Evaluation observations  (2024-01-19): {len(test_df)}")
    
    # Finite-Sample Conformal Calibration on Calibration Journeys
    target_coverage = 1.0 - alpha
    
    # Global Quantile
    n_global = len(cal_df)
    scores_global = np.sort(cal_df['abs_err'].values)
    rank_global = math.ceil((n_global + 1) * target_coverage) - 1
    q_global = float(scores_global[min(rank_global, n_global - 1)])
    
    # Horizon Quantiles
    horizon_quantiles = {}
    horizon_stats = {}
    
    for h, hgroup in cal_df.groupby('horizon'):
        nh = len(hgroup)
        if nh >= 15:
            hscores = np.sort(hgroup['abs_err'].values)
            rank_h = math.ceil((nh + 1) * target_coverage) - 1
            hq = float(hscores[min(rank_h, nh - 1)])
            horizon_quantiles[str(h)] = round(hq, 2)
            horizon_stats[int(h)] = (hq, nh)
        else:
            horizon_quantiles[str(h)] = round(q_global, 2)
            horizon_stats[int(h)] = (q_global, nh)
            
    # Evaluation strictly on Held-Out Test Journeys (2024-01-19)
    test_df['q_horizon'] = test_df['horizon'].map(lambda h: horizon_quantiles.get(str(h), q_global))
    test_df['lower_bound'] = test_df['pred_dest_delay'].map(lambda p: max(0.0, p)) - test_df['q_horizon']
    test_df['upper_bound'] = test_df['pred_dest_delay'] + test_df['q_horizon']
    
    test_df['covered'] = (test_df['actual_dest_delay'] >= test_df['lower_bound']) & (test_df['actual_dest_delay'] <= test_df['upper_bound'])
    test_df['width'] = test_df['upper_bound'] - test_df['lower_bound']
    
    overall_mae = float(test_df['abs_err'].mean())
    overall_rmse = float(np.sqrt((test_df['signed_err']**2).mean()))
    overall_median_ae = float(test_df['abs_err'].median())
    overall_cov = float(test_df['covered'].mean() * 100.0)
    overall_width = float(test_df['width'].mean())
    overall_winkler = calculate_winkler_score(
        test_df['actual_dest_delay'],
        test_df['lower_bound'],
        test_df['upper_bound'],
        alpha=alpha
    )
    
    print("\n" + "=" * 70)
    print("HELD-OUT EVALUATION METRICS (Phase 2 Test Set: 2024-01-19, Target: 80.0%)")
    print("=" * 70)
    print(f"  Calibration Period: {cal_dates[0]}")
    print(f"  Evaluation Period:  {test_dates[0]}")
    print(f"  Calibration Samples: {n_global} observations (40 journeys)")
    print(f"  Evaluation Samples:  {len(test_df)} observations (40 journeys)")
    print(f"  Global Conformal Q_0.80: {q_global:.2f} minutes")
    print(f"  Test Set MAE:        {overall_mae:.2f} minutes")
    print(f"  Test Set RMSE:       {overall_rmse:.2f} minutes")
    print(f"  Test Set Median AE:  {overall_median_ae:.2f} minutes")
    print(f"  Empirical Coverage:  {overall_cov:.2f}%")
    print(f"  Mean Interval Width: {overall_width:.2f} minutes")
    print(f"  Mean Winkler Score:  {overall_winkler:.2f}")
    print("-" * 70)
    print("Horizon Breakdown on Held-Out Test Set:")
    
    horizon_eval_summary = {}
    for h, hg in test_df.groupby('horizon'):
        hq = horizon_quantiles.get(str(h), q_global)
        nh = horizon_stats.get(int(h), (q_global, 0))[1]
        h_mae = float(hg['abs_err'].mean())
        h_rmse = float(np.sqrt((hg['signed_err']**2).mean()))
        h_median_ae = float(hg['abs_err'].median())
        h_cov = float(hg['covered'].mean() * 100.0)
        h_width = float(hg['width'].mean())
        h_winkler = calculate_winkler_score(
            hg['actual_dest_delay'],
            hg['lower_bound'],
            hg['upper_bound'],
            alpha=alpha
        )
        
        print(f"  Horizon {h:2d} | Cal N={nh:3d} | Q={hq:5.2f}m | Test N={len(hg):3d} | MAE={h_mae:4.2f}m | RMSE={h_rmse:4.2f}m | MedAE={h_median_ae:4.2f}m | Coverage={h_cov:5.1f}% | Width={h_width:5.2f}m | Winkler={h_winkler:5.2f}")
        
        horizon_eval_summary[str(h)] = {
            "cal_samples": nh,
            "quantile": round(hq, 2),
            "test_samples": len(hg),
            "mae": round(h_mae, 2),
            "rmse": round(h_rmse, 2),
            "median_ae": round(h_median_ae, 2),
            "empirical_coverage": round(h_cov, 2),
            "mean_width": round(h_width, 2),
            "winkler_score": round(h_winkler, 2)
        }

    # H1 results specifically
    h1_df = test_df[test_df['horizon'] == 1]
    h1_metrics = {
        "mae": round(float(h1_df['abs_err'].mean()), 2) if not h1_df.empty else 0.0,
        "rmse": round(float(np.sqrt((h1_df['signed_err']**2).mean())), 2) if not h1_df.empty else 0.0,
        "median_ae": round(float(h1_df['abs_err'].median()), 2) if not h1_df.empty else 0.0,
        "coverage": round(float(h1_df['covered'].mean() * 100.0), 2) if not h1_df.empty else 0.0,
        "width": round(float(h1_df['width'].mean()), 2) if not h1_df.empty else 0.0,
        "winkler": round(calculate_winkler_score(h1_df['actual_dest_delay'], h1_df['lower_bound'], h1_df['upper_bound']), 2) if not h1_df.empty else 0.0
    }

    # Save Calibration Artifact
    params_artifact = {
        "calibrated": True,
        "method": "conformal_residuals",
        "phase": 2,
        "intervalLevel": target_coverage,
        "sample_count": n_global,
        "train_period": "2024-01-15 to 2024-01-17 (120 journeys)",
        "calibration_period": "2024-01-18 (40 journeys)",
        "evaluation_period": "2024-01-19 (40 journeys)",
        "global_quantile": round(q_global, 2),
        "horizon_quantiles": horizon_quantiles,
        "metrics": {
            "train_journeys": 120,
            "cal_journeys": 40,
            "test_journeys": 40,
            "cal_samples": n_global,
            "test_samples": len(test_df),
            "mae": round(overall_mae, 2),
            "rmse": round(overall_rmse, 2),
            "median_ae": round(overall_median_ae, 2),
            "empirical_coverage": round(overall_cov, 2),
            "mean_interval_width": round(overall_width, 2),
            "winkler_score": round(overall_winkler, 2),
            "h1_metrics": h1_metrics,
            "horizon_breakdown": horizon_eval_summary
        }
    }
    
    with open(output_params_path, "w") as f:
        json.dump(params_artifact, f, indent=2)
        
    if os.path.exists("backend"):
        with open("backend/" + output_params_path, "w") as f:
            json.dump(params_artifact, f, indent=2)
        
    print("\n[SUCCESS] Phase-2 calibration parameters exported successfully to:", output_params_path)
    print("=" * 70)
    return params_artifact

if __name__ == "__main__":
    run_calibration()
