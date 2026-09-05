require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

const API_KEY = process.env.RAILRADAR_API_KEY;

if (!API_KEY) {
  console.warn("⚠️ RAILRADAR_API_KEY is not set in backend/.env. External RailRadar API calls will require RAILRADAR_API_KEY.");
}

// ======================================
// HOME
// ======================================

app.get("/", (req, res) => {
  res.send("🚆 Railway Delay Prediction API Running");
});

// ======================================
// FUTURE STATION PREDICTIONS
// ======================================

app.post("/predict-future-stations", async (req, res) => {
  try {
    const { trainNumber, journeyDate, from, to, searchMode } = req.body;

    if (!API_KEY) {
      return res.status(400).json({ error: "RAILRADAR_API_KEY is not configured in backend/.env file." });
    }

    if (!trainNumber || !journeyDate) {
      return res.status(400).json({ error: "trainNumber and journeyDate are required" });
    }

    // ======================================
    // LIVE TRAIN API
    // ======================================

    let liveUrl = `https://api.railradar.in/v1/trains/${trainNumber}/live`;
    console.log("Fetching live train running status:", liveUrl);

    let liveData = null;
    try {
      const response = await axios.get(liveUrl, {
        headers: { Authorization: `Bearer ${API_KEY}` }
      });
      liveData = response.data;
    } catch (liveErr) {
      console.log("Live endpoint error:", liveErr.response?.status, liveErr.response?.data || liveErr.message);
      console.log("Live endpoint fallback to timetable route endpoint...");
      const fallbackUrl = `https://api.railradar.in/v1/trains/${trainNumber}?journeyDate=${journeyDate}&dataType=live&apiKey=${API_KEY}`;
      const response = await axios.get(fallbackUrl, {
        headers: { Authorization: `Bearer ${API_KEY}` }
      });
      liveData = response.data;
    }

    const dataObj = liveData?.data || {};
    let routeStations = dataObj.route || [];

    const currentLocation = dataObj.currentLocation || null;
    const nextHalt = dataObj.nextHalt || null;
    const previousHalt = dataObj.previousHalt || null;
    const liveDelayMinutes = typeof dataObj.delayMinutes === "number"
      ? dataObj.delayMinutes
      : (typeof currentLocation?.delayMinutes === "number" ? currentLocation.delayMinutes : null);

    // Telemetry Freshness Evaluation (~30 min threshold)
    const isLive = dataObj.isLive !== false && liveData?.isLive !== false;
    const lastUpdatedAt = dataObj.lastUpdatedAt || currentLocation?.lastUpdatedAt || null;
    let telemetryStatus = "fresh";
    let telemetryWarning = null;

    if (!isLive) {
      telemetryStatus = "not_live";
      telemetryWarning = "Live train data is not active. Forecast may be less reliable.";
    } else if (lastUpdatedAt) {
      const updatedTime = new Date(lastUpdatedAt).getTime();
      const nowTime = Date.now();
      if (!isNaN(updatedTime) && (nowTime - updatedTime) > 30 * 60 * 1000) {
        telemetryStatus = "stale";
        telemetryWarning = "Live train data is stale. Forecast may be less reliable.";
      }
    } else {
      telemetryStatus = "unknown";
    }

    const telemetry = {
      isLive,
      lastUpdatedAt,
      status: telemetryStatus,
      warningMessage: telemetryWarning
    };

    // Service Status Evaluation (Cancelled / Diverted / Missing Location / Extreme Delay)
    const rawStatus = String(dataObj.status || currentLocation?.status || "").toUpperCase();
    let serviceStatus = {
      status: "active",
      forecastAvailable: true,
      extremeDelay: typeof liveDelayMinutes === "number" && liveDelayMinutes > 180,
      message: null
    };

    if (rawStatus.includes("CANCEL")) {
      serviceStatus = {
        status: "cancelled",
        forecastAvailable: false,
        extremeDelay: false,
        message: "Train cancelled — arrival forecast unavailable."
      };
    } else if (rawStatus.includes("DIVERT")) {
      serviceStatus = {
        status: "diverted",
        forecastAvailable: false,
        extremeDelay: false,
        message: "Train diverted — arrival forecast unavailable."
      };
    } else if (!currentLocation) {
      serviceStatus = {
        status: "location_missing",
        forecastAvailable: false,
        extremeDelay: false,
        message: "Current train position unavailable."
      };
    }

    // Preserve full train route so actual live location is never sliced out
    console.log("Total route stations:", routeStations.length);

    // ======================================
    // PROCESS STATIONS
    // ======================================

    const stations = routeStations.map((station, index) => {
      const stationCode = station.station?.code || station.stationCode || station.code || `ST-${index}`;
      const stationName = station.station?.name || station.stationName || station.name || `Station ${index + 1}`;

      let actualDelay = null;
      if (station.delayArrival !== undefined && station.delayArrival !== null) {
        actualDelay = Number(station.delayArrival);
      } else if (station.delayDeparture !== undefined && station.delayDeparture !== null) {
        actualDelay = Number(station.delayDeparture);
      } else if (station.delayArrivalMinutes !== undefined && station.delayArrivalMinutes !== null) {
        actualDelay = Number(station.delayArrivalMinutes);
      } else if (station.delayDepartureMinutes !== undefined && station.delayDepartureMinutes !== null) {
        actualDelay = Number(station.delayDepartureMinutes);
      } else if (station.delayMinutes !== undefined && station.delayMinutes !== null) {
        actualDelay = Number(station.delayMinutes);
      } else if (station.status === "passed" || station.status === "current") {
        actualDelay = liveDelayMinutes ?? 0;
      }

      const scheduledArrival = station.scheduledArrival
        ? (typeof station.scheduledArrival === "number" ? new Date(station.scheduledArrival * 1000) : new Date(station.scheduledArrival))
        : null;

      const scheduledDeparture = station.scheduledDeparture
        ? (typeof station.scheduledDeparture === "number" ? new Date(station.scheduledDeparture * 1000) : new Date(station.scheduledDeparture))
        : null;

      const actualArrival = station.actualArrival
        ? (typeof station.actualArrival === "number" ? new Date(station.actualArrival * 1000) : new Date(station.actualArrival))
        : null;

      let scheduledHour = 12;
      if (scheduledArrival && !isNaN(scheduledArrival.getTime())) scheduledHour = scheduledArrival.getHours();

      let actualHour = scheduledHour;
      if (actualArrival && !isNaN(actualArrival.getTime())) actualHour = actualArrival.getHours();

      let scheduledTime = "--:--";
      if (scheduledArrival && !isNaN(scheduledArrival.getTime())) {
        const hh = String(scheduledArrival.getHours()).padStart(2, "0");
        const mm = String(scheduledArrival.getMinutes()).padStart(2, "0");
        scheduledTime = `${hh}:${mm}`;
      } else if (typeof station.arrival === "string" && station.arrival.includes(":")) {
        scheduledTime = station.arrival;
      } else if (typeof station.departure === "string" && station.departure.includes(":")) {
        scheduledTime = station.departure;
      }

      let dwellTime = 0;
      if (scheduledArrival && scheduledDeparture && !isNaN(scheduledArrival.getTime()) && !isNaN(scheduledDeparture.getTime())) {
        dwellTime = Math.max(0, (scheduledDeparture - scheduledArrival) / 60000);
      }

      let interStationTime = 0;
      if (index > 0) {
        const prevStation = routeStations[index - 1];
        if (prevStation.scheduledDeparture && station.scheduledArrival) {
          const prevDep = typeof prevStation.scheduledDeparture === "number" ? prevStation.scheduledDeparture * 1000 : new Date(prevStation.scheduledDeparture).getTime();
          const currArr = typeof station.scheduledArrival === "number" ? station.scheduledArrival * 1000 : new Date(station.scheduledArrival).getTime();
          if (!isNaN(prevDep) && !isNaN(currArr)) {
            interStationTime = Math.max(0, (currArr - prevDep) / 60000);
          }
        }
      }

      let platformNum = 1;
      if (station.platformNumber || station.platform) {
        const platformStr = String(station.platformNumber || station.platform);
        const parsed = parseInt(platformStr.replace(/\D/g, ""));
        if (!isNaN(parsed) && parsed > 0) platformNum = parsed;
      }

      return {
        station: stationCode,
        stationName: stationName,
        sequence: station.sequence || index + 1,
        is_origin: index === 0 ? 1 : 0,
        is_destination: index === routeStations.length - 1 ? 1 : 0,
        scheduled_hour: scheduledHour,
        scheduled_departure_hour: scheduledDeparture && !isNaN(scheduledDeparture.getTime())
          ? scheduledDeparture.getHours()
          : scheduledHour,
        actual_hour: actualHour,
        scheduled_time: scheduledTime,
        dwell_time_scheduled_mins: dwellTime,
        inter_station_scheduled_mins: interStationTime,
        platform_num: platformNum,
        actual_delay: actualDelay,
        status: station.status || (actualDelay !== null ? "passed" : "upcoming")
      };
    });

    // Early Exit if Forecast is Unavailable (Cancelled / Diverted / Missing Location)
    if (!serviceStatus.forecastAvailable) {
      return res.json({
        service_status: serviceStatus,
        telemetry,
        current_location: currentLocation,
        next_halt: nextHalt,
        previous_halt: previousHalt,
        live_delay_minutes: liveDelayMinutes,
        destination_eta: null,
        forecast: {
          expectedDelayMinutes: 0,
          lowerDelayMinutes: null,
          upperDelayMinutes: null,
          expectedArrival: "--:--",
          earliestLikelyArrival: null,
          latestLikelyArrival: null,
          calibrated: false,
          method: "unavailable",
          nextStationForecast: null
        },
        predictions: stations.map(s => ({
          station: s.station,
          stationName: s.stationName,
          scheduled_time: s.scheduled_time,
          actual_time: s.actual_delay !== null ? "--:--" : null,
          predicted_time: "--:--",
          delay: s.actual_delay,
          predicted_delay: null,
          delta: 0,
          type: s.actual_delay !== null ? "real" : "predicted"
        }))
      });
    }

    // ======================================
    // INPUT DATA
    // ======================================

    const inputData = {
      train_number: Number(trainNumber),
      day_of_week: new Date(journeyDate).getDay(),
      current_location: currentLocation,
      next_halt: nextHalt,
      previous_halt: previousHalt,
      live_delay_minutes: liveDelayMinutes,
      service_status: serviceStatus,
      telemetry,
      stations,
    };

    const tempFilePath = path.join(__dirname, `temp_prediction_${Date.now()}.json`);

    fs.writeFileSync(tempFilePath, JSON.stringify(inputData));

    // ======================================
    // RUN PYTHON
    // ======================================

    exec(`python predict_xgb.py "${tempFilePath}"`, (error, stdout, stderr) => {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }

      if (error) {
        console.error("Python Error:", error.message);
        console.error(stderr);
        return res.status(500).json({ error: "Prediction failed", details: error.message });
      }

      try {
        const result = JSON.parse(stdout);
        res.json(result);
      } catch (err) {
        console.error("JSON parse error:", err.message);
        console.error("stdout:", stdout);
        res.status(500).json({ error: "Invalid prediction response" });
      }
    });
  } catch (err) {
    console.error("Prediction route error:", err.message);
    const detail = err.response?.data?.error || err.response?.data?.message || err.message;
    res.status(err.response?.status || 500).json({ error: "Future prediction failed", details: detail });
  }
});

