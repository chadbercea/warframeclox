export const runtime = 'edge';

import { kv } from '@vercel/kv';

const CETUS_DAY_MS = 100 * 60 * 1000; // 100 minutes
const CETUS_CYCLE_MS = 150 * 60 * 1000; // 150 minutes total
const CACHE_MAX_AGE_MS = 60 * 1000; // Consider cache stale after 60 seconds
const MIN_API_INTERVAL_MS = 30 * 1000; // Don't hit Warframe API more than once per 30 seconds

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

// In-memory cache for when KV is unavailable (persists per Edge function instance)
let memoryCache: CachedCetusData | null = null;
let lastApiCall: number = 0;

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

// Helper to calculate state from cycle start
function calculateState(cycleStart: number): boolean {
  const now = Date.now();
  const elapsed = now - cycleStart;
  const positionInCycle = elapsed >= 0 
    ? elapsed % CETUS_CYCLE_MS 
    : CETUS_CYCLE_MS + (elapsed % CETUS_CYCLE_MS);
  return positionInCycle < CETUS_DAY_MS;
}

// Fetch directly from Warframe API with rate limiting
async function fetchFromWarframeApi(): Promise<{ cycleStart: number; cycleEnd: number } | null> {
  const now = Date.now();
  
  // Rate limit: don't call API more than once per 30 seconds
  if (now - lastApiCall < MIN_API_INTERVAL_MS) {
    console.log('[Cetus API] Rate limited - using cache/fallback');
    return null;
  }
  
  lastApiCall = now;
  
  try {
    const response = await fetch('https://api.warframe.com/cdn/worldState.php', {
      next: { revalidate: 60 }, // Edge cache for 60 seconds
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

  // 1. Try memory cache first (fastest, no external calls)
  if (memoryCache) {
    const age = Date.now() - memoryCache.syncedAt;
    if (age < CACHE_MAX_AGE_MS) {
      const isDay = calculateState(memoryCache.cycleStart);
      return Response.json({
        cycleStart: memoryCache.cycleStart,
        cycleEnd: memoryCache.cycleEnd,
        isDay,
        state: isDay ? 'day' : 'night',
        syncedAt: memoryCache.syncedAt,
        fetchedAt: Date.now(),
        source: 'memory-cache',
        cacheAge: age,
        responseTime: Date.now() - startTime,
      });
    }
  }

  // 2. Try Vercel KV cache
  try {
    const cached = await kv.get<CachedCetusData>('cetus_cycle');
    
    if (cached) {
      const age = Date.now() - cached.syncedAt;
      
      // Update memory cache
      memoryCache = cached;
      
      // If KV cache is fresh, return it
      if (age < CACHE_MAX_AGE_MS) {
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
        // Got fresh data - update both caches
        const now = Date.now();
        const newData: CachedCetusData = {
          cycleStart: wfData.cycleStart,
          cycleEnd: wfData.cycleEnd,
          isDay: calculateState(wfData.cycleStart),
          syncedAt: now,
        };
        
        memoryCache = newData;
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

      // Warframe API failed/rate-limited - return stale cache
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
        responseTime: Date.now() - startTime,
      });
    }

    // No KV cache - try to fetch from Warframe API
    const wfData = await fetchFromWarframeApi();
    
    if (wfData) {
      const now = Date.now();
      const newData: CachedCetusData = {
        cycleStart: wfData.cycleStart,
        cycleEnd: wfData.cycleEnd,
        isDay: calculateState(wfData.cycleStart),
        syncedAt: now,
      };
      
      memoryCache = newData;
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

    // No cache, no Warframe API - use fallback calculation
    const calculated = calculateFromReference(FALLBACK_REFERENCE);
    return Response.json({
      cycleStart: calculated.cycleStart,
      cycleEnd: calculated.cycleEnd,
      isDay: calculated.isDay,
      state: calculated.isDay ? 'day' : 'night',
      fetchedAt: Date.now(),
      source: 'fallback',
      responseTime: Date.now() - startTime,
    });

  } catch (kvError) {
    // KV unavailable - use memory cache or fetch with rate limiting
    console.error('[Cetus API] KV error:', kvError);
    
    // Check memory cache first
    if (memoryCache) {
      const age = Date.now() - memoryCache.syncedAt;
      // Use memory cache even if stale when KV is down
      const isDay = calculateState(memoryCache.cycleStart);
      
      // Only try API if memory cache is very stale (> 5 minutes)
      if (age > 5 * 60 * 1000) {
        const wfData = await fetchFromWarframeApi();
        if (wfData) {
          const now = Date.now();
          memoryCache = {
            cycleStart: wfData.cycleStart,
            cycleEnd: wfData.cycleEnd,
            isDay: calculateState(wfData.cycleStart),
            syncedAt: now,
          };
          return Response.json({
            cycleStart: wfData.cycleStart,
            cycleEnd: wfData.cycleEnd,
            isDay: calculateState(wfData.cycleStart),
            state: calculateState(wfData.cycleStart) ? 'day' : 'night',
            fetchedAt: now,
            source: 'warframe-api-direct',
            responseTime: Date.now() - startTime,
          });
        }
      }
      
      return Response.json({
        cycleStart: memoryCache.cycleStart,
        cycleEnd: memoryCache.cycleEnd,
        isDay,
        state: isDay ? 'day' : 'night',
        syncedAt: memoryCache.syncedAt,
        fetchedAt: Date.now(),
        source: 'memory-cache-stale',
        cacheAge: age,
        responseTime: Date.now() - startTime,
      });
    }
    
    // No memory cache - try API once
    const wfData = await fetchFromWarframeApi();
    
    if (wfData) {
      const now = Date.now();
      memoryCache = {
        cycleStart: wfData.cycleStart,
        cycleEnd: wfData.cycleEnd,
        isDay: calculateState(wfData.cycleStart),
        syncedAt: now,
      };
      
      const isDay = calculateState(wfData.cycleStart);
      return Response.json({
        cycleStart: wfData.cycleStart,
        cycleEnd: wfData.cycleEnd,
        isDay,
        state: isDay ? 'day' : 'night',
        fetchedAt: now,
        source: 'warframe-api-direct',
        responseTime: Date.now() - startTime,
      });
    }

    // Everything failed - use calculation fallback
    const calculated = calculateFromReference(FALLBACK_REFERENCE);
    
    // Cache the fallback calculation too
    memoryCache = {
      cycleStart: calculated.cycleStart,
      cycleEnd: calculated.cycleEnd,
      isDay: calculated.isDay,
      syncedAt: Date.now(),
    };
    
    return Response.json({
      cycleStart: calculated.cycleStart,
      cycleEnd: calculated.cycleEnd,
      isDay: calculated.isDay,
      state: calculated.isDay ? 'day' : 'night',
      fetchedAt: Date.now(),
      source: 'fallback',
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
    const isDay = calculateState(cycleStart);

    // Update memory cache immediately
    const data: CachedCetusData = {
      cycleStart,
      cycleEnd,
      isDay,
      syncedAt: now,
    };
    memoryCache = data;

    // Try to store in KV (may fail if not configured)
    try {
      await kv.set('cetus_cycle', data, { ex: 3600 });
    } catch {
      console.log('[Cetus API] KV write failed, using memory cache only');
    }

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
