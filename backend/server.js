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

    const url = `https://api.railradar.in/api/v1/trains/${trainNumber}?journeyDate=${journeyDate}&dataType=live&apiKey=${API_KEY}`;

    console.log("Fetching train route:", url);

    const response = await axios.get(url);
    const liveData = response.data;

    let routeStations = liveData.data?.route || [];

    // ======================================
    // FILTER ROUTE
    // ======================================

    if (searchMode === "stations" && from && to) {
      const startIndex = routeStations.findIndex((s) => s.stationCode === from);
      const endIndex = routeStations.findIndex((s) => s.stationCode === to);

      if (startIndex !== -1 && endIndex !== -1) {
        routeStations = routeStations.slice(startIndex, endIndex + 1);
      }
    }

    console.log("Total route stations:", routeStations.length);

    // ======================================
    // PROCESS STATIONS
    // ======================================

    const stations = routeStations.map((station, index) => {
      let actualDelay = null;

      if (
        station.delayArrivalMinutes !== undefined &&
        station.delayArrivalMinutes !== null
      ) {
        actualDelay = Number(station.delayArrivalMinutes);
      }

      const scheduledArrival = station.scheduledArrival
        ? new Date(station.scheduledArrival * 1000)
        : null;

      const scheduledDeparture = station.scheduledDeparture
        ? new Date(station.scheduledDeparture * 1000)
        : null;

      const actualArrival = station.actualArrival
        ? new Date(station.actualArrival * 1000)
        : null;

      let scheduledHour = 12;
      if (scheduledArrival) scheduledHour = scheduledArrival.getHours();

      let actualHour = scheduledHour;
      if (actualArrival) actualHour = actualArrival.getHours();

      let scheduledTime = "00:00";
      if (scheduledArrival) {
        const hh = String(scheduledArrival.getHours()).padStart(2, "0");
        const mm = String(scheduledArrival.getMinutes()).padStart(2, "0");
        scheduledTime = `${hh}:${mm}`;
      }

      let dwellTime = 0;
      if (scheduledArrival && scheduledDeparture) {
        dwellTime = Math.max(0, (scheduledDeparture - scheduledArrival) / 60000);
      }

      let interStationTime = 0;
      if (index > 0) {
        const prevStation = routeStations[index - 1];
        if (prevStation.scheduledDeparture && station.scheduledArrival) {
          interStationTime = Math.max(
            0,
            ((station.scheduledArrival - prevStation.scheduledDeparture) * 1000) / 60000
          );
        }
      }

      let platformNum = 1;
      if (station.platformNumber) {
        const parsed = parseInt(station.platformNumber);
        if (!isNaN(parsed)) platformNum = parsed;
      }

      return {
        station: station.stationCode || station.stationName || `ST-${index}`,
        stationName: station.stationName || station.stationCode || `Station ${index + 1}`,
        sequence: station.sequence || index + 1,
        is_origin: index === 0 ? 1 : 0,
        is_destination: index === routeStations.length - 1 ? 1 : 0,
        scheduled_hour: scheduledHour,
        scheduled_departure_hour: scheduledDeparture
          ? scheduledDeparture.getHours()
          : scheduledHour,
        actual_hour: actualHour,
        scheduled_time: scheduledTime,
        dwell_time_scheduled_mins: dwellTime,
        inter_station_scheduled_mins: interStationTime,
        platform_num: platformNum,
        actual_delay: actualDelay,
      };
    });

    // ======================================
    // INPUT DATA
    // ======================================

    const inputData = {
      train_number: Number(trainNumber),
      day_of_week: new Date(journeyDate).getDay(),
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

    const url = `https://api.railradar.in/api/v1/trains/between?from=${from}&to=${to}&apiKey=${API_KEY}`;
    const response = await axios.get(url);
    res.json(response.data);
  } catch (err) {
    console.error("Search trains error:", err.message);
    const detail = err.response?.data?.error || err.response?.data?.message || err.message;
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
