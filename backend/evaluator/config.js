/**
 * RailTrack AI - Phase 6B Evaluator Configuration
 * Configurable polling parameters, persistence paths, and evaluation thresholds.
 */

const path = require('path');

module.exports = {
  // Collection Reality: Request-driven collection when user/API requests occur
  IS_AUTONOMOUS_POLLING: false,
  COLLECTION_MODE: "request_driven",

  // Conservative Quota (if autonomous polling is enabled in future)
  POLL_INTERVAL_MS: 300000,
  MAX_REQUESTS_PER_TRAIN_HOUR: 12,

  // Minimum Sample Size Thresholds
  MIN_REQUIRED_OBSERVATIONS: 10,

  // Data Persistence Directory & Files
  DATA_DIR: path.join(__dirname, '../data'),
  SNAPSHOTS_FILE: path.join(__dirname, '../data/forecast_snapshots.jsonl'),
  OUTCOMES_FILE: path.join(__dirname, '../data/actual_outcomes.jsonl'),
  MATCHED_FILE: path.join(__dirname, '../data/matched_evaluations.jsonl')
};
