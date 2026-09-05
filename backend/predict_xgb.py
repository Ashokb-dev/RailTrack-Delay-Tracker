import sys
import json
import os
import joblib
import pandas as pd
import numpy as np

# ======================================
# LOAD MODEL
# ======================================

model = joblib.load(
    "models/best_model_v1.pkl"
)

# ======================================
# LOAD JSON FILE
# ======================================

input_file = sys.argv[1]

with open(input_file, "r") as f:

    data = json.load(f)

stations = data["stations"]

predictions = []

all_deltas = []

destination_eta = None

# ======================================
# HELPER
# ======================================

def minutes_to_time(minutes):

    hours = int(minutes // 60) % 24

    mins = int(minutes % 60)

    return f"{hours:02}:{mins:02}"

# ======================================
# START
# ======================================

n_stations = len(stations)
last_st_sched = stations[-1].get("scheduled_time", "00:00") if stations else "00:00"
try:
    l_parts = last_st_sched.split(":")
    dest_scheduled_mins = int(l_parts[0]) * 60 + int(l_parts[1])
except Exception:
    dest_scheduled_mins = 0

delays_so_far = []
last_delay = 0.0
prev_last_delay = 0.0

for index, station in enumerate(stations):

    scheduled_time = station.get(
        "scheduled_time",
        "00:00"
    )

    if not scheduled_time or ":" not in scheduled_time or "--" in scheduled_time:
        scheduled_time = "00:00"

    try:
        parts = scheduled_time.split(":")
        hh, mm = int(parts[0]), int(parts[1])
    except Exception:
        hh, mm = 0, 0
        scheduled_time = "00:00"

    st_mins = hh * 60 + mm

    # Remaining journey features
    remaining_stations_count = n_stations - 1 - index
    rem_sched_mins = dest_scheduled_mins - st_mins
    if rem_sched_mins < 0:
        rem_sched_mins += 1440
    remaining_scheduled_mins = max(0, rem_sched_mins)

    # ======================================
    # REAL STATIONS
    # ======================================

    if station["actual_delay"] is not None:

        current_delay = float(
            station["actual_delay"]
        )

        actual_minutes = (
            hh * 60
            + mm
            + current_delay
        )

        delays_so_far.append(current_delay)
        prev_last_delay = last_delay
        last_delay = current_delay
        delay_trend = last_delay - prev_last_delay
        journey_max_delay_so_far = float(np.max(delays_so_far))
        journey_avg_delay_so_far = float(np.mean(delays_so_far))

        # ======================================
        # FEATURES
        # ======================================

        features = pd.DataFrame([{

            "sequence":
                station["sequence"],

            "is_origin":
                station["is_origin"],

            "is_destination":
                station["is_destination"],

            "scheduled_hour":
                station["scheduled_hour"],

            "scheduled_departure_hour":
                station[
                    "scheduled_departure_hour"
                ],

            "day_of_week":
                data["day_of_week"],

            "dwell_time_scheduled_mins":
                station[
                    "dwell_time_scheduled_mins"
                ],

            "inter_station_scheduled_mins":
                station[
                    "inter_station_scheduled_mins"
                ],

            "platform_num":
                station["platform_num"],

            "prev_delay_arrival":
                current_delay,

            "prev_delay_departure":
                current_delay,

            "delay_trend":
                delay_trend,

            "journey_max_delay_so_far":
                journey_max_delay_so_far,

            "journey_avg_delay_so_far":
                journey_avg_delay_so_far,

            "remaining_stations_count":
                remaining_stations_count,

            "remaining_scheduled_mins":
                remaining_scheduled_mins

        }])

        # ======================================
        # PREDICT DELTA
        # ======================================

        predicted_delta = float(

            model.predict(
                features
            )[0]

        )

        all_deltas.append(
            abs(predicted_delta)
        )

        predicted_delay = (
            current_delay
            + predicted_delta
        )

        predicted_minutes = (
            hh * 60
            + mm
            + predicted_delay
        )

        if index == len(stations) - 1:
            dest_scheduled_mins = hh * 60 + mm
            destination_eta = {
                "station":
                    station["station"],
                "stationName":
                    station.get("stationName", station["station"]),
                "predicted_time":
                    minutes_to_time(
                        predicted_minutes
                    ),
                "delay":
                    float(
                        round(
                            predicted_delay,
                            2
                        )
                    )
            }

        predictions.append({

            "station":
                station["station"],

            "stationName":
                station.get("stationName", station["station"]),

            "scheduled_time":
                scheduled_time,

            "actual_time":
                minutes_to_time(
                    actual_minutes
                ),

            "predicted_time":
                minutes_to_time(
                    predicted_minutes
                ),

            "delay":
                float(
                    round(
                        current_delay,
                        2
                    )
                ),

            "predicted_delay":
                float(
                    round(
                        predicted_delay,
                        2
                    )
                ),

            "delta":
                float(
                    round(
                        predicted_delta,
                        2
                    )
                ),

            "type":
                "real"

        })

        continue

    # ======================================
    # FUTURE STATIONS
    # ======================================

    delay_trend = last_delay - prev_last_delay
    journey_max_delay_so_far = float(np.max(delays_so_far)) if delays_so_far else last_delay
    journey_avg_delay_so_far = float(np.mean(delays_so_far)) if delays_so_far else last_delay

    features = pd.DataFrame([{

        "sequence":
            station["sequence"],

        "is_origin":
            station["is_origin"],

        "is_destination":
            station["is_destination"],

        "scheduled_hour":
            station["scheduled_hour"],

        "scheduled_departure_hour":
            station[
                "scheduled_departure_hour"
            ],

        "day_of_week":
            data["day_of_week"],

        "dwell_time_scheduled_mins":
            station[
                "dwell_time_scheduled_mins"
            ],

        "inter_station_scheduled_mins":
            station[
                "inter_station_scheduled_mins"
            ],

        "platform_num":
            station["platform_num"],

        "prev_delay_arrival":
            last_delay,

        "prev_delay_departure":
            last_delay,

        "delay_trend":
            delay_trend,

        "journey_max_delay_so_far":
            journey_max_delay_so_far,

        "journey_avg_delay_so_far":
            journey_avg_delay_so_far,

        "remaining_stations_count":
            remaining_stations_count,

        "remaining_scheduled_mins":
            remaining_scheduled_mins

    }])

    # ======================================
    # PREDICT DELTA
    # ======================================

    predicted_delta = float(

        model.predict(
            features
        )[0]

    )

    all_deltas.append(
        abs(predicted_delta)
    )

    # ======================================
    # NEXT DELAY
    # ======================================

    next_delay = float(

        last_delay
        + predicted_delta

    )

    prev_last_delay = last_delay
    last_delay = next_delay
    delays_so_far.append(next_delay)

    # ======================================
    # PREDICTED TIME
    # ======================================

    predicted_minutes = (
        hh * 60
        + mm
        + next_delay
    )

    # ======================================
    # DESTINATION ETA
    # ======================================

    if index == len(stations) - 1:
        dest_scheduled_mins = hh * 60 + mm

        destination_eta = {

            "station":
                station["station"],

            "stationName":
                station.get("stationName", station["station"]),

            "predicted_time":
                minutes_to_time(
                    predicted_minutes
                ),

            "delay":
                float(
                    round(
                        next_delay,
                        2
                    )
                )

        }

    predictions.append({

        "station":
            station["station"],

        "stationName":
            station.get("stationName", station["station"]),

        "scheduled_time":
            scheduled_time,

        "actual_time":
            None,

        "predicted_time":
            minutes_to_time(
                predicted_minutes
            ),

        "delay":
            float(
                round(
                    next_delay,
                    2
                )
            ),

        "delta":
            float(
                round(
                    predicted_delta,
                    2
                )
            ),

        "type":
            "predicted"

    })



# ======================================
# CONFORMAL CALIBRATED FORECAST
# ======================================

cal_path = os.path.join(os.path.dirname(__file__), "calibration_params.json")
if not os.path.exists(cal_path):
    cal_path = "calibration_params.json"

cal_data = None
if os.path.exists(cal_path):
    try:
        with open(cal_path, "r") as f:
            cal_data = json.load(f)
    except Exception:
        cal_data = None

if destination_eta and cal_data and cal_data.get("calibrated"):
    exp_delay = float(destination_eta["delay"])
    future_count = sum(1 for p in predictions if p.get("type") == "predicted")
    horizon_key = str(max(1, future_count))
    
    horiz_quantiles = cal_data.get("horizon_quantiles", {})
    global_q = float(cal_data.get("global_quantile", 5.06))
    q = float(horiz_quantiles.get(horizon_key, global_q))
    
    lower_delay = max(0.0, round(exp_delay - q, 2))
    upper_delay = round(exp_delay + q, 2)
    
    ds_mins = dest_scheduled_mins if 'dest_scheduled_mins' in locals() else 0
    earliest_arrival = minutes_to_time(ds_mins + lower_delay)
    expected_arrival = destination_eta["predicted_time"]
    latest_arrival = minutes_to_time(ds_mins + upper_delay)

    # Next station H1 conformal forecast
    next_pred = next((p for p in predictions if p.get("type") == "predicted"), None)
    next_forecast = None
    if next_pred:
        h1_q = float(horiz_quantiles.get("1", 4.76))
        next_exp_delay = float(next_pred.get("delay", 0.0))
        next_lower = max(0.0, round(next_exp_delay - h1_q, 2))
        next_upper = round(next_exp_delay + h1_q, 2)
        n_sched = next_pred.get("scheduled_time", "00:00")
        try:
            n_parts = n_sched.split(":")
            n_mins = int(n_parts[0]) * 60 + int(n_parts[1])
        except Exception:
            n_mins = 0
        next_earliest = minutes_to_time(n_mins + next_lower)
        next_latest = minutes_to_time(n_mins + next_upper)
        next_forecast = {
            "station": next_pred.get("station"),
            "stationName": next_pred.get("stationName"),
            "scheduledArrival": n_sched,
            "expectedArrival": next_pred.get("predicted_time"),
            "expectedDelayMinutes": round(next_exp_delay, 2),
            "lowerDelayMinutes": round(next_lower, 2),
            "upperDelayMinutes": round(next_upper, 2),
            "earliestLikelyArrival": next_earliest,
            "latestLikelyArrival": next_latest,
            "horizon": 1,
            "quantile": h1_q
        }
    
    forecast = {
        "expectedDelayMinutes": round(exp_delay, 2),
        "lowerDelayMinutes": round(lower_delay, 2),
        "upperDelayMinutes": round(upper_delay, 2),
        "expectedArrival": expected_arrival,
        "earliestLikelyArrival": earliest_arrival,
        "latestLikelyArrival": latest_arrival,
        "intervalLevel": float(cal_data.get("intervalLevel", 0.8)),
        "calibrated": True,
        "method": str(cal_data.get("method", "conformal_residuals")),
        "nextStationForecast": next_forecast
    }
else:
    exp_delay = float(destination_eta["delay"]) if destination_eta else 0.0
    expected_arrival = destination_eta["predicted_time"] if destination_eta else "--:--"
    forecast = {
        "expectedDelayMinutes": round(exp_delay, 2),
        "lowerDelayMinutes": None,
        "upperDelayMinutes": None,
        "expectedArrival": expected_arrival,
        "earliestLikelyArrival": None,
        "latestLikelyArrival": None,
        "intervalLevel": 0.8,
        "calibrated": False,
        "method": "uncalibrated",
        "nextStationForecast": None
    }

# ======================================
# FINAL RESPONSE
# ======================================

output = {

    "service_status":
        data.get("service_status"),

    "telemetry":
        data.get("telemetry"),

    "current_location":
        data.get("current_location"),

    "next_halt":
        data.get("next_halt"),

    "previous_halt":
        data.get("previous_halt"),

    "live_delay_minutes":
        data.get("live_delay_minutes"),

    "destination_eta":
        destination_eta,

    "forecast":
        forecast,

    "predictions":
        predictions

}

# ======================================
# OUTPUT
# ======================================

print(
    json.dumps(output)
)