import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, ArrowRight, RotateCcw, AlertTriangle } from 'lucide-react';
import Header from '../components/Header';
import { ArrivalForecast } from '../components/ArrivalForecast';
import { CurrentStateCard } from '../components/CurrentStateCard';
import { RouteProgress } from '../components/RouteProgress';
import { DelayPropagationChart } from '../components/DelayPropagationChart';
import { StationTable } from '../components/StationTable';
import { ModelInputs } from '../components/ModelInputs';
import { transformPredictionResponse } from '../services/apiAdapter';

export default function TrainDetails() {
  const { trainNo } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const { train, from, to, journeyDate, searchMode } = location.state || {};

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [telemetry, setTelemetry] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedStation, setSelectedStation] = useState(null);

  const fetchPrediction = async () => {
    try {
      setError("");
      const targetTrainNumber = trainNo || train?.trainNumber;
      if (!targetTrainNumber) {
        setError("No train number provided.");
        setLoading(false);
        return;
      }

      const today = new Date().toISOString().split("T")[0];
      const targetDate = journeyDate || today;

      const response = await axios.post(
        `${API_URL}/predict-future-stations`,
        {
          trainNumber: targetTrainNumber,
          journeyDate: targetDate,
          from: from || train?.from,
          to: to || train?.to,
          searchMode
        }
      );

      const transformed = transformPredictionResponse(
        response.data,
        { trainNumber: targetTrainNumber, trainName: train?.trainName, serviceType: train?.serviceType },
        { from: from || train?.from, to: to || train?.to }
      );

      setTelemetry(transformed);
    } catch (err) {
      console.error("Error fetching prediction:", err);
      setError(err.response?.data?.error || "Failed to fetch live train data or XGBoost predictions.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    setTelemetry(null);
    setSelectedStation(null);
    setLoading(true);
    fetchPrediction();
  }, [trainNo]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchPrediction();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Back Button */}
        <div>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Search</span>
          </button>
        </div>

        {loading ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <h3 className="text-lg font-bold text-slate-800">Loading Train Intelligence Dashboard...</h3>
            <p className="text-xs text-slate-500">Querying live RailRadar route data & running XGBoost delay models...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-3xl space-y-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
              <h3 className="text-lg font-bold">Failed to Load Telemetry</h3>
            </div>
            <p className="text-sm font-semibold">{error}</p>
            <button
              type="button"
              onClick={fetchPrediction}
              className="px-4 py-2 bg-red-600 text-white rounded-xl font-bold text-xs hover:bg-red-700 transition-colors cursor-pointer"
            >
              Retry Prediction Request
            </button>
          </div>
        ) : telemetry ? (
          <div className="space-y-6">
            {/* 1. TRAIN HEADER */}
            <div
              id="dashboard-header"
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white border border-slate-200 shadow-xs"
            >
              <div>
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-3xl font-extrabold tracking-tight text-slate-900">
                    {telemetry.trainNumber}
                  </span>
                  <span className="text-slate-300 font-light text-xl">•</span>
                  <span className="text-2xl font-bold text-slate-800">
                    {telemetry.trainName}
                  </span>
                  <span className="px-2.5 py-0.5 rounded text-xs font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                    {telemetry.serviceType}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-600 mt-1 font-medium">
                  <span className="font-bold text-slate-900">{telemetry.origin.name} ({telemetry.origin.code})</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                  <span className="font-bold text-slate-900">{telemetry.destination.name} ({telemetry.destination.code})</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                  <span>{isRefreshing ? "Updating..." : "Refresh Live Data"}</span>
                </button>
              </div>
            </div>

            {/* 2. ARRIVAL FORECAST (REQUIRED POSITION) */}
            <ArrivalForecast
              train={telemetry}
              forecastData={telemetry.arrivalForecast}
            />

            {/* 3. CURRENT STATUS */}
            <CurrentStateCard
              currentLocationCode={telemetry.currentStation.code}
              currentLocationName={telemetry.currentStation.name}
              currentDelayMinutes={telemetry.currentDelayMinutes}
              nextStationCode={telemetry.nextStation.code}
              nextStationName={telemetry.nextStation.name}
              predictedDestinationEta={telemetry.predictedDestinationEta}
              scheduledDestinationEta={telemetry.scheduledDestinationEta}
              destinationCode={telemetry.destination.code}
              destinationName={telemetry.destination.name}
            />

            {/* 4. ROUTE PROGRESS */}
            <RouteProgress
              stations={telemetry.stations}
              currentStationCode={telemetry.currentStation?.code}
              selectedStationCode={selectedStation?.code}
              onSelectStation={(st) => setSelectedStation(st)}
            />

            {/* 5. EXISTING DETAILS & XGBOOST VISUALIZATIONS */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 space-y-6">
                <DelayPropagationChart stations={telemetry.stations} />
                <StationTable stations={telemetry.stations} />
              </div>

              <div className="lg:col-span-4 space-y-6">
                <ModelInputs
                  modelEngine={telemetry.modelEngine}
                  confidence={telemetry.confidence}
                />
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}