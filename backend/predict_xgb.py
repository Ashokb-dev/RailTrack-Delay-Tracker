import sys
import json
import os
import joblib
import pandas as pd

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

current_delay = 0

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
                current_delay,

            "journey_max_delay_so_far":
                current_delay,

            "journey_avg_delay_so_far":
                current_delay

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
            current_delay,

        "journey_max_delay_so_far":
            current_delay,

        "journey_avg_delay_so_far":
            current_delay

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

        current_delay
        + predicted_delta

    )

    current_delay = next_delay

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
# CONFIDENCE
# ======================================

avg_delta = sum(all_deltas) / len(all_deltas)

confidence = max(

    50,

    min(
        95,
        100 - avg_delta
    )

)

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
    global_q = float(cal_data.get("global_quantile", 6.52))
    q = float(horiz_quantiles.get(horizon_key, global_q))
    
    lower_delay = max(0.0, round(exp_delay - q, 2))
    upper_delay = round(exp_delay + q, 2)
    
    ds_mins = dest_scheduled_mins if 'dest_scheduled_mins' in locals() else 0
    earliest_arrival = minutes_to_time(ds_mins + lower_delay)
    expected_arrival = destination_eta["predicted_time"]
    latest_arrival = minutes_to_time(ds_mins + upper_delay)
    
    forecast = {
        "expectedDelayMinutes": round(exp_delay, 2),
        "lowerDelayMinutes": round(lower_delay, 2),
        "upperDelayMinutes": round(upper_delay, 2),
        "expectedArrival": expected_arrival,
        "earliestLikelyArrival": earliest_arrival,
        "latestLikelyArrival": latest_arrival,
        "intervalLevel": float(cal_data.get("intervalLevel", 0.8)),
        "calibrated": True,
        "method": str(cal_data.get("method", "conformal_residuals"))
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
        "method": "uncalibrated"
    }

# ======================================
# FINAL RESPONSE
# ======================================

output = {

    "confidence":
        round(confidence, 2),

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