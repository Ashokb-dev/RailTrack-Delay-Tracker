import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

import Header from "../components/Header";
import PredictionConfidence from "../components/PredictionConfidence";
import LiveStationTimeline from "../components/LiveStationTimeline";
import DelayTrendChart from "../components/DelayTrendChart";


export default function TrainDetails() {

  const location = useLocation();

  const {
    train,
    from,
    to,
    journeyDate,
    searchMode
  } = location.state || {};

  const [
    stationPredictions,
    setStationPredictions
  ] = useState([]);

  const [
    confidence,
    setConfidence
]
  = useState(0);

useEffect(() => {

    const fetchPrediction =
      async () => {

        try {

          const response =
            await axios.post(
              `${import.meta.env.VITE_API_URL}/predict-future-stations`,
              {
                trainNumber: train.trainNumber,
                journeyDate,
                from,
                to,
                searchMode
              }
            );

          setStationPredictions(
            response.data.predictions || []
          );

          setConfidence(
            response.data.confidence || 0
          );

        } catch (err) {

          console.error(err);

        }
      };

    fetchPrediction();

  }, []);

  return (

    <div className="min-h-screen bg-slate-100 p-6">

      <div className="max-w-7xl mx-auto space-y-6">

        <Header />

        <div className="bg-white rounded-3xl border shadow-sm p-6">

  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">

    {/* TRAIN */}

    <div>

      <p className="text-slate-500 text-sm">

        Train Number

      </p>

      <h1 className="text-4xl font-bold text-slate-800">

        {train?.trainNumber}

      </h1>

      <h2 className="text-lg text-slate-600 mt-1">

        {train?.trainName}

      </h2>

    </div>

    {/* ROUTE */}

    <div>

      <p className="text-slate-500 text-sm">

        Route

      </p>

      <h2 className="text-3xl font-bold text-slate-800 mt-2">

        {from} → {to}

      </h2>

    </div>

    {/* DATE */}

    <div>

      <p className="text-slate-500 text-sm">

        Journey Date

      </p>

      <h2 className="text-4xl font-bold text-orange-500 mt-2">

        {journeyDate}

      </h2>

    </div>

    {/* CONFIDENCE */}

    <div>

      <p className="text-slate-500 text-sm">

        AI Prediction Confidence

      </p>

      <h2 className="text-4xl font-bold text-green-500 mt-2">

        {confidence}%

      </h2>

    </div>

  </div>

</div>

        <LiveStationTimeline
          stations={stationPredictions}
        />

        <DelayTrendChart
          stations={stationPredictions}
        />

       
      </div>

    </div>

  );

}