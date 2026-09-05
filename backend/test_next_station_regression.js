/**
 * Permanent Regression Test: Next-Station Target Selection Boundary
 * 
 * Rules Tested:
 * 1. currentSequence = authoritative live current station sequence.
 * 2. nextStation = route station with SMALLEST sequence satisfying: station.sequence > currentSequence.
 * 3. Passed stations with missing actual delay/timestamps (e.g. MRLA seq 10 when current is HNK seq 12)
 *    MUST NEVER be selected as the next station target.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const BACKEND_DIR = __dirname;

// Test Route Fixture matching the exact problem scenario
const testRoute = [
  {
    station: { code: "MYS", name: "Mysuru Jn" },
    sequence: 1,
    scheduledArrival: "15:00",
    scheduledDeparture: "15:00",
    delayArrival: 0,
    status: "passed"
  },
  {
    station: { code: "MRLA", name: "Marial Gangavadi Halt" },
    sequence: 10,
    scheduledArrival: "15:55",
    scheduledDeparture: "15:56",
    delayArrival: null, // MISSING DELAY TIMESTAMP
    status: "upcoming" // UNVISITED STATUS IN RAW DATA
  },
  {
    station: { code: "HNK", name: "Hanakere" },
    sequence: 12,
    scheduledArrival: "16:10",
    scheduledDeparture: "16:11",
    delayArrival: 15,
    status: "passed"
  },
  {
    station: { code: "MDR", name: "Maddur" },
    sequence: 13,
    scheduledArrival: "16:25",
    scheduledDeparture: "16:27",
    delayArrival: null,
    status: "upcoming"
  },
  {
    station: { code: "CPT", name: "Channapatna" },
    sequence: 14,
    scheduledArrival: "16:45",
    scheduledDeparture: "16:46",
    delayArrival: null,
    status: "upcoming"
  },
  {
    station: { code: "SBC", name: "KSR Bengaluru" },
    sequence: 20,
    scheduledArrival: "18:00",
    scheduledDeparture: "18:00",
    delayArrival: null,
    status: "upcoming"
  }
];

// Server.js normalization logic helper
function normalizeRouteForCurrentSequence(route, currentSequence, liveDelayMinutes = 15) {
  return route.map((station, index) => {
    const stationCode = station.station?.code || station.code;
    const stationName = station.station?.name || station.name;
    const stSequence = station.sequence || index + 1;

    const isPassedBySequence = currentSequence !== null && stSequence <= currentSequence;

    let actualDelay = null;
    if (station.delayArrival !== undefined && station.delayArrival !== null) {
      actualDelay = Number(station.delayArrival);
    } else if (station.delayDeparture !== undefined && station.delayDeparture !== null) {
      actualDelay = Number(station.delayDeparture);
    } else if (isPassedBySequence || station.status === "passed" || station.status === "current") {
      actualDelay = liveDelayMinutes ?? 0;
    }

    const isCurrent = currentSequence !== null ? stSequence === currentSequence : (station.status === "current");
    const isPassed = currentSequence !== null ? stSequence <= currentSequence : (station.status === "passed" || actualDelay !== null);
    const computedStatus = isCurrent ? "current" : (isPassed ? "passed" : "upcoming");

    let scheduledHour = 12;
    if (station.scheduledArrival) {
      const parts = station.scheduledArrival.split(":");
      if (parts.length === 2) scheduledHour = parseInt(parts[0], 10);
    }

    return {
      station: stationCode,
      stationName: stationName,
      sequence: stSequence,
      is_origin: index === 0 ? 1 : 0,
      is_destination: index === route.length - 1 ? 1 : 0,
      scheduled_hour: scheduledHour,
      scheduled_departure_hour: scheduledHour,
      actual_hour: scheduledHour,
      scheduled_time: station.scheduledArrival,
      dwell_time_scheduled_mins: 0,
      inter_station_scheduled_mins: 15,
      platform_num: 1,
      actual_delay: isPassed ? actualDelay : null,
      status: computedStatus
    };
  });
}

// Run predict_xgb.py with python spawn
function runPythonPredict(stations, currentSeq, liveDelay = 15) {
  const currentStation = stations.find(s => s.sequence === currentSeq) || stations[0];
  const tempPath = path.join(BACKEND_DIR, `temp_regress_${Date.now()}_${Math.random().toString(36).substring(7)}.json`);
  const inputData = {
    train_number: 16219,
    day_of_week: 1,
    current_location: {
      stationCode: currentStation.station,
      sequence: currentSeq
    },
    live_delay_minutes: liveDelay,
    stations
  };

  fs.writeFileSync(tempPath, JSON.stringify(inputData));

  try {
    const stdout = execSync(`python predict_xgb.py "${tempPath}"`, {
      cwd: BACKEND_DIR,
      encoding: "utf-8"
    });
    return JSON.parse(stdout);
  } finally {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }
}

console.log("==========================================================");
console.log("PERMANENT REGRESSION TEST: NEXT-STATION SELECTION BOUNDARY");
console.log("==========================================================");

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passedCount++;
  } else {
    console.error(`[FAIL] ${message}`);
    failedCount++;
  }
}

// ========================================================
// TEST 1: Current = HNK (seq 12). Must pick MDR (seq 13), NOT MRLA (seq 10)
// ========================================================
{
  const currentSequence = 12; // HNK
  const normalized = normalizeRouteForCurrentSequence(testRoute, currentSequence, 15);
  const result = runPythonPredict(normalized, currentSequence, 15);
  const nextForecast = result.forecast?.nextStationForecast;

  assert(nextForecast != null, "Test 1: nextStationForecast object exists");
  assert(
    nextForecast?.station === "MDR" || nextForecast?.stationCode === "MDR",
    `Test 1: Selected station is MDR (got: ${nextForecast?.station || nextForecast?.stationCode})`
  );
  assert(
    nextForecast?.sequence > currentSequence,
    `Test 1: nextStation.sequence (${nextForecast?.sequence}) > currentSequence (${currentSequence})`
  );

  // Minimum sequence calculation check
  const futureSequences = testRoute.map(s => s.sequence).filter(seq => seq > currentSequence);
  const minFutureSequence = Math.min(...futureSequences);

  assert(
    nextForecast?.sequence === minFutureSequence,
    `Test 1: nextStation.sequence (${nextForecast?.sequence}) === minimum future sequence (${minFutureSequence})`
  );
  assert(
    nextForecast?.station !== "MRLA",
    "Test 1: MRLA (seq 10 < 12) WAS NOT SELECTED despite missing timestamps in raw data"
  );
}

// ========================================================
// TEST 2: Sequence Advancement Check - Current = MDR (seq 13). Must pick CPT (seq 14)
// ========================================================
{
  const currentSequence = 13; // MDR
  const normalized = normalizeRouteForCurrentSequence(testRoute, currentSequence, 15);
  const result = runPythonPredict(normalized, currentSequence, 15);
  const nextForecast = result.forecast?.nextStationForecast;

  assert(
    nextForecast?.station === "CPT",
    `Test 2: When at MDR (seq 13), selected next station is CPT (got: ${nextForecast?.station})`
  );
  assert(
    nextForecast?.sequence === 14,
    `Test 2: Selected sequence is 14 (got: ${nextForecast?.sequence})`
  );
}

// ========================================================
// TEST 3: At Destination (seq 20). Must return null for nextStationForecast
// ========================================================
{
  const currentSequence = 20; // SBC (Destination)
  const normalized = normalizeRouteForCurrentSequence(testRoute, currentSequence, 15);
  const result = runPythonPredict(normalized, currentSequence, 15);
  const nextForecast = result.forecast?.nextStationForecast;

  assert(
    nextForecast === null || nextForecast === undefined,
    "Test 3: At final destination (seq 20), nextStationForecast is null"
  );
}

console.log("----------------------------------------------------------");
console.log(`Summary: ${passedCount} Passed, ${failedCount} Failed`);

if (failedCount > 0) {
  console.error("REGRESSION TEST FAILED!");
  process.exit(1);
} else {
  console.log("ALL REGRESSION TESTS PASSED PERFECTLY!");
}
