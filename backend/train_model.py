import pandas as pd
import joblib
import os
from sklearn.metrics import mean_absolute_error, r2_score, mean_squared_error
from xgboost import XGBRegressor

# Load dataset
csv_path = 'railway_ml_data.csv'
if not os.path.exists(csv_path):
    csv_path = 'backend/railway_ml_data.csv'

df = pd.read_csv(csv_path)
print('Full dataset shape:', df.shape)

# Sort journeys chronologically
df = df.sort_values(by=['date', 'train_number', 'sequence'])

# 16 Features (Phase 2: clean 14 + remaining_stations_count + remaining_scheduled_mins)
FEATURES = [
    'sequence', 'is_origin', 'is_destination', 'scheduled_hour',
    'scheduled_departure_hour', 'day_of_week',
    'dwell_time_scheduled_mins', 'inter_station_scheduled_mins',
    'platform_num', 'prev_delay_arrival', 'prev_delay_departure',
    'delay_trend', 'journey_max_delay_so_far', 'journey_avg_delay_so_far',
    'remaining_stations_count', 'remaining_scheduled_mins'
]
TARGET = 'target_delay_delta'

# Chronological Journey-Level Split by Date
train_dates = ['2024-01-15', '2024-01-16', '2024-01-17']
cal_dates = ['2024-01-18']
test_dates = ['2024-01-19']

train_df = df[df['date'].isin(train_dates)].copy()
cal_df = df[df['date'].isin(cal_dates)].copy()
test_df = df[df['date'].isin(test_dates)].copy()

print(f"\nChronological Journey-Level Split (Phase 2):")
print(f"  Train Dates ({', '.join(train_dates)}): {len(train_df)} station rows across {train_df[['train_number', 'date']].drop_duplicates().shape[0]} journeys")
print(f"  Calibration Dates ({', '.join(cal_dates)}): {len(cal_df)} station rows across {cal_df[['train_number', 'date']].drop_duplicates().shape[0]} journeys")
print(f"  Test Dates ({', '.join(test_dates)}): {len(test_df)} station rows across {test_df[['train_number', 'date']].drop_duplicates().shape[0]} journeys")

X_train, y_train = train_df[FEATURES], train_df[TARGET]
X_test, y_test = test_df[FEATURES], test_df[TARGET]

# Train model strictly on chronological Train Set
model = XGBRegressor(
    n_estimators=300,
    learning_rate=0.05,
    max_depth=6,
    subsample=0.8,
    colsample_bytree=0.8,
    objective='reg:squarederror',
    random_state=42
)
model.fit(X_train, y_train)

# Evaluate 1-step delta prediction on held-out Test Set (Forward Test)
test_preds = model.predict(X_test)
mae = mean_absolute_error(y_test, test_preds)
rmse = mean_squared_error(y_test, test_preds) ** 0.5
r2 = r2_score(y_test, test_preds)

print(f'\nForward-Test 1-Step Delta Prediction Metrics (Jan 19 Test Set):')
print(f'  MAE:  {mae:.2f} min')
print(f'  RMSE: {rmse:.2f} min')
print(f'  R2:   {r2:.4f}')

# Feature importance
importance = pd.DataFrame({'Feature': FEATURES, 'Importance': model.feature_importances_})
importance = importance.sort_values(by='Importance', ascending=False)
print('\nFeature Importance (Phase 2):')
print(importance.to_string(index=False))

# Save model artifact
os.makedirs('models', exist_ok=True)
joblib.dump(model, 'models/best_model_v1.pkl')
joblib.dump(model, 'best_model_v1.pkl')
if os.path.exists('backend'):
    os.makedirs('backend/models', exist_ok=True)
    joblib.dump(model, 'backend/models/best_model_v1.pkl')
    joblib.dump(model, 'backend/best_model_v1.pkl')

print('\nModel successfully saved to models/best_model_v1.pkl')