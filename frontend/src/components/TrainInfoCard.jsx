export default function TrainInfoCard({

  train,
  from,
  to,
  journeyDate

}) {

  return (

    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">

      <div className="flex flex-col lg:flex-row lg:justify-between gap-6">

        <div>

          <p className="text-slate-400 text-sm">

            Train Number

          </p>

          <h1 className="text-5xl font-bold text-slate-800">

            {train?.trainNumber}

          </h1>

          <h2 className="text-2xl text-slate-600 mt-2">

            {train?.trainName}

          </h2>

        </div>

        <div>

          <p className="text-slate-400 text-sm">

            Route

          </p>

          <h2 className="text-4xl font-bold">

            {from} → {to}

          </h2>

        </div>

        <div>

          <p className="text-slate-400 text-sm">

            Journey Date

          </p>

          <h2 className="text-3xl font-bold text-orange-500">

            {journeyDate}

          </h2>

        </div>

      </div>

    </div>

  );

}