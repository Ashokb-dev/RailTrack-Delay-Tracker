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
    
    for station_idx, station_code in enumerate(route_stations):
        seq = station_idx + 1
        
        scheduled_hour = (base_hour + station_idx * 90 + np.random.randint(-30, 30)) % 24
        scheduled_minute = np.random.randint(0, 60)
        scheduled_time_minutes = scheduled_hour * 60 + scheduled_minute
        
        dwell_time = max(0, np.random.normal(3, 1.5))
        
        if station_idx == 0:
            inter_station_time = 0
        else:
            inter_station_time = max(5, np.random.normal(90, 20))
        
        platform_num = np.random.randint(1, 10)
        
        if station_idx == 0:
            current_delay = max(0, int(np.random.normal(5, 8)))
        else:
            recovery_factor = np.random.uniform(0.4, 0.8)
            delay_variation = np.random.normal(0, 5)
            current_delay = max(0, int(prev_delay * recovery_factor + delay_variation))
        
        delay_arrival_minutes = current_delay
        
        journey_max_delay = current_delay
        if station_idx == 0:
            journey_avg_delay = current_delay
        else:
            journey_avg_delay = int((journey_avg_delay * station_idx + current_delay) / (station_idx + 1))
        
        record = {
            'train_number': train_number,
            'date': train_date,
            'sequence': seq,
            'is_origin': 1 if station_idx == 0 else 0,
            'is_destination': 1 if station_idx == n_stops - 1 else 0,
            'station_code': station_code,
            'station_name': f'{station_code} Station',
            'scheduled_arrival_minutes': scheduled_time_minutes,
            'scheduled_departure_minutes': scheduled_time_minutes + dwell_time,
            'dwell_time_scheduled_mins': dwell_time,
            'inter_station_scheduled_mins': inter_station_time if station_idx > 0 else 0,
            'platform_num': platform_num,
            'day_of_week': day_of_week,
            'scheduled_hour': scheduled_hour,
            'scheduled_departure_hour': (scheduled_hour + int(dwell_time // 60)) % 24,
            'delay_arrival_minutes': delay_arrival_minutes,
            'prev_delay_arrival': current_delay if station_idx > 0 else 0,
            'prev_delay_departure': current_delay if station_idx > 0 else 0,
            'delay_trend': current_delay,
            'journey_max_delay_so_far': journey_max_delay,
            'journey_avg_delay_so_far': journey_avg_delay,
        }
        records.append(record)
        prev_delay = current_delay

df = pd.DataFrame(records)

df = df.sort_values(['train_number', 'date', 'sequence'])
df['next_delay'] = df.groupby(['train_number', 'date'])['delay_arrival_minutes'].shift(-1)
df['target_delay_delta'] = df['next_delay'] - df['delay_arrival_minutes']

df = df.dropna(subset=['target_delay_delta'])

output_path = 'railway_ml_data.csv'
df.to_csv(output_path, index=False)
print(f"Synthetic dataset saved to {output_path}. Total rows: {len(df)}")