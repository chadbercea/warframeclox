// Server-side API route for Cetus cycle data
// Uses warframestat.us community API with Warframe API fallback

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface WarframeStatCetusResponse {
  activation: string;
  expiry: string;
  isDay: boolean;
  state: string;
  timeLeft: string;
}

interface WorldStateResponse {
  SyndicateMissions?: Array<{
    Tag: string;
    Activation: { $date: { $numberLong: string } };
    Expiry: { $date: { $numberLong: string } };
  }>;
}

export async function GET() {
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

    if (response.ok) {
      const data: WarframeStatCetusResponse = await response.json();
      return Response.json({
        cycleStart: new Date(data.activation).getTime(),
        cycleEnd: new Date(data.expiry).getTime(),
        isDay: data.isDay,
        fetchedAt: Date.now(),
        source: 'warframestat',
      });
    }
  } catch (error) {
    console.error('warframestat.us failed:', error);
  }

  // Fallback to official Warframe API
  const WARFRAME_API_URLS = [
    'https://content.warframe.com/dynamic/worldState.php',
    'https://api.warframe.com/cdn/worldState.php',
  ];

  for (const apiUrl of WARFRAME_API_URLS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

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
          source: 'warframe-api',
        });
      }
    } catch (error) {
      console.error(`Failed to fetch from ${apiUrl}:`, error);
    }
  }

  return Response.json(
    { error: 'All API sources failed' },
    { status: 502 }
  );
}
