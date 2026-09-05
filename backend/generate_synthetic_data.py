import pandas as pd
import numpy as np

np.random.seed(42)

n_trains = 200
stations_per_train = np.random.randint(5, 15, size=n_trains)
total_stations = sum(stations_per_train)

records = []
dates_list = ['2024-01-15', '2024-01-16', '2024-01-17', '2024-01-18', '2024-01-19']

for train_idx in range(n_trains):
    train_number = 10000 + train_idx
    n_stops = stations_per_train[train_idx]
    
    city_codes = ['PUNE', 'MUMBAI', 'NGP', 'BPL', 'AK', 'AMI', 'BSL', 'JP', 'MAS', 'HDP']
    np.random.shuffle(city_codes)
    route_stations = city_codes[:n_stops]
    
    train_date = dates_list[train_idx % 5]
    from datetime import datetime
    date_obj = datetime.strptime(train_date, '%Y-%m-%d')
    day_of_week = date_obj.weekday()
    
    base_hour = np.random.randint(6, 22)
    prev_delay = 0
    
    # Pre-generate scheduled times and delays for entire journey
    journey_delays = []
    scheduled_times_mins = []
    dwell_times = []
    inter_times = []
    platforms = []
    scheduled_hours = []
    
    curr_d = 0
    for station_idx in range(n_stops):
        sh = (base_hour + station_idx * 90 + np.random.randint(-30, 30)) % 24
        sm = np.random.randint(0, 60)
        st_mins = sh * 60 + sm
        scheduled_hours.append(sh)
        scheduled_times_mins.append(st_mins)
        
        dt = max(0, np.random.normal(3, 1.5))
        dwell_times.append(dt)
        
        if station_idx == 0:
            it = 0
            curr_d = max(0, int(np.random.normal(5, 8)))
        else:
            it = max(5, np.random.normal(90, 20))
            recovery_factor = np.random.uniform(0.4, 0.8)
            delay_variation = np.random.normal(0, 5)
            curr_d = max(0, int(prev_delay * recovery_factor + delay_variation))
            
        inter_times.append(it)
        platforms.append(np.random.randint(1, 10))
        journey_delays.append(curr_d)
        prev_delay = curr_d
        
    dest_sched_mins = scheduled_times_mins[-1]
    
    for station_idx, station_code in enumerate(route_stations):
        seq = station_idx + 1
        current_delay = journey_delays[station_idx]
        st_mins = scheduled_times_mins[station_idx]
        
        # Remaining journey features
        remaining_stations_count = n_stops - 1 - station_idx
        rem_sched_mins = dest_sched_mins - st_mins
        if rem_sched_mins < 0:
            rem_sched_mins += 1440
        remaining_scheduled_mins = max(0, rem_sched_mins)
        
        # Dynamic delay trend & aggregates up to station_idx - 1 (prior state)
        if station_idx == 0:
            delay_trend = 0
            journey_max_delay_so_far = current_delay
            journey_avg_delay_so_far = current_delay
            prev_delay_arr = 0
            prev_delay_dep = 0
        else:
            prev_delay_arr = journey_delays[station_idx - 1]
            prev_delay_dep = journey_delays[station_idx - 1]
            
            if station_idx == 1:
                delay_trend = journey_delays[0]
            else:
                delay_trend = journey_delays[station_idx - 1] - journey_delays[station_idx - 2]
                
            prior_delays = journey_delays[:station_idx]
            journey_max_delay_so_far = int(np.max(prior_delays))
            journey_avg_delay_so_far = int(np.mean(prior_delays))
        
        record = {
            'train_number': train_number,
            'date': train_date,
            'sequence': seq,
            'is_origin': 1 if station_idx == 0 else 0,
            'is_destination': 1 if station_idx == n_stops - 1 else 0,
            'station_code': station_code,
            'station_name': f'{station_code} Station',
            'scheduled_arrival_minutes': st_mins,
            'scheduled_departure_minutes': st_mins + dwell_times[station_idx],
            'dwell_time_scheduled_mins': dwell_times[station_idx],
            'inter_station_scheduled_mins': inter_times[station_idx],
            'platform_num': platforms[station_idx],
            'day_of_week': day_of_week,
            'scheduled_hour': scheduled_hours[station_idx],
            'scheduled_departure_hour': (scheduled_hours[station_idx] + int(dwell_times[station_idx] // 60)) % 24,
            'delay_arrival_minutes': current_delay,
            'prev_delay_arrival': prev_delay_arr,
            'prev_delay_departure': prev_delay_dep,
            'delay_trend': delay_trend,
            'journey_max_delay_so_far': journey_max_delay_so_far,
            'journey_avg_delay_so_far': journey_avg_delay_so_far,
            'remaining_stations_count': remaining_stations_count,
            'remaining_scheduled_mins': remaining_scheduled_mins
        }
        records.append(record)

df = pd.DataFrame(records)

df = df.sort_values(['train_number', 'date', 'sequence'])
df['next_delay'] = df.groupby(['train_number', 'date'])['delay_arrival_minutes'].shift(-1)
df['target_delay_delta'] = df['next_delay'] - df['delay_arrival_minutes']

df = df.dropna(subset=['target_delay_delta'])

output_path = 'railway_ml_data.csv'
df.to_csv(output_path, index=False)
print(f"Phase-2 synthetic dataset saved to {output_path}. Total rows: {len(df)}")