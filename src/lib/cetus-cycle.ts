// Cetus day/night cycle calculation
// Day cycle: 100 minutes, Night cycle: 50 minutes
// Total cycle: 150 minutes (9000 seconds)

const CETUS_DAY_DURATION = 100 * 60 * 1000; // 100 minutes in ms
const CETUS_NIGHT_DURATION = 50 * 60 * 1000; // 50 minutes in ms
const CETUS_CYCLE_DURATION = CETUS_DAY_DURATION + CETUS_NIGHT_DURATION; // 150 minutes in ms

// LocalStorage key for client-synced timestamp
const STORAGE_KEY = 'cetus_cycle_reference';
const STORAGE_SYNCED_AT_KEY = 'cetus_synced_at';

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

// Load cached reference from localStorage
function loadFromStorage(): { cycleStart: number; syncedAt: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const syncedAt = localStorage.getItem(STORAGE_SYNCED_AT_KEY);
    if (stored && syncedAt) {
      const cycleStart = parseInt(stored, 10);
      const syncedAtMs = parseInt(syncedAt, 10);
      // Only use if synced within last 24 hours (cycle math is deterministic)
      if (Date.now() - syncedAtMs < 24 * 60 * 60 * 1000) {
        return { cycleStart, syncedAt: syncedAtMs };
      }
    }
  } catch {
    // localStorage not available
  }
  return null;
}

// Save reference to localStorage
function saveToStorage(cycleStart: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, cycleStart.toString());
    localStorage.setItem(STORAGE_SYNCED_AT_KEY, Date.now().toString());
  } catch {
    // localStorage not available
  }
}

// Fetch DIRECTLY from Warframe API in the browser (bypasses cloud IP blocks)
async function fetchDirectFromWarframeApi(): Promise<{ cycleStart: number; cycleEnd: number } | null> {
  if (typeof window === 'undefined') return null; // Only run client-side

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch('https://content.warframe.com/dynamic/worldState.php', {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeout);

    if (!response.ok) return null;

    const data: WorldStateResponse = await response.json();
    const cetusMission = data.SyndicateMissions?.find(m => m.Tag === 'CetusSyndicate');

    if (cetusMission?.Activation?.$date?.$numberLong && cetusMission?.Expiry?.$date?.$numberLong) {
      const cycleStart = parseInt(cetusMission.Activation.$date.$numberLong, 10);
      const cycleEnd = parseInt(cetusMission.Expiry.$date.$numberLong, 10);

      // Validate timestamps
      if (cycleStart > 1577836800000 && cycleEnd > cycleStart) {
        console.log('[Cetus] Direct API fetch successful:', { cycleStart, cycleEnd });
        return { cycleStart, cycleEnd };
      }
    }
  } catch (error) {
    console.log('[Cetus] Direct API fetch failed (expected on some networks):', error);
  }
  return null;
}

// Fetch cycle data via our API route (server-side, uses Edge Config)
export async function fetchCetusCycleFromApi(): Promise<{ cycleStart: number; cycleEnd: number; source?: string } | null> {
  try {
    const response = await fetch('/api/cetus');
    if (!response.ok) return null;

    const data = await response.json();
    if (data.cycleStart && data.cycleEnd) {
      return { cycleStart: data.cycleStart, cycleEnd: data.cycleEnd, source: data.source };
    }
  } catch (error) {
    console.error('Failed to fetch Cetus cycle from API:', error);
  }
  return null;
}

// Sync with API (call this periodically)
// Priority: 1) Direct browser fetch 2) Server API 3) LocalStorage 4) Hardcoded fallback
export async function syncCetusCycle(): Promise<string> {
  const now = Date.now();
  if (now - lastFetchTime < CACHE_DURATION && cachedCycleStart !== null) {
    return 'cached'; // Use in-memory cached data
  }

  // 1. Try direct browser fetch to Warframe API (user's IP isn't blocked)
  const directData = await fetchDirectFromWarframeApi();
  if (directData) {
    cachedCycleStart = directData.cycleStart;
    lastFetchTime = now;
    saveToStorage(directData.cycleStart);
    return 'direct-api';
  }

  // 2. Try server API (Edge Config or fallback)
  const apiData = await fetchCetusCycleFromApi();
  if (apiData) {
    cachedCycleStart = apiData.cycleStart;
    lastFetchTime = now;
    if (apiData.source !== 'calculated') {
      saveToStorage(apiData.cycleStart);
    }
    return apiData.source || 'server-api';
  }

  // 3. Try localStorage cache
  const stored = loadFromStorage();
  if (stored) {
    cachedCycleStart = stored.cycleStart;
    lastFetchTime = now;
    return 'localStorage';
  }

  // 4. Will use hardcoded fallback in getCetusCycleState
  return 'fallback';
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
  // Using verified cycle start from Dec 13, 2025 API response
  const FALLBACK_EPOCH = 1765688923671;
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
