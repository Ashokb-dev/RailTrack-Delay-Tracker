/**
 * Phase 6B Evaluator Metrics Engine
 * Calculates Primary (Fresh) and Secondary (Stale) metrics with sample size interpretation labels.
 */

const config = require('./config');

function getSampleSizeLabel(N) {
  if (N < 10) return "Insufficient real-world observations";
  if (N < 50) return `Preliminary evaluation (N = ${N})`;
  if (N < 200) return `Intermediate evaluation (N = ${N})`;
  return `Extended evaluation (N = ${N})`;
}

function computeMetricsForSubset(matchedPairs) {
  if (!Array.isArray(matchedPairs) || matchedPairs.length === 0) {
    return null;
  }
  const N = matchedPairs.length;
  const absErrors = matchedPairs.map(p => p.absoluteError).sort((a, b) => a - b);
  const sqErrors = matchedPairs.map(p => p.squaredError);
  
  const mae = absErrors.reduce((sum, e) => sum + e, 0) / N;
  const rmse = Math.sqrt(sqErrors.reduce((sum, e) => sum + e, 0) / N);
  
  const midIndex = Math.floor(N / 2);
  const medAe = N % 2 !== 0 ? absErrors[midIndex] : (absErrors[midIndex - 1] + absErrors[midIndex]) / 2;

  const calibratedPairs = matchedPairs.filter(p => typeof p.isCovered === "boolean");
  const coveredCount = calibratedPairs.filter(p => p.isCovered === true).length;
  const empiricalCoveragePct = calibratedPairs.length > 0 ? (coveredCount / calibratedPairs.length) * 100 : null;

  const widthPairs = matchedPairs.filter(p => typeof p.intervalWidth === "number");
  const meanIntervalWidth = widthPairs.length > 0 ? widthPairs.reduce((sum, p) => sum + p.intervalWidth, 0) / widthPairs.length : null;

  const winklerPairs = matchedPairs.filter(p => typeof p.winklerScore === "number");
  const meanWinklerScore = winklerPairs.length > 0 ? winklerPairs.reduce((sum, p) => sum + p.winklerScore, 0) / winklerPairs.length : null;

  return {
    sampleCount: N,
    mae: Math.round(mae * 100) / 100,
    rmse: Math.round(rmse * 100) / 100,
    medAe: Math.round(medAe * 100) / 100,
    empiricalCoveragePct: empiricalCoveragePct !== null ? Math.round(empiricalCoveragePct * 100) / 100 : null,
    meanIntervalWidth: meanIntervalWidth !== null ? Math.round(meanIntervalWidth * 100) / 100 : null,
    meanWinklerScore: meanWinklerScore !== null ? Math.round(meanWinklerScore * 100) / 100 : null
  };
}

function computeSummaryMetrics(matchedPairs = []) {
  const validPairs = matchedPairs.filter(p => p.validArrivalOutcome === true);
  const totalN = validPairs.length;
  const sampleLabel = getSampleSizeLabel(totalN);

  if (totalN < config.MIN_REQUIRED_OBSERVATIONS) {
    return {
      status: "INSUFFICIENT_DATA",
      sampleLabel,
      message: `Insufficient real-world observations (requires N >= ${config.MIN_REQUIRED_OBSERVATIONS}, current N = ${totalN})`,
      sampleCount: totalN
    };
  }

  const primaryFresh = validPairs.filter(p => p.telemetryStatus === "fresh");
  const secondaryStale = validPairs.filter(p => p.telemetryStatus === "stale");
  const notLiveOrUnknown = validPairs.filter(p => p.telemetryStatus === "not_live" || p.telemetryStatus === "unknown");

  return {
    status: totalN < 50 ? "PRELIMINARY" : (totalN < 200 ? "INTERMEDIATE" : "EXTENDED"),
    sampleLabel,
    totalSampleCount: totalN,
    primaryMetrics: computeMetricsForSubset(primaryFresh) || computeMetricsForSubset(validPairs),
    secondaryMetrics: computeMetricsForSubset(secondaryStale),
    unratedCount: notLiveOrUnknown.length
  };
}

module.exports = {
  getSampleSizeLabel,
  computeSummaryMetrics
};
