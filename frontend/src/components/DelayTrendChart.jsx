import {

  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer

} from "recharts";

export default function DelayTrendChart({
  stations = []
}) {

  // ======================================
  // FORMAT DATA
  // ======================================

  const data =

    stations.map((station) => ({

      name:
        station.station,

      actualDelay:

        station.actual_time

          ? Number(
              station.delay || 0
            )

          : null,

      predictedDelay:

        Number(

          station.predicted_delay
          ||
          station.delay
          ||
          0

        )

    }));

  const CustomTooltip = ({ active, payload, label }) => {

    if (!active || !payload || payload.length === 0) {

      return null;

    }

    const actualDelay = payload[0]?.payload?.actualDelay;
    const predictedDelay = payload[0]?.payload?.predictedDelay;
    const hasActualDelay = actualDelay !== null && actualDelay !== undefined;
    const difference = hasActualDelay
      ? Number(predictedDelay || 0) - Number(actualDelay || 0)
      : null;

    return (

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">

        <p className="text-sm font-semibold text-slate-800">{label}</p>

        <div className="mt-3 space-y-2 text-sm">

          <div className="flex items-center justify-between gap-4">

            <span className="text-slate-500">Actual Delay</span>

            <span className="font-semibold text-blue-600">
              {hasActualDelay ? `${actualDelay} mins` : "N/A"}
            </span>

          </div>

          <div className="flex items-center justify-between gap-4">

            <span className="text-slate-500">Predicted Delay</span>

            <span className="font-semibold text-orange-500">
              {predictedDelay} mins
            </span>

          </div>

          <div className="flex items-center justify-between gap-4 border-t pt-2">

            <span className="text-slate-700 font-medium">Difference</span>

            <span
              className={`font-bold ${
                difference === null
                  ? "text-slate-400"
                  : difference > 0
                    ? "text-red-600"
                    : difference < 0
                      ? "text-green-600"
                      : "text-slate-700"
              }`}
            >
              {difference === null
                ? "N/A"
                : `${difference > 0 ? "+" : ""}${difference.toFixed(1)} mins`}
            </span>

          </div>

        </div>

      </div>

    );

  };

  return (

    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">

      {/* HEADER */}

      <div className="mb-6">

        <h2 className="text-3xl font-bold text-slate-800">

          📈 Delay Trend Analysis

        </h2>

        <p className="text-slate-500 mt-1">

          Live vs AI Predicted Delay

        </p>

      </div>

      {/* CHART */}

      <div className="w-full h-[500px]">

        <ResponsiveContainer
          width="100%"
          height="100%"
        >

          <LineChart

            data={data}

            margin={{

              top: 10,
              right: 20,
              left: 0,
              bottom: 10

            }}

          >

            {/* GRID */}

            <CartesianGrid
              strokeDasharray="3 3"
            />

            {/* X AXIS */}

            <XAxis
              dataKey="name"
            />

            {/* Y AXIS */}

            <YAxis
              width={50}
            />

            {/* TOOLTIP */}

            <Tooltip content={<CustomTooltip />} />

            {/* LEGEND */}

            <Legend />

            {/* ACTUAL DELAY */}

            <Line

              type="monotone"

              dataKey="actualDelay"

              name="Actual Delay"

              stroke="#2563eb"

              strokeWidth={3}

              dot={{
                r: 5
              }}

              activeDot={{
                r: 8
              }}

              connectNulls

            />

            {/* PREDICTED DELAY */}

            <Line

              type="monotone"

              dataKey="predictedDelay"

              name="Predicted Delay"

              stroke="#f97316"

              strokeWidth={3}

              dot={{
                r: 5
              }}

              activeDot={{
                r: 8
              }}

            />

          </LineChart>

        </ResponsiveContainer>

      </div>

    </div>

  );

}