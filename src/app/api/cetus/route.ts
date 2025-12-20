import { get } from '@vercel/edge-config';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const CETUS_DAY_MS = 100 * 60 * 1000; // 100 minutes
const CETUS_CYCLE_MS = 150 * 60 * 1000; // 150 minutes total
const STALE_THRESHOLD_MS = 60 * 60 * 1000; // Refresh if data > 1 hour old

interface WorldStateResponse {
  SyndicateMissions?: Array<{
    Tag: string;
    Activation: { $date: { $numberLong: string } };
    Expiry: { $date: { $numberLong: string } };
  }>;
}

// Fetch fresh data from Warframe API (server-side, no CORS)
async function fetchFromWarframeApi(): Promise<{ cycleStart: number; cycleEnd: number } | null> {
  try {
    const response = await fetch('https://content.warframe.com/dynamic/worldState.php', {
      headers: { 'User-Agent': 'WarframeClox/1.0' },
      cache: 'no-store',
    });

    if (!response.ok) return null;

    const data: WorldStateResponse = await response.json();
    const cetusMission = data.SyndicateMissions?.find(m => m.Tag === 'CetusSyndicate');

    if (!cetusMission?.Activation?.$date?.$numberLong || !cetusMission?.Expiry?.$date?.$numberLong) {
      return null;
    }

    return {
      cycleStart: parseInt(cetusMission.Activation.$date.$numberLong, 10),
      cycleEnd: parseInt(cetusMission.Expiry.$date.$numberLong, 10),
    };
  } catch {
    return null;
  }
}

// Update Edge Config with fresh data
async function updateEdgeConfig(cycleStart: number, cycleEnd: number): Promise<boolean> {
  const token = process.env.VERCEL_ACCESS_TOKEN;
  const configId = process.env.EDGE_CONFIG_ID;

  if (!token || !configId) return false;

  try {
    const response = await fetch(`https://api.vercel.com/v1/edge-config/${configId}/items`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          { operation: 'upsert', key: 'cetus_start', value: cycleStart },
          { operation: 'upsert', key: 'cetus_end', value: cycleEnd },
          { operation: 'upsert', key: 'synced_at', value: Date.now() },
        ],
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

export async function GET() {
  const startTime = Date.now();
  const now = Date.now();

  try {
    // 1. Read from Edge Config
    const cetusStart = await get<number>('cetus_start');
    const cetusEnd = await get<number>('cetus_end');
    const syncedAt = await get<number>('synced_at');

    const isStale = !syncedAt || (now - syncedAt) > STALE_THRESHOLD_MS;
    const hasData = cetusStart && cetusEnd;

    // 2. If stale or no data, fetch fresh from Warframe API
    if (isStale || !hasData) {
      const freshData = await fetchFromWarframeApi();

      if (freshData) {
        // Update Edge Config in background (don't wait)
        updateEdgeConfig(freshData.cycleStart, freshData.cycleEnd);

        // Return fresh data directly from API
        return Response.json({
          cycleStart: freshData.cycleStart,
          cycleEnd: freshData.cycleEnd,
          isDay: (now - freshData.cycleStart) < CETUS_DAY_MS,
          state: (now - freshData.cycleStart) < CETUS_DAY_MS ? 'day' : 'night',
          fetchedAt: now,
          source: 'warframe-api-fresh',
          syncedAt: now,
          responseTime: Date.now() - startTime,
        });
      }

      // API failed but we have stale data - use it
      if (hasData) {
        return Response.json({
          cycleStart: cetusStart,
          cycleEnd: cetusEnd,
          isDay: (now - cetusStart!) < CETUS_DAY_MS,
          state: (now - cetusStart!) < CETUS_DAY_MS ? 'day' : 'night',
          fetchedAt: now,
          source: 'edge-config-stale',
          syncedAt,
          warning: 'API fetch failed, using stale data',
          responseTime: Date.now() - startTime,
        });
      }

      // No data at all - use hardcoded fallback
      const FALLBACK_START = 1766246853909;
      return Response.json({
        cycleStart: FALLBACK_START,
        cycleEnd: FALLBACK_START + CETUS_CYCLE_MS,
        isDay: ((now - FALLBACK_START) % CETUS_CYCLE_MS) < CETUS_DAY_MS,
        state: ((now - FALLBACK_START) % CETUS_CYCLE_MS) < CETUS_DAY_MS ? 'day' : 'night',
        fetchedAt: now,
        source: 'fallback',
        warning: 'No Edge Config data and API failed',
        responseTime: Date.now() - startTime,
      });
    }

    // 3. Data is fresh - return it
    return Response.json({
      cycleStart: cetusStart,
      cycleEnd: cetusEnd,
      isDay: (now - cetusStart!) < CETUS_DAY_MS,
      state: (now - cetusStart!) < CETUS_DAY_MS ? 'day' : 'night',
      fetchedAt: now,
      source: 'edge-config',
      syncedAt,
      responseTime: Date.now() - startTime,
    });

  } catch (error) {
    // Edge Config read failed - try API directly
    const freshData = await fetchFromWarframeApi();
    
    if (freshData) {
      return Response.json({
        cycleStart: freshData.cycleStart,
        cycleEnd: freshData.cycleEnd,
        isDay: (Date.now() - freshData.cycleStart) < CETUS_DAY_MS,
        state: (Date.now() - freshData.cycleStart) < CETUS_DAY_MS ? 'day' : 'night',
        fetchedAt: Date.now(),
        source: 'warframe-api-fallback',
        responseTime: Date.now() - startTime,
      });
    }

    // Everything failed
    const FALLBACK_START = 1766246853909;
    return Response.json({
      cycleStart: FALLBACK_START,
      cycleEnd: FALLBACK_START + CETUS_CYCLE_MS,
      isDay: ((Date.now() - FALLBACK_START) % CETUS_CYCLE_MS) < CETUS_DAY_MS,
      state: ((Date.now() - FALLBACK_START) % CETUS_CYCLE_MS) < CETUS_DAY_MS ? 'day' : 'night',
      fetchedAt: Date.now(),
      source: 'fallback',
      error: 'All sources failed',
      responseTime: Date.now() - startTime,
    });
  }
}
