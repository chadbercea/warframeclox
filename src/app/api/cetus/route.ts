// Server-side API route to proxy Warframe API requests
// This avoids CORS issues when fetching from the browser

interface WorldStateResponse {
  SyndicateMissions?: Array<{
    Tag: string;
    Activation: { $date: { $numberLong: string } };
    Expiry: { $date: { $numberLong: string } };
  }>;
}

export async function GET() {
  try {
    const response = await fetch('https://api.warframe.com/cdn/worldState.php', {
      cache: 'no-store', // Disable caching to ensure fresh requests
      headers: {
        'User-Agent': 'WarframeClox/1.0 (Cetus Cycle Tracker)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Warframe API returned:', response.status, response.statusText);
      return Response.json(
        { error: 'Failed to fetch from Warframe API', status: response.status },
        { status: response.status }
      );
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
    console.error('Cetus API error:', error);
    return Response.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