// ======================================
// SEARCH TRAINS BETWEEN STATIONS
// ======================================

app.post("/search-trains", async (req, res) => {
  try {
    const { from, to } = req.body;

    if (!API_KEY) {
      return res.status(400).json({ error: "RAILRADAR_API_KEY is not configured in backend/.env file." });
    }

    if (!from || !to) {
      return res.status(400).json({ error: "from and to are required" });
    }

    const url = `https://api.railradar.in/v1/trains/between/${from}/${to}?live=true`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${API_KEY}` }
    });
    res.json(response.data);
  } catch (err) {
    console.error("Search trains error:", err.message);
    if (err.response?.status === 404 || err.response?.data?.error?.code === 'NOT_FOUND') {
      return res.json([]);
    }
    const detail = err.response?.data?.error?.message || err.response?.data?.error || err.response?.data?.message || err.message;
    res.status(err.response?.status || 500).json({ error: `RailRadar API Error: ${detail}` });
  }
});

// ======================================
// STATION SEARCH
// ======================================

app.get("/search-stations", async (req, res) => {
  try {
    const query = req.query.query || "";

    const stations = [
      { code: "PUNE", name: "Pune Junction" },
      { code: "HDP", name: "Hadapsar" },
      { code: "JL", name: "Jalgaon Junction" },
      { code: "MMR", name: "Manmad Junction" },
      { code: "CSN", name: "Chalisgaon Junction" },
      { code: "DHI", name: "Dhule" },
      { code: "CSMT", name: "Mumbai CSMT" },
      { code: "LTT", name: "Lokmanya Tilak Terminus" },
      { code: "NGP", name: "Nagpur Junction" },
      { code: "AK", name: "Akola Junction" },
      { code: "AMI", name: "Amravati" },
      { code: "BSL", name: "Bhusaval Junction" },
      { code: "KPG", name: "Kopargaon" },
      { code: "DDCC", name: "Daund Chord Line" },
      { code: "ANG", name: "Ahmednagar" },
    ];

    const filtered = stations.filter(
      (s) =>
        s.code.toLowerCase().includes(query.toLowerCase()) ||
        s.name.toLowerCase().includes(query.toLowerCase())
    );

    res.json(filtered);
  } catch (err) {
    console.error("Station search error:", err.message);
    res.status(500).json({ error: "Station search failed" });
  }
});

// ======================================
// SERVER
// ======================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
