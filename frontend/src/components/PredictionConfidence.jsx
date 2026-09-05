export default function PredictionConfidence({
  confidence
}) {

  return (

    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">

      <div className="flex items-center justify-between">

        <div>

          <p className="text-slate-500">

            AI Prediction Confidence

          </p>

          <h2 className="text-5xl font-bold text-green-500 mt-3">

            {confidence}%

          </h2>

        </div>

        <div className="text-6xl">

          🎯

        </div>

      </div>

    </div>

  );

}