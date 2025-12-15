// Server-side API route for Cetus cycle data
// Priority: Edge Config (synced by GitHub Action) → warframestat.us → Warframe API → calculated fallback

import { createClient } from '@vercel/edge-config';

const edgeConfig = createClient(process.env.EDGE_CONFIG?.trim() || 'https://edge-config.vercel.com/ecfg_i7wukxkcxmejcih7vtkpfcthms6b?token=5ca683c4-c71e-4c2c-b298-609191067e3b');

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// Response types for external APIs
interface WarframeStatCetusResponse {
  activation?: string;
  expiry?: string;
  isDay?: boolean;
  state?: string;
  timeLeft?: string;
}

interface WorldStateResponse {
  SyndicateMissions?: Array<{
    Tag?: string;
    Activation?: { $date?: { $numberLong?: string } };
    Expiry?: { $date?: { $numberLong?: string } };
  }>;
}

// Cetus cycle constants
const CETUS_DAY_MS = 100 * 60 * 1000; // 100 minutes
const CETUS_CYCLE_MS = 150 * 60 * 1000; // 150 minutes total

// Validation helpers
function isValidTimestamp(ts: number): boolean {
  // Must be a reasonable timestamp (between 2020 and 2030)
  return ts > 1577836800000 && ts < 1893456000000;
}

function validateWarframeStatResponse(data: WarframeStatCetusResponse): { cycleStart: number; cycleEnd: number; isDay: boolean } | null {
  if (!data.activation || !data.expiry || typeof data.isDay !== 'boolean') {
    return null;
  }
  const cycleStart = new Date(data.activation).getTime();
  const cycleEnd = new Date(data.expiry).getTime();
  if (!isValidTimestamp(cycleStart) || !isValidTimestamp(cycleEnd)) {
    return null;
  }
  if (cycleEnd <= cycleStart) {
    return null;
  }
  return { cycleStart, cycleEnd, isDay: data.isDay };
}

function validateWorldStateResponse(data: WorldStateResponse): { cycleStart: number; cycleEnd: number } | null {
  const cetusMission = data.SyndicateMissions?.find(m => m.Tag === 'CetusSyndicate');
  if (!cetusMission?.Activation?.$date?.$numberLong || !cetusMission?.Expiry?.$date?.$numberLong) {
    return null;
  }
  const cycleStart = parseInt(cetusMission.Activation.$date.$numberLong, 10);
  const cycleEnd = parseInt(cetusMission.Expiry.$date.$numberLong, 10);
  if (!isValidTimestamp(cycleStart) || !isValidTimestamp(cycleEnd)) {
    return null;
  }
  if (cycleEnd <= cycleStart) {
    return null;
  }
  return { cycleStart, cycleEnd };
}

// Calculate current cycle state from a known reference timestamp
function calculateFromReference(referenceStart: number): { cycleStart: number; cycleEnd: number; isDay: boolean } {
  const now = Date.now();
  const timeSinceReference = now - referenceStart;
  const cyclePos = ((timeSinceReference % CETUS_CYCLE_MS) + CETUS_CYCLE_MS) % CETUS_CYCLE_MS;

  const currentCycleStart = now - cyclePos;
  const currentCycleEnd = currentCycleStart + CETUS_CYCLE_MS;
  const isDay = cyclePos < CETUS_DAY_MS;

  return { cycleStart: currentCycleStart, cycleEnd: currentCycleEnd, isDay };
}

export async function GET() {
  const startTime = Date.now();
  const errors: string[] = [];

  // 1. Try Vercel Edge Config first (synced by GitHub Action every 6 hours)
  try {
    const edgeConfigStart = await edgeConfig.get<number>('cetus_cycle_start');
    const edgeConfigSyncedAt = await edgeConfig.get<number>('cetus_synced_at');

    if (edgeConfigStart && isValidTimestamp(edgeConfigStart)) {
      // Edge Config has valid data - use it as reference for calculation
      const calculated = calculateFromReference(edgeConfigStart);
      const syncAge = edgeConfigSyncedAt ? Date.now() - edgeConfigSyncedAt : null;

      return Response.json({
        cycleStart: calculated.cycleStart,
        cycleEnd: calculated.cycleEnd,
        isDay: calculated.isDay,
        fetchedAt: Date.now(),
        source: 'edge-config',
        syncedAt: edgeConfigSyncedAt,
        syncAgeMs: syncAge,
        responseTime: Date.now() - startTime,
      });
    }
  } catch (error) {
    // Edge Config not configured or failed - continue to other sources
    errors.push(`edge-config: ${error instanceof Error ? error.message : 'not configured'}`);
  }

  // 2. Try warframestat.us community API (CORS-friendly, designed for apps)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch('https://api.warframestat.us/pc/cetusCycle', {
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });

    clearTimeout(timeout);
    const responseTime = Date.now() - startTime;

    if (response.ok) {
      const data: WarframeStatCetusResponse = await response.json();
      const validated = validateWarframeStatResponse(data);

      if (validated) {
        return Response.json({
          cycleStart: validated.cycleStart,
          cycleEnd: validated.cycleEnd,
          isDay: validated.isDay,
          fetchedAt: Date.now(),
          source: 'warframestat',
          responseTime,
        });
      }
      errors.push(`warframestat: invalid data - ${JSON.stringify(data).slice(0, 100)}`);
    } else {
      errors.push(`warframestat: HTTP ${response.status}`);
    }
  } catch (error) {
    errors.push(`warframestat: ${error instanceof Error ? error.message : 'unknown error'}`);
  }

  // 3. Try official Warframe API (blocked from cloud providers, works locally)
  try {
    const apiStartTime = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch('https://api.warframe.com/cdn/worldState.php', {
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });

    clearTimeout(timeout);
    const responseTime = Date.now() - apiStartTime;

    if (response.ok) {
      const data: WorldStateResponse = await response.json();
      const validated = validateWorldStateResponse(data);

      if (validated) {
        const now = Date.now();
        const elapsed = now - validated.cycleStart;
        const isDay = elapsed < CETUS_DAY_MS;

        return Response.json({
          cycleStart: validated.cycleStart,
          cycleEnd: validated.cycleEnd,
          isDay,
          fetchedAt: Date.now(),
          source: 'warframe-api',
          responseTime,
        });
      }
      errors.push(`warframe-api: no CetusSyndicate in response`);
    } else {
      errors.push(`warframe-api: HTTP ${response.status}`);
    }
  } catch (error) {
    errors.push(`warframe-api: ${error instanceof Error ? error.message : 'unknown error'}`);
  }

  // 4. All sources failed - use hardcoded fallback calculation
  // Reference: Verified cycle start from Dec 13, 2025 API response
  const FALLBACK_REFERENCE = 1765688923671;
  const calculated = calculateFromReference(FALLBACK_REFERENCE);

  return Response.json({
    cycleStart: calculated.cycleStart,
    cycleEnd: calculated.cycleEnd,
    isDay: calculated.isDay,
    fetchedAt: Date.now(),
    source: 'calculated',
    _debug: errors.length > 0 ? errors : undefined,
  });
}
