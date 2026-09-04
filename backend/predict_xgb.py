import sys
import json
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

            "actual_hour":
                station["actual_hour"],

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

        "actual_hour":
            station["actual_hour"],

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

    "predictions":
        predictions

}

# ======================================
# OUTPUT
# ======================================

print(
    json.dumps(output)
)