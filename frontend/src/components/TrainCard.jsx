export default function TrainCard({ train, from, to, trackTrain }) {
  return (
    <div className="bg-white rounded-3xl border shadow-sm p-6 flex justify-between items-center">
      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-3xl font-bold text-slate-800">
            {train.trainNumber}
          </h2>
          <div className="bg-green-100 text-green-700 px-3 py-1 rounded-xl text-sm font-bold">
            LIVE
          </div>
        </div>

        <p className="text-xl text-slate-600 mt-2 font-semibold">
          {train.trainName}
        </p>

        <p className="text-slate-500 mt-1">
          {train.from || from} → {train.to || to}
          {train.departureTime && train.arrivalTime && (
            <span className="ml-3 text-slate-400 text-sm font-normal">
              ({train.departureTime} - {train.arrivalTime})
            </span>
          )}
        </p>
      </div>

      <button
        onClick={() => trackTrain(train)}
        className="bg-slate-800 text-white px-6 py-3 rounded-2xl font-bold hover:bg-slate-900 transition-all cursor-pointer"
      >
        Track
      </button>
    </div>
  );
}