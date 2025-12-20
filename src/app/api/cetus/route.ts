import { get } from '@vercel/edge-config';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const CETUS_DAY_MS = 100 * 60 * 1000; // 100 minutes
const CETUS_CYCLE_MS = 150 * 60 * 1000; // 150 minutes total
const STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours - try to refresh after this
const WARN_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days - warn if data older than this

interface WorldStateResponse {
  SyndicateMissions?: Array<{
    Tag: string;
    Activation: { $date: { $numberLong: string } };
    Expiry: { $date: { $numberLong: string } };
  }>;
}

// Calculate cycle state from a reference start time
function calculateFromReference(referenceStart: number) {
  const now = Date.now();
  const timeSinceReference = now - referenceStart;
  const cyclePos = ((timeSinceReference % CETUS_CYCLE_MS) + CETUS_CYCLE_MS) % CETUS_CYCLE_MS;
  const currentCycleStart = now - cyclePos;
  const currentCycleEnd = currentCycleStart + CETUS_CYCLE_MS;
  const isDay = cyclePos < CETUS_DAY_MS;
  return { cycleStart: currentCycleStart, cycleEnd: currentCycleEnd, isDay };
}

// Fetch fresh data from Warframe API
async function fetchFromWarframeApi(): Promise<{ cycleStart: number; cycleEnd: number } | null> {
  try {
    const response = await fetch('https://content.warframe.com/dynamic/worldState.php', {
      headers: {
        'User-Agent': 'WarframeClox/1.0',
      },
    });

    if (!response.ok) {
      console.error('[Cetus API] Warframe API returned:', response.status);
      return null;
    }

    const data: WorldStateResponse = await response.json();
    const cetusMission = data.SyndicateMissions?.find(m => m.Tag === 'CetusSyndicate');

    if (!cetusMission?.Activation?.$date?.$numberLong || !cetusMission?.Expiry?.$date?.$numberLong) {
      console.error('[Cetus API] CetusSyndicate data not found in response');
      return null;
    }

    const cycleStart = parseInt(cetusMission.Activation.$date.$numberLong, 10);
    const cycleEnd = parseInt(cetusMission.Expiry.$date.$numberLong, 10);

    return { cycleStart, cycleEnd };
  } catch (error) {
    console.error('[Cetus API] Failed to fetch from Warframe:', error);
    return null;
  }
}

// Update Edge Config with fresh data
async function updateEdgeConfig(cycleStart: number, cycleEnd: number): Promise<boolean> {
  const token = process.env.VERCEL_ACCESS_TOKEN;
  const configId = process.env.EDGE_CONFIG_ID;

  if (!token || !configId) {
    console.error('[Cetus API] Missing VERCEL_ACCESS_TOKEN or EDGE_CONFIG_ID');
    return false;
  }

  try {
    const syncedAt = Date.now();
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
          { operation: 'upsert', key: 'synced_at', value: syncedAt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Cetus API] Failed to update Edge Config:', response.status, errorText);
      return false;
    }

    console.log('[Cetus API] Edge Config updated successfully');
    return true;
  } catch (error) {
    console.error('[Cetus API] Error updating Edge Config:', error);
    return false;
  }
}

