// Server-side API route to proxy Warframe API requests
// This avoids CORS issues when fetching from the browser
// Note: Uses Node.js runtime as Edge runtime IPs may be blocked

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface WorldStateResponse {
  SyndicateMissions?: Array<{
    Tag: string;
    Activation: { $date: { $numberLong: string } };
    Expiry: { $date: { $numberLong: string } };
  }>;
}

const WARFRAME_API_URLS = [
  'https://content.warframe.com/dynamic/worldState.php',
  'https://api.warframe.com/cdn/worldState.php',
];

export async function GET() {
  let lastError: Error | null = null;

  for (const apiUrl of WARFRAME_API_URLS) {
    try {
      const response = await fetch(apiUrl, {
        cache: 'no-store',
        headers: {
          'User-Agent': 'WarframeClox/1.0 (Cetus Cycle Tracker)',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`API ${apiUrl} returned:`, response.status);
        continue;
      }

      const data: WorldStateResponse = await response.json();
      const cetusMission = data.SyndicateMissions?.find(m => m.Tag === 'CetusSyndicate');

      if (!cetusMission) {
        return Response.json(
          { error: 'Cetus cycle data not found' },
          { status: 404 }
        );
      }

      const cycleStart = parseInt(cetusMission.Activation.$date.$numberLong, 10);
      const cycleEnd = parseInt(cetusMission.Expiry.$date.$numberLong, 10);

      return Response.json({
        cycleStart,
        cycleEnd,
        fetchedAt: Date.now(),
      });
    } catch (error) {
      console.error(`Failed to fetch from ${apiUrl}:`, error);
      lastError = error as Error;
    }
  }

  return Response.json(
    { error: 'Failed to fetch from Warframe API', details: lastError?.message },
    { status: 502 }
  );
}
