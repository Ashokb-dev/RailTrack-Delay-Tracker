export default function LiveStationTimeline({
  stations = []
}) {

  return (

    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">

      {/* HEADER */}

      <div className="mb-6">

        <h2 className="text-3xl font-bold text-slate-800">

          🚆 Train Journey Timeline

        </h2>

        <p className="text-slate-500 mt-1">

          Live railway status with AI prediction

        </p>

      </div>

      {/* EMPTY */}

      {

        stations.length === 0 && (

          <div className="text-center py-16">

            <div className="text-6xl">

              🚉

            </div>

            <h2 className="text-2xl font-bold mt-4">

              No Train Data

            </h2>

          </div>

        )

      }

      {/* STATIONS */}

      <div className="space-y-5">

        {

          stations.map((station, index) => {

            const isLive =
              station.type === "real";

            const delay =
              Number(station.delay || 0);

            return (

              <div
                key={index}
                className={`
  border rounded-2xl p-5

  ${
    index % 2 === 0

      ? "bg-orange-50 border-orange-100"

      : "bg-blue-50 border-blue-100"

  }
`}
              >

                {/* TOP */}

                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

                  <div>

                    <div className="flex items-center gap-3">

                      <h2 className="text-2xl font-bold text-slate-800">

                        {station.station}

                      </h2>

                      

                    </div>

                    <p className="text-slate-500 mt-1">

  Railway Station Status

</p>

                  </div>

                  {/* DELAY */}

                  <div>

                   {

  delay > 0 && (

    <div className="bg-red-100 text-red-600 px-4 py-2 rounded-xl text-sm font-semibold">

      +{delay} mins delay

    </div>

  )

}

{

  delay === 0 && (

    <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-xl text-sm font-semibold">

      On Time

    </div>

  )

}

{

  delay < 0 && (

    <div className="bg-green-100 text-green-700 px-4 py-2 rounded-xl text-sm font-semibold">

      {Math.abs(delay)} mins early

    </div>

  )

}

                  </div>

                </div>

                {/* TIMES */}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">

                  {/* SCHEDULED */}

                  <div className="bg-white rounded-2xl border p-4">

                    <p className="text-sm text-slate-500">

                      Scheduled

                    </p>

                    <h3 className="text-3xl font-bold mt-2">

                      {
                        station.scheduled_time
                        || "--:--"
                      }

                    </h3>

                  </div>

                  {/* ACTUAL */}

                  <div className="bg-white rounded-2xl border p-4">

                    <p className="text-sm text-slate-500">

                      Actual

                    </p>

                    <h3 className="text-3xl font-bold mt-2 text-blue-600">

                      {
                        station.actual_time
                        || "--:--"
                      }

                    </h3>

                  </div>

                  {/* PREDICTED */}

                  <div className="bg-white rounded-2xl border p-4">

                    <p className="text-sm text-slate-500">

                      Predicted

                    </p>

                    <h3 className="text-3xl font-bold mt-2 text-orange-500">

                      {
                        station.predicted_time
                        || "--:--"
                      }

                    </h3>

                  </div>

                </div>

              </div>

            );

          })

        }

      </div>

    </div>

  );

}