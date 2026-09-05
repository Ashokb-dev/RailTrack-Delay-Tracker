/**
 * Phase 6 Outcome Matcher
 * Records actual arrival outcomes when stations are passed and matches them to original forecast snapshots.
 */

const fs = require('fs');
const path = require('path');
const config = require('./config');

function appendJsonl(filePath, record) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(filePath, JSON.stringify(record) + '\n');
  } catch (err) {
    console.error("Evaluation outcome log write error:", err.message);
  }
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.split('\n').filter(line => line.trim()).map(line => JSON.parse(line));
  } catch (err) {
    return [];
  }
}

function recordActualOutcomes(stations = [], trainInfo = {}) {
  const trainNumber = Number(trainInfo.trainNumber || 0);
  const journeyDate = String(trainInfo.journeyDate || new Date().toISOString().split('T')[0]);
  const nowTs = new Date().toISOString();
  const nowMs = Date.now();

  const outcomes = [];
  const existingOutcomes = readJsonl(config.OUTCOMES_FILE);

  for (const st of stations) {
    const isObserved = st.actual_delay !== null && st.actual_delay !== undefined;
    if (!isObserved) continue;

    const targetStation = st.station;
    const targetSequence = st.sequence;
    const actualArrivalDelay = Number(st.actual_delay);
    const actualTime = st.actual_time || "--:--";

    const isDuplicate = existingOutcomes.some(o => 
      o.trainNumber === trainNumber &&
      o.journeyDate === journeyDate &&
      o.targetStation === targetStation &&
      o.targetSequence === targetSequence
    );

    if (!isDuplicate) {
      const outcome = {
        outcomeId: `out_${nowMs}_${trainNumber}_${targetStation}`,
        trainNumber,
        journeyDate,
        targetStation,
        targetSequence,
        actualTime,
        actualArrivalDelay,
        outcomeTimestamp: nowTs
      };
      appendJsonl(config.OUTCOMES_FILE, outcome);
      outcomes.push(outcome);
    }
  }

  return outcomes;
}

function calculateWinklerScore(earliestDelay, latestDelay, actualDelay, alpha = 0.2) {
  if (typeof earliestDelay !== "number" || typeof latestDelay !== "number" || typeof actualDelay !== "number") {
    return null;
  }
  const width = latestDelay - earliestDelay;
  if (actualDelay < earliestDelay) {
    return width + (2.0 / alpha) * (earliestDelay - actualDelay);
  } else if (actualDelay > latestDelay) {
    return width + (2.0 / alpha) * (actualDelay - latestDelay);
  } else {
    return width;
  }
}

function matchForecastsAndOutcomes(snapshots, outcomes) {
  const matched = [];

  for (const snap of snapshots) {
    if (snap.serviceStatus === "cancelled" || snap.serviceStatus === "diverted") {
      continue; // Exclude cancelled/diverted from accuracy metrics
    }

    // Find matching outcome
    const outcome = outcomes.find(o => 
      o.trainNumber === snap.trainNumber &&
      o.journeyDate === snap.journeyDate &&
      o.targetStation === snap.targetStation &&
      new Date(o.outcomeTimestamp).getTime() > new Date(snap.predictionTimestamp).getTime()
    );

    if (outcome) {
      const actualDelay = outcome.actualArrivalDelay;
      const expectedDelay = snap.expectedDelay;
      const earliestDelay = snap.earliestDelay;
      const latestDelay = snap.latestDelay;

      const error = actualDelay - expectedDelay;
      const absoluteError = Math.abs(error);
      const squaredError = error * error;

      const isCovered = (typeof earliestDelay === "number" && typeof latestDelay === "number")
        ? (actualDelay >= earliestDelay && actualDelay <= latestDelay)
        : null;

      const intervalWidth = (typeof earliestDelay === "number" && typeof latestDelay === "number")
        ? latestDelay - earliestDelay
        : null;

      const winklerScore = calculateWinklerScore(earliestDelay, latestDelay, actualDelay);

      matched.push({
        predictionId: snap.predictionId,
        trainNumber: snap.trainNumber,
        journeyDate: snap.journeyDate,
        predictionTimestamp: snap.predictionTimestamp,
        outcomeTimestamp: outcome.outcomeTimestamp,
        targetStation: snap.targetStation,
        horizon: snap.horizon,
        isDestination: snap.isDestination,
        telemetryStatus: snap.telemetryStatus,
        expectedDelay,
        actualArrivalDelay: actualDelay,
        earliestDelay,
        latestDelay,
        error,
        absoluteError,
        squaredError,
        isCovered,
        intervalWidth,
        winklerScore
      });
    }
  }

  return matched;
}

module.exports = {
  recordActualOutcomes,
  matchForecastsAndOutcomes,
  calculateWinklerScore
};
