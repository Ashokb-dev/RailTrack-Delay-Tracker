export default function SearchBar({

  from,
  to,
  journeyDate,

  setFrom,
  setTo,
  setJourneyDate,

  searchTrains,
  loading

}) {

  return (

    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

        <input
          value={from}
          onChange={(e) =>
            setFrom(e.target.value)
          }
          placeholder="FROM"
          className="border rounded-2xl p-4 outline-none"
        />

        <input
          value={to}
          onChange={(e) =>
            setTo(e.target.value)
          }
          placeholder="TO"
          className="border rounded-2xl p-4 outline-none"
        />

        <input
          type="date"
          value={journeyDate}
          onChange={(e) =>
            setJourneyDate(
              e.target.value
            )
          }
          className="border rounded-2xl p-4 outline-none"
        />

        <button
          onClick={searchTrains}
          className="bg-slate-800 text-white rounded-2xl font-bold hover:bg-slate-900 transition-all"
        >

          {
            loading
              ? "Searching..."
              : "Track Train"
          }

        </button>

      </div>

    </div>

  );

}