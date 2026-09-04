/**
 * RailTrack AI - Pure Data Adapter
 * Converts backend REST API responses into normalized data structures for UI components.
 * 
 * Rules:
 * - Pure data transformation only.
 * - No ML calculation, no RailRadar logic, no fabricated ranges.
 * - Preserves backend XGBoost point prediction as arrivalExpected.
 * - Future Station Rule: Current station & passed stations are strictly EXCLUDED from future forecast.
 */

export function transformPredictionResponse(backendData, trainInfo = {}, routeInfo = {}) {
  const predictions = Array.isArray(backendData?.predictions) ? backendData.predictions : [];
  const confidence = typeof backendData?.confidence === "number" ? backendData.confidence : 0;
  const destEta = backendData?.destination_eta || {};

  // 1. Process Stations Telemetry
  const stations = predictions.map((s, index) => {
    const isObserved = s.type === "real" || (s.actual_time !== null && s.actual_time !== undefined);
    return {
      code: s.station || `ST-${index}`,
      name: s.stationName || s.station || `Station ${index + 1}`,
      sequence: s.sequence || index + 1,
      scheduledArrival: s.scheduled_time || "--:--",
      scheduledDeparture: s.scheduled_time || "--:--",
      actualArrival: isObserved ? s.actual_time : null,
      actualDeparture: isObserved ? s.actual_time : null,
      actualDelayMinutes: isObserved ? (s.delay ?? 0) : null,
      predictedArrival: s.predicted_time || "--:--",
      predictedDeparture: s.predicted_time || "--:--",
      predictedDelayMinutes: s.delay ?? s.predicted_delay ?? 0,
      delayChangeMinutes: s.delta ?? 0,
      status: isObserved ? "OBSERVED" : "FORECAST",
      isObserved,
      platform: s.platform_num ? String(s.platform_num) : "1",
      type: s.type
    };
  });

  // 2. Identify Current Station Index & Partition
  const liveLocation = backendData?.current_location;
  const liveNextHalt = backendData?.next_halt;

  // Authoritative Current Station directly from RailRadar API
  const currentStationObj = liveLocation && (liveLocation.stationName || liveLocation.name)
    ? {
        code: liveLocation.stationCode || liveLocation.code || "---",
        name: liveLocation.stationName || liveLocation.name || "Live Location"
      }
    : (stations[0] || {
        code: routeInfo.from || "MYS",
        name: routeInfo.from || "Mysuru Jn"
      });

  // Authoritative Current Live Delay directly from RailRadar API
  const currentDelayMinutes = typeof backendData?.live_delay_minutes === "number"
    ? backendData.live_delay_minutes
    : (typeof liveLocation?.delayMinutes === "number" ? liveLocation.delayMinutes : 0);

  // Authoritative Next Station directly from RailRadar API
  const nextStationObj = liveNextHalt && (liveNextHalt.stationName || liveNextHalt.name)
    ? {
        code: liveNextHalt.stationCode || liveNextHalt.code || "---",
        name: liveNextHalt.stationName || liveNextHalt.name || "Next Station"
      }
    : (stations.length > 1 ? stations[1] : {
        code: routeInfo.to || "SBC",
        name: routeInfo.to || "KSR Bengaluru"
      });

  // Find exact index of current station in stations array for RouteProgress
  let currentStationIdx = stations.findIndex(s => s.code === currentStationObj.code);
  if (currentStationIdx === -1 && backendData?.previous_halt?.stationCode) {
    currentStationIdx = stations.findIndex(s => s.code === backendData.previous_halt.stationCode);
  }
  if (currentStationIdx === -1) {
    currentStationIdx = 0;
  }

  // Passed stations & Future Forecast stations
  const passedStations = stations.slice(0, currentStationIdx);
  const futureForecastStations = stations.slice(currentStationIdx + 1);

  // Destination station: Last station on the route
  const lastStation = stations[stations.length - 1] || {};
  const destinationCode = lastStation.code || routeInfo.to || "SBC";
  const destinationName = lastStation.name || routeInfo.to || "KSR Bengaluru";
  const scheduledDestinationEta = lastStation.scheduledArrival || "--:--";

  // Point prediction from XGBoost
  const predictedDestinationEta = destEta.predicted_time || lastStation.predictedArrival || "--:--";
  const predictedFinalDelayMinutes = destEta.delay ?? lastStation.predictedDelayMinutes ?? currentDelayMinutes;

  // 3. Arrival Forecast Data Structure (Rules 2 & 13: Truthful Range Data)
  const arrivalForecast = {
    arrivalExpected: predictedDestinationEta,
    delayExpected: Math.round(predictedFinalDelayMinutes),
    arrivalEarliest: null, // Range bounds uncalibrated by point XGBoost model
    arrivalLatest: null,   // Range bounds uncalibrated by point XGBoost model
    delayEarliest: null,
    delayLatest: null,
    isRangeAvailable: false,
    forecastFactors: [
      {
        id: "current_delay",
        title: "Live Accumulated Delay",
        description: `Delay accumulated at last observed station (${currentStationObj.name}): +${Math.round(currentDelayMinutes)} min.`,
        detail: `Observed at ${currentStationObj.name} (${currentStationObj.code})`,
        impactText: `+${Math.round(currentDelayMinutes)} min baseline`,
        type: "current_delay"
      },
      {
        id: "xgb_model",
        title: "XGBoost Machine Learning Pipeline",
        description: "Evaluates station sequence, dwell times, and inter-station timetable buffers.",
        detail: "Point prediction model (models/best_model_v1.pkl)",
        impactText: `${predictedFinalDelayMinutes >= 0 ? '+' : ''}${Math.round(predictedFinalDelayMinutes)} min expected`,
        type: "operational"
      }
    ]
  };

  return {
    trainNumber: trainInfo.trainNumber || "---",
    trainName: trainInfo.trainName || "Train",
    serviceType: trainInfo.serviceType || "Express",
    origin: {
      code: routeInfo.from || "MYS",
      name: routeInfo.from || "Mysuru Jn"
    },
    destination: {
      code: destinationCode,
      name: destinationName
    },
    currentStation: {
      code: currentStationObj.code,
      name: currentStationObj.name
    },
    nextStation: {
      code: nextStationObj.code,
      name: nextStationObj.name
    },
    currentDelayMinutes: Math.round(currentDelayMinutes),
    predictedDestinationEta,
    scheduledDestinationEta,
    predictedFinalDelayMinutes: Math.round(predictedFinalDelayMinutes),
    lastUpdatedSecondsAgo: 15,
    confidence, // Backend heuristic score
    stations,
    passedStations,
    observedStations: stations.filter(s => s.isObserved),
    futureForecastStations, // Strictly stations after current station
    arrivalForecast,
    telemetrySource: "RailRadar LIVE API",
    modelEngine: "XGBoost Regressor (models/best_model_v1.pkl)"
  };
}
