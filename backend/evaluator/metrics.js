/**
 * Phase 6 Evaluator Metrics Engine
 * Calculates MAE, RMSE, MedAE, Empirical Coverage (%), Mean Width, and Winkler Score.
 * Enforces N >= 10 sample size threshold.
 */

const config = require('./config');

function computeSummaryMetrics(matchedPairs) {
  if (!Array.isArray(matchedPairs) || matchedPairs.length < config.MIN_REQUIRED_OBSERVATIONS) {
    return {
      status: "INSUFFICIENT_DATA",
      message: `Insufficient real-world observations (requires N >= ${config.MIN_REQUIRED_OBSERVATIONS}, current N = ${matchedPairs ? matchedPairs.length : 0})`,
      sampleCount: matchedPairs ? matchedPairs.length : 0
    };
  }

  const N = matchedPairs.length;
  const absErrors = matchedPairs.map(p => p.absoluteError).sort((a, b) => a - b);
  const sqErrors = matchedPairs.map(p => p.squaredError);
  
  const mae = absErrors.reduce((sum, e) => sum + e, 0) / N;
  const rmse = Math.sqrt(sqErrors.reduce((sum, e) => sum + e, 0) / N);
  
  const midIndex = Math.floor(N / 2);
  const medAe = N % 2 !== 0 ? absErrors[midIndex] : (absErrors[midIndex - 1] + absErrors[midIndex]) / 2;

  // Interval metrics
  const calibratedPairs = matchedPairs.filter(p => typeof p.isCovered === "boolean");
  const coveredCount = calibratedPairs.filter(p => p.isCovered === true).length;
  const empiricalCoveragePct = calibratedPairs.length > 0 ? (coveredCount / calibratedPairs.length) * 100 : null;

  const widthPairs = matchedPairs.filter(p => typeof p.intervalWidth === "number");
  const meanIntervalWidth = widthPairs.length > 0 ? widthPairs.reduce((sum, p) => sum + p.intervalWidth, 0) / widthPairs.length : null;

  const winklerPairs = matchedPairs.filter(p => typeof p.winklerScore === "number");
  const meanWinklerScore = winklerPairs.length > 0 ? winklerPairs.reduce((sum, p) => sum + p.winklerScore, 0) / winklerPairs.length : null;

  // Breakdown by Horizon
  const horizonBreakdown = {};
  const horizons = [...new Set(matchedPairs.map(p => p.horizon))];
  for (const h of horizons) {
    const subset = matchedPairs.filter(p => p.horizon === h);
    horizonBreakdown[h] = computeSummaryMetrics(subset);
  }

  // Breakdown by Telemetry Status
  const telemetryBreakdown = {};
  const statuses = [...new Set(matchedPairs.map(p => p.telemetryStatus))];
  for (const s of statuses) {
    const subset = matchedPairs.filter(p => p.telemetryStatus === s);
    telemetryBreakdown[s] = computeSummaryMetrics(subset);
  }

  return {
    status: "VALID_EVALUATION",
    sampleCount: N,
    mae: Math.round(mae * 100) / 100,
    rmse: Math.round(rmse * 100) / 100,
    medAe: Math.round(medAe * 100) / 100,
    empiricalCoveragePct: empiricalCoveragePct !== null ? Math.round(empiricalCoveragePct * 100) / 100 : null,
    meanIntervalWidth: meanIntervalWidth !== null ? Math.round(meanIntervalWidth * 100) / 100 : null,
    meanWinklerScore: meanWinklerScore !== null ? Math.round(meanWinklerScore * 100) / 100 : null,
    breakdownByHorizon: horizonBreakdown,
    breakdownByTelemetryStatus: telemetryBreakdown
  };
}

module.exports = {
  computeSummaryMetrics
};
