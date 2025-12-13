/**
 * Clock rotation calculation engine
 *
 * All three discs start at 12 o'clock (0°) at cycle start and rotate clockwise.
 * - Outer disc: completes 360° over the full cycle duration
 * - Middle disc: completes 360° every 60 seconds (real-world minute)
 * - Inner disc: completes 360° every second (real-world second)
 */

export interface RotationSpeeds {
  outer: number; // degrees per second
  middle: number; // degrees per second (constant: 6)
  inner: number; // degrees per second (constant: 360)
}

export interface DiscPositions {
  outer: number; // current degrees (0-360)
  middle: number; // current degrees (0-360)
  inner: number; // current degrees (0-360)
}

/**
 * Calculate rotation speeds for all three discs
 * @param cycleDurationMinutes - Duration of current cycle in minutes
 */
export function calculateRotationSpeeds(cycleDurationMinutes: number): RotationSpeeds {
  return {
    // Outer: one full rotation per cycle
    outer: 360 / (cycleDurationMinutes * 60),
    // Middle: one full rotation per minute (constant)
    middle: 6,
    // Inner: one full rotation per second (constant)
    inner: 360,
  };
}

/**
 * Calculate current disc positions based on elapsed time since cycle start
 * @param cycleStartTimestamp - Unix timestamp (ms) when current cycle started
 * @param cycleDurationMinutes - Duration of current cycle in minutes
 */
export function calculateCurrentPositions(
  cycleStartTimestamp: number,
  cycleDurationMinutes: number
): DiscPositions {
  const now = Date.now();
  const elapsedMs = now - cycleStartTimestamp;
  const elapsedSeconds = elapsedMs / 1000;

  const cycleDurationSeconds = cycleDurationMinutes * 60;

  // Outer disc: progress through entire cycle
  const outerProgress = elapsedSeconds / cycleDurationSeconds;
  const outerDegrees = (outerProgress * 360) % 360;

  // Middle disc: progress through current minute
  const middleProgress = (elapsedSeconds % 60) / 60;
  const middleDegrees = middleProgress * 360;

  // Inner disc: progress through current second
  const innerProgress = (elapsedMs % 1000) / 1000;
  const innerDegrees = innerProgress * 360;

  return {
    outer: outerDegrees,
    middle: middleDegrees,
    inner: innerDegrees,
  };
}

/**
 * Calculate initial positions for page load
 * This is a convenience wrapper around calculateCurrentPositions
 */
export function calculateInitialPositions(
  cycleStartTimestamp: number,
  cycleDurationMinutes: number
): DiscPositions {
  return calculateCurrentPositions(cycleStartTimestamp, cycleDurationMinutes);
}
