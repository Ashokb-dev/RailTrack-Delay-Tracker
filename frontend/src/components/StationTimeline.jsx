import {
  FaTrain,
  FaCheckCircle,
  FaClock
} from "react-icons/fa";

export default function StationTimeline({ stations }) {

  return (

    <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-6">

      <h2 className="text-2xl font-bold mb-6 text-slate-800">
        🚏 Live Station Timeline
      </h2>

      <div className="space-y-4">

        {
          stations?.map((station, index) => (

            <div
              key={index}
              className="flex items-center justify-between bg-slate-100 rounded-2xl p-4"
            >

              <div className="flex items-center gap-4">

                <div className="text-blue-600 text-2xl">
                  <FaTrain />
                </div>

                <div>

                  <h3 className="text-xl font-bold text-slate-800">
                    {station.stationName}
                  </h3>

                  <p className="text-slate-500 text-sm">
                    Platform {station.platform || '--'}
                  </p>

                </div>

              </div>

              <div className="text-right">

                <p className="font-bold text-lg">
                  {station.actualArrival || '--'}
                </p>

                {
                  station.delay > 0 ? (

                    <div className="flex items-center gap-2 text-red-500 font-semibold">
                      <FaClock />
                      +{station.delay} mins
                    </div>

                  ) : (

                    <div className="flex items-center gap-2 text-green-600 font-semibold">
                      <FaCheckCircle />
                      On Time
                    </div>

                  )
                }

              </div>

            </div>

          ))
        }

      </div>

    </div>

  );
}