import React, { useState, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Calendar, ArrowRight, Train, Activity, AlertCircle, X } from 'lucide-react';
import Header from '../components/Header';
import TrainCard from '../components/TrainCard';

export default function Home() {
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  // Form State
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const today = new Date().toISOString().split("T")[0];
  const [journeyDate, setJourneyDate] = useState(today);

  // Results & Loading
  const [trains, setTrains] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Active Train Search State
  const [showActiveSearch, setShowActiveSearch] = useState(false);
  const [activeSearchQuery, setActiveSearchQuery] = useState("");

  const filteredTrains = useMemo(() => {
    if (!activeSearchQuery || !activeSearchQuery.trim()) {
      return trains;
    }
    const query = activeSearchQuery.trim().toLowerCase();
    return trains.filter((t) => {
      const numMatch = t.trainNumber ? String(t.trainNumber).toLowerCase().includes(query) : false;
      const nameMatch = t.trainName ? String(t.trainName).toLowerCase().includes(query) : false;
      const fromMatch = t.from ? String(t.from).toLowerCase().includes(query) : false;
      const toMatch = t.to ? String(t.to).toLowerCase().includes(query) : false;
      const fromNameMatch = t.fromName ? String(t.fromName).toLowerCase().includes(query) : false;
      const toNameMatch = t.toName ? String(t.toName).toLowerCase().includes(query) : false;
      const serviceMatch = t.serviceType ? String(t.serviceType).toLowerCase().includes(query) : false;

      return numMatch || nameMatch || fromMatch || toMatch || fromNameMatch || toNameMatch || serviceMatch;
    });
  }, [trains, activeSearchQuery]);

  // Autocomplete Suggestions
  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);

  // Fetch Station Suggestions
  const searchStations = async (value, type) => {
    try {
      if (!value || !value.trim()) {
        if (type === "from") setFromSuggestions([]);
        else setToSuggestions([]);
        return;
      }

      const response = await axios.get(
        `${API_URL}/search-stations?query=${encodeURIComponent(value.trim())}`
      );

      let list = [];
      if (Array.isArray(response.data)) list = response.data;
      else if (Array.isArray(response.data?.data)) list = response.data.data;
      else if (Array.isArray(response.data?.stations)) list = response.data.stations;

      if (type === "from") setFromSuggestions(list);
      else setToSuggestions(list);
    } catch (err) {
      console.error("Error searching stations:", err);
      if (type === "from") setFromSuggestions([]);
      else setToSuggestions([]);
    }
  };

  // Search Trains Function
  const searchTrains = async () => {
    try {
      setErrorMessage("");
      setLoading(true);
      setHasSearched(true);

      const fromCode = (from || "").trim().toUpperCase();
      const toCode = (to || "").trim().toUpperCase();

      if (!fromCode || !toCode) {
        setErrorMessage("Please enter both Origin and Destination station codes (e.g., MYS and SBC)");
        setLoading(false);
        return;
      }

      const response = await axios.post(
        `${API_URL}/search-trains`,
        {
          from: fromCode,
          to: toCode,
          journeyDate
        }
      );

      const rawList = response.data?.data?.trains || response.data?.data || response.data || [];

      const trainData = (Array.isArray(rawList) ? rawList : []).map((t) => ({
        trainNumber: t.train?.number || t.trainNumber || t.number || "",
        trainName: t.train?.name || t.trainName || t.name || "",
        serviceType: t.train?.type || "Express",
        from: t.from?.code || t.from || fromCode,
        fromName: t.from?.name || fromCode,
        to: t.to?.code || t.to || toCode,
        toName: t.to?.name || toCode,
        departureTime: t.from?.departure || "",
        arrivalTime: t.to?.arrival || "",
        raw: t
      }));

      setTrains(trainData);
    } catch (err) {
      console.error("Search trains error:", err);
      setErrorMessage(err.response?.data?.error || "Failed to fetch trains from live RailRadar API");
      setTrains([]);
    } finally {
      setLoading(false);
    }
  };

  // Navigate to Train Details
  const trackTrain = (trainItem) => {
    navigate(`/train/${trainItem.trainNumber}`, {
      state: {
        train: trainItem,
        from: trainItem.from || from,
        to: trainItem.to || to,
        journeyDate
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Hero Banner Section */}
        <section className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="max-w-3xl space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
              <Activity className="w-3.5 h-3.5" />
              <span>Live Railway Intelligence & XGBoost ML Predictions</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Track Trains & Forecast Future Station Arrival Delays
            </h1>
            <p className="text-sm sm:text-base text-slate-600">
              Enter your origin and destination stations to search live Indian Railway trains, inspect delay propagation, and view AI-predicted arrival ETAs.
            </p>
          </div>

          {/* Search Card Container */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* FROM STATION INPUT */}
              <div className="relative">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  From Station
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={from}
                    onChange={(e) => {
                      setFrom(e.target.value);
                      searchStations(e.target.value, "from");
                    }}
                    placeholder="e.g. MYS or Mysuru"
                    className="w-full bg-white border border-slate-300 rounded-xl p-3.5 pl-10 text-sm font-semibold text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>

                {/* From Suggestions Dropdown */}
                {Array.isArray(fromSuggestions) && fromSuggestions.length > 0 && (
                  <div className="absolute z-30 bg-white border border-slate-200 rounded-xl shadow-lg mt-1 w-full max-h-56 overflow-y-auto divide-y divide-slate-100">
                    {fromSuggestions.map((st, idx) => {
                      const code = typeof st === "object" ? st.code : st;
                      const name = typeof st === "object" ? st.name : "";
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setFrom(code);
                            setFromSuggestions([]);
                          }}
                          className="w-full p-3 text-left hover:bg-slate-50 flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <div>
                            <span className="font-bold text-slate-900 text-sm">{code}</span>
                            {name && <span className="text-xs text-slate-500 block">{name}</span>}
                          </div>
                          <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded">Station</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* TO STATION INPUT */}
              <div className="relative">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  To Station
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={to}
                    onChange={(e) => {
                      setTo(e.target.value);
                      searchStations(e.target.value, "to");
                    }}
                    placeholder="e.g. SBC or Bengaluru"
                    className="w-full bg-white border border-slate-300 rounded-xl p-3.5 pl-10 text-sm font-semibold text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>

                {/* To Suggestions Dropdown */}
                {Array.isArray(toSuggestions) && toSuggestions.length > 0 && (
                  <div className="absolute z-30 bg-white border border-slate-200 rounded-xl shadow-lg mt-1 w-full max-h-56 overflow-y-auto divide-y divide-slate-100">
                    {toSuggestions.map((st, idx) => {
                      const code = typeof st === "object" ? st.code : st;
                      const name = typeof st === "object" ? st.name : "";
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setTo(code);
                            setToSuggestions([]);
                          }}
                          className="w-full p-3 text-left hover:bg-slate-50 flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <div>
                            <span className="font-bold text-slate-900 text-sm">{code}</span>
                            {name && <span className="text-xs text-slate-500 block">{name}</span>}
                          </div>
                          <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded">Station</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* DATE PICKER & BUTTON */}
              <div className="flex flex-col justify-between">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Journey Date
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="date"
                      value={journeyDate}
                      onChange={(e) => setJourneyDate(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl p-3.5 text-sm font-semibold text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={searchTrains}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3.5 rounded-xl transition-colors shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Search className="w-4 h-4" />
                    <span>{loading ? "Searching..." : "Search"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Route Shortcuts */}
            <div className="mt-4 pt-3 border-t border-slate-200/60 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">Quick Route Shortcuts:</span>
              <button
                type="button"
                onClick={() => { setFrom("MYS"); setTo("SBC"); }}
                className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100 transition-colors"
              >
                MYS ➔ SBC (Mysuru - Bengaluru)
              </button>
              <button
                type="button"
                onClick={() => { setFrom("PUNE"); setTo("CSMT"); }}
                className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100 transition-colors"
              >
                PUNE ➔ CSMT (Pune - Mumbai)
              </button>
            </div>
          </div>
        </section>

        {/* Error Notification */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl flex items-center gap-3 text-sm font-semibold">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Search Results Section */}
        {hasSearched && (
          <section className="space-y-4">
            {/* Search Input directly ABOVE "Active Trains Available" section */}
            {showActiveSearch && (
              <div className="relative max-w-md">
                <label htmlFor="active-train-search-input" className="sr-only">
                  Search active trains by number, code, or name
                </label>
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="active-train-search-input"
                  type="text"
                  value={activeSearchQuery}
                  onChange={(e) => setActiveSearchQuery(e.target.value)}
                  placeholder="Search train by number, code, or name..."
                  aria-label="Search active trains by number, code, or name"
                  className="w-full bg-white border border-slate-300 rounded-xl p-3 pl-10 pr-8 text-xs font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-xs"
                />
                {activeSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setActiveSearchQuery('')}
                    aria-label="Clear active train search"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Train className="w-5 h-5 text-blue-600" />
                <span>Active Trains Available ({filteredTrains.length})</span>
              </h2>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowActiveSearch(!showActiveSearch);
                    if (showActiveSearch) setActiveSearchQuery('');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 text-xs font-bold shadow-2xs cursor-pointer"
                  aria-label="Toggle active train search"
                >
                  <Search className="w-3.5 h-3.5 text-blue-600" />
                  <span>{showActiveSearch ? "Close Search" : "Search"}</span>
                </button>
                <span className="text-xs text-slate-500 font-semibold hidden sm:inline">
                  Live Data Source: RailRadar API
                </span>
              </div>
            </div>

            {loading ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm font-semibold text-slate-600">Querying live RailRadar train data...</p>
              </div>
            ) : trains.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-2">
                <Train className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-lg font-bold text-slate-800">No Trains Found</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  No active direct trains were returned for route {from} ➔ {to}. Try another date or station pair.
                </p>
              </div>
            ) : filteredTrains.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-2">
                <Train className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-lg font-bold text-slate-800">No Trains Found</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  No active trains match "<span className="font-medium text-slate-800">{activeSearchQuery}</span>". Try searching by another train number, code, or name.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredTrains.map((trainItem, index) => (
                  <TrainCard
                    key={index}
                    train={trainItem}
                    from={from}
                    to={to}
                    trackTrain={trackTrain}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
