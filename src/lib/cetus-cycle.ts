// Cetus day/night cycle calculation
// Day cycle: 100 minutes, Night cycle: 50 minutes
// Total cycle: 150 minutes (9000 seconds)

const CETUS_DAY_DURATION = 100 * 60 * 1000; // 100 minutes in ms
const CETUS_NIGHT_DURATION = 50 * 60 * 1000; // 50 minutes in ms
const CETUS_CYCLE_DURATION = CETUS_DAY_DURATION + CETUS_NIGHT_DURATION; // 150 minutes in ms

// Cached API data for cycle sync
let cachedCycleStart: number | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // Refresh API data every 5 minutes

export interface CetusCycleState {
  isDay: boolean;
  state: 'day' | 'night';
  timeLeftMs: number;
  timeLeftFormatted: string;
  nextCycleTime: Date;
  percentComplete: number;
  isFromApi: boolean;
}

interface WorldStateResponse {
  SyndicateMissions?: Array<{
    Tag: string;
    Activation: { $date: { $numberLong: string } };
    Expiry: { $date: { $numberLong: string } };
  }>;
}

// Fetch cycle data via our API route (avoids CORS issues)
export async function fetchCetusCycleFromApi(): Promise<{ cycleStart: number; cycleEnd: number } | null> {
  try {
    const response = await fetch('/api/cetus');
    if (!response.ok) return null;

    const data = await response.json();
    if (data.cycleStart && data.cycleEnd) {
      return { cycleStart: data.cycleStart, cycleEnd: data.cycleEnd };
    }
  } catch (error) {
    console.error('Failed to fetch Cetus cycle from API:', error);
  }
  return null;
}

// Sync with API (call this periodically)
export async function syncCetusCycle(): Promise<void> {
  const now = Date.now();
  if (now - lastFetchTime < CACHE_DURATION && cachedCycleStart !== null) {
    return; // Use cached data
  }

  const apiData = await fetchCetusCycleFromApi();
  if (apiData) {
    cachedCycleStart = apiData.cycleStart;
    lastFetchTime = now;
  }
}

export function getCetusCycleState(now: Date = new Date()): CetusCycleState {
  const currentTime = now.getTime();

  // If we have API data, use it for accurate sync
  if (cachedCycleStart !== null) {
    // The API gives us the start of the current 150-minute cycle (day start)
    // Calculate position within the cycle
    const timeSinceCycleStart = currentTime - cachedCycleStart;

    // Handle case where we've moved past the cached cycle
    const positionInCycle = timeSinceCycleStart >= 0
      ? timeSinceCycleStart % CETUS_CYCLE_DURATION
      : CETUS_CYCLE_DURATION + (timeSinceCycleStart % CETUS_CYCLE_DURATION);

    return calculateCycleState(currentTime, positionInCycle, true);
  }

  // Fallback: Use calculation based on known cycle pattern
  // The cycle repeats every 150 minutes from a known reference
  // Using a recent known cycle start for accuracy
  const FALLBACK_EPOCH = 1765580937174; // From API fetch on Dec 12, 2025
  const timeSinceEpoch = currentTime - FALLBACK_EPOCH;
  const positionInCycle = ((timeSinceEpoch % CETUS_CYCLE_DURATION) + CETUS_CYCLE_DURATION) % CETUS_CYCLE_DURATION;

  return calculateCycleState(currentTime, positionInCycle, false);
}

function calculateCycleState(currentTime: number, positionInCycle: number, isFromApi: boolean): CetusCycleState {
  // Determine if it's day or night
  const isDay = positionInCycle < CETUS_DAY_DURATION;

  // Calculate time remaining in current phase
  let timeLeftMs: number;
  let percentComplete: number;

  if (isDay) {
    timeLeftMs = CETUS_DAY_DURATION - positionInCycle;
    percentComplete = (positionInCycle / CETUS_DAY_DURATION) * 100;
  } else {
    const positionInNight = positionInCycle - CETUS_DAY_DURATION;
    timeLeftMs = CETUS_NIGHT_DURATION - positionInNight;
    percentComplete = (positionInNight / CETUS_NIGHT_DURATION) * 100;
  }

  const nextCycleTime = new Date(currentTime + timeLeftMs);

  return {
    isDay,
    state: isDay ? 'day' : 'night',
    timeLeftMs,
    timeLeftFormatted: formatTimeLeft(timeLeftMs),
    nextCycleTime,
    percentComplete,
    isFromApi,
  };
}

export function formatTimeLeft(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  // Always show hours in format 00:00:00
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function formatNextCycleTime(date: Date): string {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

// Constants for notification timing
export const NOTIFICATION_WARNING_TIME = 5 * 60 * 1000; // 5 minutes before transition
