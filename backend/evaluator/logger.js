/**
 * Phase 6 Forecast Snapshot Logger
 * Records forecast observations (Next Stop & Destination) without data leakage or fake confidence.
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
    console.error("Evaluation log write error:", err.message);
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

function recordForecastSnapshot(backendResponse, trainInfo = {}, routeInfo = {}) {
  if (!backendResponse || backendResponse.service_status?.forecastAvailable === false) {
    return [];
  }

  const trainNumber = Number(trainInfo.trainNumber || backendResponse.current_location?.trainNumber || 0);
  const journeyDate = String(trainInfo.journeyDate || new Date().toISOString().split('T')[0]);
  const nowTs = new Date().toISOString();
  const nowMs = Date.now();

  const currentLocation = backendResponse.current_location;
  const currentStation = currentLocation?.stationCode || currentLocation?.code || "---";
  const currentSequence = currentLocation?.sequence ?? null;
  const currentLiveDelay = typeof backendResponse.live_delay_minutes === "number" ? backendResponse.live_delay_minutes : 0;
  
  const telemetry = backendResponse.telemetry || {};
  const serviceStatus = backendResponse.service_status || {};
  const forecast = backendResponse.forecast || {};
  const nextStationFc = forecast.nextStationForecast || null;
  const destEta = backendResponse.destination_eta || {};

  const snapshots = [];

  // Snapshot 1: Next Stop Forecast (h = 1)
  if (nextStationFc) {
    const targetStation = nextStationFc.station;
    const snap1 = {
      predictionId: `pred_${nowMs}_${trainNumber}_${targetStation}_h1`,
      trainNumber,
      journeyDate,
      predictionTimestamp: nowTs,
      currentStation,
      currentSequence,
      currentLiveDelay,
      targetStation,
      targetSequence: null,
      horizon: 1,
      isDestination: false,
      expectedArrival: nextStationFc.expectedArrival,
      earliestLikelyArrival: nextStationFc.earliestLikelyArrival,
      latestLikelyArrival: nextStationFc.latestLikelyArrival,
      expectedDelay: nextStationFc.expectedDelayMinutes,
      earliestDelay: nextStationFc.lowerDelayMinutes,
      latestDelay: nextStationFc.upperDelayMinutes,
      telemetryStatus: telemetry.status || "unknown",
      telemetryAgeSeconds: telemetry.lastUpdatedAt ? Math.round((nowMs - new Date(telemetry.lastUpdatedAt).getTime()) / 1000) : null,
      serviceStatus: serviceStatus.status || "active"
    };
    snapshots.push(snap1);
  }

  // Snapshot 2: Destination Forecast (h = N)
  if (destEta && destEta.station) {
    const targetStation = destEta.station;
    const snapN = {
      predictionId: `pred_${nowMs}_${trainNumber}_${targetStation}_dest`,
      trainNumber,
      journeyDate,
      predictionTimestamp: nowTs,
      currentStation,
      currentSequence,
      currentLiveDelay,
      targetStation,
      targetSequence: null,
      horizon: "dest",
      isDestination: true,
      expectedArrival: forecast.expectedArrival || destEta.predicted_time,
      earliestLikelyArrival: forecast.earliestLikelyArrival,
      latestLikelyArrival: forecast.latestLikelyArrival,
      expectedDelay: forecast.expectedDelayMinutes ?? destEta.delay,
      earliestDelay: forecast.lowerDelayMinutes,
      latestDelay: forecast.upperDelayMinutes,
      telemetryStatus: telemetry.status || "unknown",
      telemetryAgeSeconds: telemetry.lastUpdatedAt ? Math.round((nowMs - new Date(telemetry.lastUpdatedAt).getTime()) / 1000) : null,
      serviceStatus: serviceStatus.status || "active"
    };
    snapshots.push(snapN);
  }

  // Deduplication Check
  const existing = readJsonl(config.SNAPSHOTS_FILE);
  const written = [];

  for (const snap of snapshots) {
    const isDuplicate = existing.some(oldSnap => 
      oldSnap.trainNumber === snap.trainNumber &&
      oldSnap.journeyDate === snap.journeyDate &&
      oldSnap.targetStation === snap.targetStation &&
      oldSnap.expectedArrival === snap.expectedArrival &&
      (nowMs - new Date(oldSnap.predictionTimestamp).getTime()) < config.DEDUPLICATION_WINDOW_MS
    );
    if (!isDuplicate) {
      appendJsonl(config.SNAPSHOTS_FILE, snap);
      written.push(snap);
    }
  }

  return written;
}

module.exports = {
  recordForecastSnapshot,
  readJsonl,
  appendJsonl
};
