export const runtime = 'edge';

import { kv } from '@vercel/kv';

const CETUS_DAY_MS = 100 * 60 * 1000; // 100 minutes
const CETUS_CYCLE_MS = 150 * 60 * 1000; // 150 minutes total
const CACHE_MAX_AGE_MS = 60 * 1000; // Consider cache stale after 60 seconds

interface CachedCetusData {
  cycleStart: number;
  cycleEnd: number;
  isDay: boolean;
  syncedAt: number;
}

interface WorldStateResponse {
  SyndicateMissions?: Array<{
    Tag: string;
    Activation: { $date: { $numberLong: string } };
    Expiry: { $date: { $numberLong: string } };
  }>;
}

// Fallback calculation when no data available
function calculateFromReference(referenceStart: number) {
  const now = Date.now();
  const timeSinceReference = now - referenceStart;
  const cyclePos = ((timeSinceReference % CETUS_CYCLE_MS) + CETUS_CYCLE_MS) % CETUS_CYCLE_MS;
  const currentCycleStart = now - cyclePos;
  const currentCycleEnd = currentCycleStart + CETUS_CYCLE_MS;
  const isDay = cyclePos < CETUS_DAY_MS;
  return { cycleStart: currentCycleStart, cycleEnd: currentCycleEnd, isDay };
}