export async function GET() {
  const startTime = Date.now();
  const now = Date.now();
  const FALLBACK_REFERENCE = 1766039879789; // From existing Edge Config

  try {
    // 1. Read from Edge Config
    const cetusStart = await get<number>('cetus_start');
    const syncedAt = await get<number>('synced_at');

    if (cetusStart) {
      const calculated = calculateFromReference(cetusStart);
      const age = syncedAt ? now - syncedAt : Infinity;
      const isStale = age > STALE_THRESHOLD_MS;
      const isVeryStale = age > WARN_THRESHOLD_MS;
      const daysSinceSync = syncedAt ? Math.floor(age / (24 * 60 * 60 * 1000)) : null;

      // 2. If stale, try to refresh from Warframe API
      if (isStale) {
        const freshData = await fetchFromWarframeApi();

        if (freshData) {
          // 3. Update Edge Config with fresh data
          const updated = await updateEdgeConfig(freshData.cycleStart, freshData.cycleEnd);
          const freshCalc = calculateFromReference(freshData.cycleStart);

          return Response.json({
            cycleStart: freshCalc.cycleStart,
            cycleEnd: freshCalc.cycleEnd,
            isDay: freshCalc.isDay,
            state: freshCalc.isDay ? 'day' : 'night',
            fetchedAt: now,
            source: updated ? 'warframe-api' : 'warframe-api-no-cache',
            syncedAt: now,
            refreshed: true,
            responseTime: Date.now() - startTime,
          });
        }

        // Warframe API failed - return stale Edge Config data with warning
        return Response.json({
          cycleStart: calculated.cycleStart,
          cycleEnd: calculated.cycleEnd,
          isDay: calculated.isDay,
          state: calculated.isDay ? 'day' : 'night',
          fetchedAt: now,
          source: 'edge-config-stale',
          syncedAt,
          daysSinceSync,
          isStale: true,
          warning: 'Warframe API unavailable - using cached data',
          responseTime: Date.now() - startTime,
        });
      }

      // Edge Config is fresh enough - return it
      return Response.json({
        cycleStart: calculated.cycleStart,
        cycleEnd: calculated.cycleEnd,
        isDay: calculated.isDay,
        state: calculated.isDay ? 'day' : 'night',
        fetchedAt: now,
        source: 'edge-config',
        syncedAt,
        daysSinceSync,
        isStale: isVeryStale,
        responseTime: Date.now() - startTime,
      });
    }

    // No data in Edge Config - try to seed it from Warframe API
    const freshData = await fetchFromWarframeApi();

    if (freshData) {
      await updateEdgeConfig(freshData.cycleStart, freshData.cycleEnd);
      const freshCalc = calculateFromReference(freshData.cycleStart);

      return Response.json({
        cycleStart: freshCalc.cycleStart,
        cycleEnd: freshCalc.cycleEnd,
        isDay: freshCalc.isDay,
        state: freshCalc.isDay ? 'day' : 'night',
        fetchedAt: now,
        source: 'warframe-api-seeded',
        syncedAt: now,
        responseTime: Date.now() - startTime,
      });
    }

    // Nothing worked - use fallback calculation
    const calculated = calculateFromReference(FALLBACK_REFERENCE);
    return Response.json({
      cycleStart: calculated.cycleStart,
      cycleEnd: calculated.cycleEnd,
      isDay: calculated.isDay,
      state: calculated.isDay ? 'day' : 'night',
      fetchedAt: now,
      source: 'fallback',
      warning: 'No Edge Config data and Warframe API unavailable',
      responseTime: Date.now() - startTime,
    });

  } catch (error) {
    // Edge Config read failed
    console.error('[Cetus API] Edge Config error:', error);

    // Try Warframe API directly
    const freshData = await fetchFromWarframeApi();

    if (freshData) {
      const freshCalc = calculateFromReference(freshData.cycleStart);
      return Response.json({
        cycleStart: freshCalc.cycleStart,
        cycleEnd: freshCalc.cycleEnd,
        isDay: freshCalc.isDay,
        state: freshCalc.isDay ? 'day' : 'night',
        fetchedAt: now,
        source: 'warframe-api-direct',
        warning: 'Edge Config unavailable',
        responseTime: Date.now() - startTime,
      });
    }

    // Everything failed - use fallback
    const calculated = calculateFromReference(FALLBACK_REFERENCE);
    return Response.json({
      cycleStart: calculated.cycleStart,
      cycleEnd: calculated.cycleEnd,
      isDay: calculated.isDay,
      state: calculated.isDay ? 'day' : 'night',
      fetchedAt: now,
      source: 'fallback',
      error: 'edge-config-unavailable',
      message: 'Edge Config and Warframe API both unavailable',
      responseTime: Date.now() - startTime,
    });
  }
}
