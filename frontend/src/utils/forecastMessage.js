/**
 * Formats a deterministic natural-language explanation for train delay forecasts.
 * 
 * Rules:
 * 1. Uses live current delay for "currently X minutes late/ahead".
 * 2. Uses Next Stop parameters if available for primary statement.
 * 3. Uses deterministic templates (No LLMs / non-deterministic generation).
 */

export function generateForecastMessage(params) {
  const {
    currentDelayMinutes = 0,
    nextStationName = null,
    nextExpectedArrival = null,
    nextEarliest = null,
    nextLatest = null,
    expectedDelayMinutes = 0,
    lowerDelayMinutes = null,
    upperDelayMinutes = null,
    calibrated = false
  } = params || {};

  const currentDelay = Math.round(Number(currentDelayMinutes) || 0);

  // 1. Current State Segment
  let currentSegment = "";
  if (currentDelay > 0) {
    currentSegment = `The train is currently ${currentDelay} minutes late`;
  } else if (currentDelay < 0) {
    currentSegment = `The train is currently ${Math.abs(currentDelay)} minutes ahead of schedule`;
  } else {
    currentSegment = `The train is currently running on time`;
  }

  // 2. Next Stop Primary Segment
  if (nextStationName && nextExpectedArrival && nextExpectedArrival !== "--:--") {
    let nextSegment = ` and is expected to reach ${nextStationName} around ${nextExpectedArrival}`;
    if (calibrated && nextEarliest && nextLatest && nextEarliest !== "--:--" && nextLatest !== "--:--") {
      nextSegment += `. Arrival is likely between ${nextEarliest} and ${nextLatest}.`;
    } else {
      nextSegment += `.`;
    }
    return `${currentSegment}${nextSegment}`;
  }

  // 3. Destination Fallback Segment
  const expectedDelay = Math.round(Number(expectedDelayMinutes) || 0);
  let expectedSegment = "";
  if (expectedDelay > 0) {
    expectedSegment = ` and is expected to arrive at the destination ${expectedDelay} min late`;
  } else if (expectedDelay < 0) {
    expectedSegment = ` and is expected to arrive at the destination ${Math.abs(expectedDelay)} min early`;
  } else {
    expectedSegment = ` and is expected to arrive at the destination on time`;
  }

  let rangeSegment = "";
  if (calibrated && lowerDelayMinutes !== null && upperDelayMinutes !== null) {
    const lower = Math.round(Number(lowerDelayMinutes));
    const upper = Math.round(Number(upperDelayMinutes));
    if (lower >= 0 && upper >= 0) {
      rangeSegment = ` (likely range: ${lower} to ${upper} min late).`;
    } else if (lower < 0 && upper < 0) {
      rangeSegment = ` (likely range: ${Math.abs(upper)} to ${Math.abs(lower)} min early).`;
    } else {
      rangeSegment = ` (likely range: ${lower < 0 ? Math.abs(lower) + ' min early' : lower + ' min late'} to ${upper} min late).`;
    }
  } else {
    rangeSegment = ".";
  }

  return `${currentSegment}${expectedSegment}${rangeSegment}`;
}