// Fetch directly from Warframe API (works from server, blocked in production by CORS from browser)
async function fetchFromWarframeApi(): Promise<{ cycleStart: number; cycleEnd: number } | null> {
  try {
    const response = await fetch('https://api.warframe.com/cdn/worldState.php', {
      next: { revalidate: 30 }, // Edge cache for 30 seconds
    });

    if (!response.ok) {
      console.error('[Cetus API] Warframe API returned non-OK status:', response.status);
      return null;
    }

    const data: WorldStateResponse = await response.json();
    
    const cetusMission = data.SyndicateMissions?.find(m => m.Tag === 'CetusSyndicate');
    
    if (!cetusMission?.Activation?.$date?.$numberLong || !cetusMission?.Expiry?.$date?.$numberLong) {
      console.error('[Cetus API] CetusSyndicate data not found');
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

export async function GET() {
  const startTime = Date.now();
  const FALLBACK_REFERENCE = 1766246853909; // Known cycle start reference

  // Helper to calculate state from cycle start
  const calculateState = (cycleStart: number) => {
    const now = Date.now();
    const elapsed = now - cycleStart;
    const positionInCycle = elapsed >= 0 
      ? elapsed % CETUS_CYCLE_MS 
      : CETUS_CYCLE_MS + (elapsed % CETUS_CYCLE_MS);
    return positionInCycle < CETUS_DAY_MS;
  };

  // 1. Try to read from Vercel KV cache
  try {
    const cached = await kv.get<CachedCetusData>('cetus_cycle');
    
    if (cached) {
      const age = Date.now() - cached.syncedAt;
      const needsRefresh = age > CACHE_MAX_AGE_MS;
      
      // If cache is fresh, return it
      if (!needsRefresh) {
        const isDay = calculateState(cached.cycleStart);
        return Response.json({
          cycleStart: cached.cycleStart,
          cycleEnd: cached.cycleEnd,
          isDay,
          state: isDay ? 'day' : 'night',
          syncedAt: cached.syncedAt,
          fetchedAt: Date.now(),
          source: 'kv-cache',
          cacheAge: age,
          responseTime: Date.now() - startTime,
        });
      }

      // Cache is stale - try to refresh from Warframe API
      const wfData = await fetchFromWarframeApi();
      
      if (wfData) {
        // Got fresh data - update KV cache
        const now = Date.now();
        const newData: CachedCetusData = {
          cycleStart: wfData.cycleStart,
          cycleEnd: wfData.cycleEnd,
          isDay: calculateState(wfData.cycleStart),
          syncedAt: now,
        };
        
        await kv.set('cetus_cycle', newData, { ex: 3600 }); // 1 hour TTL
        
        const isDay = calculateState(wfData.cycleStart);
        return Response.json({
          cycleStart: wfData.cycleStart,
          cycleEnd: wfData.cycleEnd,
          isDay,
          state: isDay ? 'day' : 'night',
          syncedAt: now,
          fetchedAt: now,
          source: 'warframe-api',
          responseTime: Date.now() - startTime,
        });
      }

      // Warframe API failed - return stale cache
      const isDay = calculateState(cached.cycleStart);
      return Response.json({
        cycleStart: cached.cycleStart,
        cycleEnd: cached.cycleEnd,
        isDay,
        state: isDay ? 'day' : 'night',
        syncedAt: cached.syncedAt,
        fetchedAt: Date.now(),
        source: 'kv-cache-stale',
        cacheAge: age,
        warning: 'Using stale cache - Warframe API unavailable',
        responseTime: Date.now() - startTime,
      });
    }

    // No cache - try to fetch from Warframe API
    const wfData = await fetchFromWarframeApi();
    
    if (wfData) {
      const now = Date.now();
      const newData: CachedCetusData = {
        cycleStart: wfData.cycleStart,
        cycleEnd: wfData.cycleEnd,
        isDay: calculateState(wfData.cycleStart),
        syncedAt: now,
      };
      
      await kv.set('cetus_cycle', newData, { ex: 3600 });
      
      const isDay = calculateState(wfData.cycleStart);
      return Response.json({
        cycleStart: wfData.cycleStart,
        cycleEnd: wfData.cycleEnd,
        isDay,
        state: isDay ? 'day' : 'night',
        syncedAt: now,
        fetchedAt: now,
        source: 'warframe-api',
        responseTime: Date.now() - startTime,
      });
    }

    // No cache, no Warframe API - use fallback
    const calculated = calculateFromReference(FALLBACK_REFERENCE);
    return Response.json({
      cycleStart: calculated.cycleStart,
      cycleEnd: calculated.cycleEnd,
      isDay: calculated.isDay,
      state: calculated.isDay ? 'day' : 'night',
      fetchedAt: Date.now(),
      source: 'fallback',
      warning: 'Using calculated fallback - no cache or API available',
      responseTime: Date.now() - startTime,
    });

  } catch (error) {
    // KV error - try direct Warframe API fetch
    console.error('[Cetus API] KV error:', error);
    
    const wfData = await fetchFromWarframeApi();
    
    if (wfData) {
      const isDay = calculateState(wfData.cycleStart);
      return Response.json({
        cycleStart: wfData.cycleStart,
        cycleEnd: wfData.cycleEnd,
        isDay,
        state: isDay ? 'day' : 'night',
        fetchedAt: Date.now(),
        source: 'warframe-api-direct',
        warning: 'KV unavailable - fetched directly',
        responseTime: Date.now() - startTime,
      });
    }

    // Everything failed - use calculation fallback
    const calculated = calculateFromReference(FALLBACK_REFERENCE);
    return Response.json({
      cycleStart: calculated.cycleStart,
      cycleEnd: calculated.cycleEnd,
      isDay: calculated.isDay,
      state: calculated.isDay ? 'day' : 'night',
      fetchedAt: Date.now(),
      source: 'fallback',
      error: error instanceof Error ? error.message : 'KV and API unavailable',
      responseTime: Date.now() - startTime,
    });
  }
}

// POST endpoint for browser sync (fallback method if needed)
export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { cycleStart, cycleEnd } = body;

    // Validate input
    if (typeof cycleStart !== 'number' || typeof cycleEnd !== 'number') {
      return Response.json(
        { error: 'Invalid data: cycleStart and cycleEnd must be numbers' },
        { status: 400 }
      );
    }

    // Sanity check: cycle should be in reasonable range
    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const oneWeekAhead = now + 7 * 24 * 60 * 60 * 1000;

    if (cycleStart < oneWeekAgo || cycleStart > oneWeekAhead) {
      return Response.json(
        { error: 'Invalid cycleStart: out of reasonable range' },
        { status: 400 }
      );
    }

    // Calculate current state
    const elapsed = now - cycleStart;
    const positionInCycle = elapsed >= 0 
      ? elapsed % CETUS_CYCLE_MS 
      : CETUS_CYCLE_MS + (elapsed % CETUS_CYCLE_MS);
    const isDay = positionInCycle < CETUS_DAY_MS;

    // Store in KV with 1 hour TTL
    const data: CachedCetusData = {
      cycleStart,
      cycleEnd,
      isDay,
      syncedAt: now,
    };

    await kv.set('cetus_cycle', data, { ex: 3600 });

    return Response.json({
      success: true,
      cycleStart,
      cycleEnd,
      isDay,
      state: isDay ? 'day' : 'night',
      syncedAt: now,
      source: 'browser-sync',
      responseTime: Date.now() - startTime,
    });
  } catch (error) {
    return Response.json(
      { 
        error: error instanceof Error ? error.message : 'Sync failed',
        responseTime: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
