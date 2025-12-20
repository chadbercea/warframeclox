import { get } from '@vercel/edge-config';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const CETUS_DAY_MS = 100 * 60 * 1000; // 100 minutes
const CETUS_CYCLE_MS = 150 * 60 * 1000; // 150 minutes total

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

// Fetch data from Warframe API (only called if Edge Config is empty)
async function fetchFromWarframeApi(): Promise<{ cycleStart: number; cycleEnd: number } | null> {
  try {
    const response = await fetch('https://content.warframe.com/dynamic/worldState.php', {
      headers: { 'User-Agent': 'WarframeClox/1.0' },
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

// Update Edge Config (only called once to seed data)
async function seedEdgeConfig(cycleStart: number, cycleEnd: number): Promise<boolean> {
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
  const FALLBACK_REFERENCE = 1766039879789; // Hardcoded fallback

  try {
    // 1. Read from Edge Config
    const cetusStart = await get<number>('cetus_start');
    const syncedAt = await get<number>('synced_at');

    if (cetusStart) {
      // Got data - calculate and return
      const calculated = calculateFromReference(cetusStart);
      return Response.json({
        cycleStart: calculated.cycleStart,
        cycleEnd: calculated.cycleEnd,
        isDay: calculated.isDay,
        state: calculated.isDay ? 'day' : 'night',
        fetchedAt: now,
        source: 'edge-config',
        syncedAt,
        responseTime: Date.now() - startTime,
      });
    }

    // 2. Edge Config empty - seed it from Warframe API
    const freshData = await fetchFromWarframeApi();

    if (freshData) {
      await seedEdgeConfig(freshData.cycleStart, freshData.cycleEnd);
      const calculated = calculateFromReference(freshData.cycleStart);

      return Response.json({
        cycleStart: calculated.cycleStart,
        cycleEnd: calculated.cycleEnd,
        isDay: calculated.isDay,
        state: calculated.isDay ? 'day' : 'night',
        fetchedAt: now,
        source: 'warframe-api-seeded',
        syncedAt: now,
        responseTime: Date.now() - startTime,
      });
    }

    // 3. API failed - use fallback
    const calculated = calculateFromReference(FALLBACK_REFERENCE);
    return Response.json({
      cycleStart: calculated.cycleStart,
      cycleEnd: calculated.cycleEnd,
      isDay: calculated.isDay,
      state: calculated.isDay ? 'day' : 'night',
      fetchedAt: now,
      source: 'fallback',
      responseTime: Date.now() - startTime,
    });

  } catch {
    // Edge Config read failed - use fallback
    const calculated = calculateFromReference(FALLBACK_REFERENCE);
    return Response.json({
      cycleStart: calculated.cycleStart,
      cycleEnd: calculated.cycleEnd,
      isDay: calculated.isDay,
      state: calculated.isDay ? 'day' : 'night',
      fetchedAt: now,
      source: 'fallback',
      responseTime: Date.now() - startTime,
    });
  }
}
