/**
 * Adds fractional delay minutes to a time string in "HH:MM" format.
 * Correctly handles positive delay, negative delay, midnight rollover, and next-day rollover.
 * Returns "--:--" if inputs are invalid or delayMinutes is null.
 * 
 * @param {string} timeStr - Time in "HH:MM" format
 * @param {number|null} delayMinutes - Delay in minutes
 * @returns {string} Formatted "HH:MM" or "--:--"
 */
export function addMinutesToHHMM(timeStr, delayMinutes) {
  if (
    !timeStr ||
    typeof timeStr !== "string" ||
    timeStr.includes("--") ||
    !timeStr.includes(":") ||
    delayMinutes === null ||
    delayMinutes === undefined ||
    typeof delayMinutes !== "number" ||
    isNaN(delayMinutes)
  ) {
    return "--:--";
  }

  const parts = timeStr.split(":");
  if (parts.length !== 2) return "--:--";

  const hh = parseInt(parts[0], 10);
  const mm = parseInt(parts[1], 10);

  if (isNaN(hh) || isNaN(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) {
    return "--:--";
  }

  const scheduledMins = hh * 60 + mm;
  const predictedMins = scheduledMins + delayMinutes;
  
  // Round to nearest integer minute for HH:MM format
  let roundMins = Math.round(predictedMins);

  // Normalize to 0 .. 1439 (24-hour day)
  let normalizedMins = roundMins % (24 * 60);
  if (normalizedMins < 0) {
    normalizedMins += 24 * 60;
  }

  const resHours = Math.floor(normalizedMins / 60) % 24;
  const resMins = normalizedMins % 60;

  return `${String(resHours).padStart(2, "0")}:${String(resMins).padStart(2, "0")}`;
}
