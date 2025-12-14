// Server-side API route for Cetus cycle data
// Priority: warframestat.us → official Warframe API → calculated fallback

export const runtime = 'nodejs';
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

export async function GET() {
  const startTime = Date.now();
  const errors: string[] = [];

  // Try warframestat.us community API first (CORS-friendly, designed for apps)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch('https://api.warframestat.us/pc/cetusCycle', {
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        'User-Agent': 'WarframeClox/1.0 (Cetus Cycle Tracker)',
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

  // Fallback to official Warframe API via Vercel rewrite proxy
  // The proxy is configured in next.config.mjs to bypass IP blocking
  const vercelUrl = process.env.VERCEL_URL;
  const WARFRAME_API_URLS = vercelUrl
    ? [`https://${vercelUrl}/proxy/warframe/worldState.php`] // Use proxy on Vercel
    : ['https://api.warframe.com/cdn/worldState.php']; // Direct on local

  for (const apiUrl of WARFRAME_API_URLS) {
    try {
      const apiStartTime = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout for serverless

      const response = await fetch(apiUrl, {
        cache: 'no-store',
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent': 'WarframeClox/1.0 (Cetus Cycle Tracker)',
          'Accept': 'application/json',
        },
      });

      clearTimeout(timeout);
      const responseTime = Date.now() - apiStartTime;

      if (!response.ok) {
        errors.push(`warframe-api: HTTP ${response.status}`);
        continue;
      }

      const data: WorldStateResponse = await response.json();
      const validated = validateWorldStateResponse(data);

      if (validated) {
        // Calculate isDay from cycle position
        const now = Date.now();
        const elapsed = now - validated.cycleStart;
        const CETUS_DAY_MS = 100 * 60 * 1000;
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
    } catch (error) {
      errors.push(`warframe-api: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  // All APIs failed - use calculated fallback
  // Cetus cycle: 150 min total (100 min day + 50 min night)
  const CETUS_DAY_MS = 100 * 60 * 1000;
  const CETUS_CYCLE_MS = 150 * 60 * 1000;
  // Reference: Verified cycle start from Dec 13, 2025 API response
  const KNOWN_CYCLE_START = 1765616932673;

  const now = Date.now();
  const timeSinceKnown = now - KNOWN_CYCLE_START;
  const cyclePos = ((timeSinceKnown % CETUS_CYCLE_MS) + CETUS_CYCLE_MS) % CETUS_CYCLE_MS;

  // Calculate current cycle's start
  const currentCycleStart = now - cyclePos;
  const currentCycleEnd = currentCycleStart + CETUS_CYCLE_MS;

  // Day is first 100 minutes of the 150-minute cycle
  const isDay = cyclePos < CETUS_DAY_MS;

  return Response.json({
    cycleStart: currentCycleStart,
    cycleEnd: currentCycleEnd,
    isDay,
    fetchedAt: Date.now(),
    source: 'calculated',
    _debug: errors.length > 0 ? errors : undefined,
  });
}
