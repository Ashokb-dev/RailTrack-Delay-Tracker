/**
 * RailTrack AI - Phase 6 Evaluator Configuration
 * Configurable polling parameters, persistence paths, and evaluation thresholds.
 */

const path = require('path');

module.exports = {
  POLL_INTERVAL_MS: 300000,
  MAX_REQUESTS_PER_TRAIN_HOUR: 12,
  DEDUPLICATION_WINDOW_MS: 120000,
  MIN_REQUIRED_OBSERVATIONS: 10,
  DATA_DIR: path.join(__dirname, '../data'),
  SNAPSHOTS_FILE: path.join(__dirname, '../data/forecast_snapshots.jsonl'),
  OUTCOMES_FILE: path.join(__dirname, '../data/actual_outcomes.jsonl'),
  MATCHED_FILE: path.join(__dirname, '../data/matched_evaluations.jsonl')
};
