import { NextRequest } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// Vercel Cron - runs every 6 hours
// Configure in vercel.json: { "crons": [{ "path": "/api/sync-cetus", "schedule": "0 */6 * * *" }] }

const EDGE_CONFIG_ID = 'ecfg_i7wukxkcxmejcih7vtkpfcthms6b';

interface CetusSyndicate {
  Tag: string;
  Activation: { $date: { $numberLong: string } };
  Expiry: { $date: { $numberLong: string } };
}

interface WorldState {
  SyndicateMissions?: CetusSyndicate[];
}

export async function GET(request: NextRequest) {
  // Verify cron secret or allow manual trigger for testing
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';
  const isAuthorized = isVercelCron || (cronSecret && authHeader === `Bearer ${cronSecret}`);
  
  // Allow unauthenticated for testing, but log it
  const isTest = request.nextUrl.searchParams.get('test') === '1';
  
  if (!isAuthorized && !isTest) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: string[] = [];
  
  // Try fetching from Warframe API
  try {
    results.push('Attempting Warframe API fetch...');
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    
    const response = await fetch('https://api.warframe.com/cdn/worldState.php', {
      signal: controller.signal,
      headers: {
        'User-Agent': 'WarframeClox/1.0',
      },
    });
    clearTimeout(timeout);
    
    if (!response.ok) {
      results.push(`Warframe API returned ${response.status}`);
      return Response.json({ 
        success: false, 
        error: `API returned ${response.status}`,
        logs: results 
      });
    }
    
    const data: WorldState = await response.json();
    results.push('Warframe API response received');
    
    const cetusMission = data.SyndicateMissions?.find(m => m.Tag === 'CetusSyndicate');
    
    if (!cetusMission) {
      results.push('CetusSyndicate not found in response');
      return Response.json({ 
        success: false, 
        error: 'CetusSyndicate not found',
        logs: results 
      });
    }
    
    const activation = cetusMission.Activation.$date.$numberLong;
    const expiry = cetusMission.Expiry.$date.$numberLong;
    const syncedAt = Date.now();
    
    results.push(`Cetus data: activation=${activation}, expiry=${expiry}`);
    
    // Update Edge Config
    const vercelToken = process.env.VERCEL_ACCESS_TOKEN;
    if (!vercelToken) {
      results.push('VERCEL_ACCESS_TOKEN not configured');
      return Response.json({ 
        success: false, 
        error: 'Missing VERCEL_ACCESS_TOKEN',
        logs: results,
        data: { activation, expiry }
      });
    }
    
    const updateResponse = await fetch(
      `https://api.vercel.com/v1/edge-config/${EDGE_CONFIG_ID}/items`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${vercelToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [
            { operation: 'upsert', key: 'cetus_start', value: parseInt(activation) },
            { operation: 'upsert', key: 'cetus_end', value: parseInt(expiry) },
            { operation: 'upsert', key: 'synced_at', value: syncedAt },
          ],
        }),
      }
    );
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      results.push(`Edge Config update failed: ${errorText}`);
      return Response.json({ 
        success: false, 
        error: 'Edge Config update failed',
        logs: results 
      });
    }
    
    results.push('Edge Config updated successfully');
    
    return Response.json({
      success: true,
      data: {
        activation: parseInt(activation),
        expiry: parseInt(expiry),
        syncedAt,
      },
      logs: results,
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    results.push(`Error: ${errorMessage}`);
    
    return Response.json({
      success: false,
      error: errorMessage,
      logs: results,
    });
  }
}

