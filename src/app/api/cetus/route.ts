// Server-side API route for Cetus cycle
// Uses calculated times as fallback when API is blocked

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface WorldStateResponse {
  SyndicateMissions?: Array<{
    Tag: string;
    Activation: { $date: { $numberLong: string } };
    Expiry: { $date: { $numberLong: string } };
  }>;
}

// Cetus cycle constants (in milliseconds)
const CETUS_DAY_DURATION = 100 * 60 * 1000;    // 100 minutes day
const CETUS_NIGHT_DURATION = 50 * 60 * 1000;   // 50 minutes night
const CETUS_FULL_CYCLE = CETUS_DAY_DURATION + CETUS_NIGHT_DURATION; // 150 minutes total

// Known reference point - a verified day start time (UTC)
// January 1, 2024 00:00:00 UTC was during a day cycle
const CETUS_EPOCH = 1704067200000; // 2024-01-01 00:00:00 UTC

function calculateCetusCycle(): { cycleStart: number; cycleEnd: number; isDay: boolean } {
  const now = Date.now();
  const timeSinceEpoch = now - CETUS_EPOCH;
  const cyclePosition = timeSinceEpoch % CETUS_FULL_CYCLE;
  
  const isDay = cyclePosition < CETUS_DAY_DURATION;
  
  if (isDay) {
    const cycleStart = now - cyclePosition;
    const cycleEnd = cycleStart + CETUS_DAY_DURATION;
    return { cycleStart, cycleEnd, isDay: true };
  } else {
    const nightPosition = cyclePosition - CETUS_DAY_DURATION;
    const cycleStart = now - nightPosition;
    const cycleEnd = cycleStart + CETUS_NIGHT_DURATION;
    return { cycleStart, cycleEnd, isDay: false };
  }
}

const WARFRAME_API_URLS = [
  'https://content.warframe.com/dynamic/worldState.php',
  'https://api.warframe.com/cdn/worldState.php',
];

export async function GET() {
  // Try live API first
  for (const apiUrl of WARFRAME_API_URLS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(apiUrl, {
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          'User-Agent': 'WarframeClox/1.0 (Cetus Cycle Tracker)',
          'Accept': 'application/json',
        },
      });
      
      clearTimeout(timeout);

      if (!response.ok) {
        console.error(`API ${apiUrl} returned:`, response.status);
        continue;
      }

      const data: WorldStateResponse = await response.json();
      const cetusMission = data.SyndicateMissions?.find(m => m.Tag === 'CetusSyndicate');

      if (cetusMission) {
        const cycleStart = parseInt(cetusMission.Activation.$date.$numberLong, 10);
        const cycleEnd = parseInt(cetusMission.Expiry.$date.$numberLong, 10);
        
        return Response.json({
          cycleStart,
          cycleEnd,
          fetchedAt: Date.now(),
          source: 'api',
        });
      }
    } catch (error) {
      console.error(`Failed to fetch from ${apiUrl}:`, error);
    }
  }

  // Fallback to calculated cycle
  console.log('Using calculated Cetus cycle as fallback');
  const calculated = calculateCetusCycle();
  
  return Response.json({
    cycleStart: calculated.cycleStart,
    cycleEnd: calculated.cycleEnd,
    fetchedAt: Date.now(),
    source: 'calculated',
    isDay: calculated.isDay,
  });
}
