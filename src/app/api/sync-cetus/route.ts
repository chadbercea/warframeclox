import { NextRequest } from 'next/server';
import { get } from '@vercel/edge-config';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const EDGE_CONFIG_ID = 'ecfg_i7wukxkcxmejcih7vtkpfcthms6b';

// Max unchanged attempts before stopping for the day
const MAX_UNCHANGED_ATTEMPTS = 3;

// Validate timestamp is reasonable (not too old, not too far in the future)
function isValidTimestamp(ts: number, allowFuture: boolean = false): boolean {
  const now = Date.now();
  const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;
  // Expiry can be up to 3 hours in the future (cycle is 2.5 hours)
  const maxFuture = allowFuture ? now + 3 * 60 * 60 * 1000 : now + 60 * 60 * 1000;
  return ts > oneYearAgo && ts < maxFuture;
}

// Get today's date as YYYY-MM-DD string
function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

// POST: Accept sync data from client browsers (residential IPs)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { activation, expiry } = body;

    // Validate required fields
    if (!activation || !expiry) {
      return Response.json({ 
        success: false, 
        error: 'Missing activation or expiry' 
      }, { status: 400 });
    }

    const activationTs = typeof activation === 'string' ? parseInt(activation) : activation;
    const expiryTs = typeof expiry === 'string' ? parseInt(expiry) : expiry;

    // Validate timestamps are reasonable (expiry can be in future)
    if (!isValidTimestamp(activationTs) || !isValidTimestamp(expiryTs, true)) {
      return Response.json({ 
        success: false, 
        error: 'Invalid timestamp range' 
      }, { status: 400 });
    }

    // Validate cycle duration (should be ~150 minutes / 9000000ms)
    const cycleDuration = expiryTs - activationTs;
    if (cycleDuration < 8000000 || cycleDuration > 10000000) {
      return Response.json({ 
        success: false, 
        error: 'Invalid cycle duration' 
      }, { status: 400 });
    }

    // Check current stored data
    const currentStart = await get<number>('cetus_start');
    const syncDate = await get<string>('sync_date');
    const unchangedCount = await get<number>('sync_unchanged_count') || 0;
    const now = Date.now();
    const today = getTodayString();

    // Check if we've hit the daily limit of unchanged attempts
    const isNewDay = syncDate !== today;
    const currentUnchangedCount = isNewDay ? 0 : unchangedCount;

    if (!isNewDay && currentUnchangedCount >= MAX_UNCHANGED_ATTEMPTS) {
      return Response.json({ 
        success: true, 
        action: 'skipped',
        reason: `Daily limit reached (${MAX_UNCHANGED_ATTEMPTS} unchanged syncs)`,
        unchangedCount: currentUnchangedCount
      });
    }

    const vercelToken = process.env.VERCEL_ACCESS_TOKEN;
    if (!vercelToken) {
      return Response.json({ 
        success: false, 
        error: 'Server configuration error' 
      }, { status: 500 });
    }

    // Check if data is the same (same activation timestamp)
    if (currentStart === activationTs) {
      // Data unchanged - increment counter
      const newUnchangedCount = currentUnchangedCount + 1;
      
      await fetch(
        `https://api.vercel.com/v1/edge-config/${EDGE_CONFIG_ID}/items`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${vercelToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            items: [
              { operation: 'upsert', key: 'sync_date', value: today },
              { operation: 'upsert', key: 'sync_unchanged_count', value: newUnchangedCount },
            ],
          }),
        }
      );

      return Response.json({ 
        success: true, 
        action: 'skipped',
        reason: 'Data unchanged',
        unchangedCount: newUnchangedCount,
        remainingAttempts: MAX_UNCHANGED_ATTEMPTS - newUnchangedCount
      });
    }

    // Data is different - update everything and reset counter
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
            { operation: 'upsert', key: 'cetus_start', value: activationTs },
            { operation: 'upsert', key: 'cetus_end', value: expiryTs },
            { operation: 'upsert', key: 'synced_at', value: now },
            { operation: 'upsert', key: 'sync_date', value: today },
            { operation: 'upsert', key: 'sync_unchanged_count', value: 0 },
          ],
        }),
      }
    );

    if (!updateResponse.ok) {
      return Response.json({ 
        success: false, 
        error: 'Failed to update storage' 
      }, { status: 500 });
    }

    return Response.json({
      success: true,
      action: 'updated',
      data: {
        activation: activationTs,
        expiry: expiryTs,
        syncedAt: now,
      },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}

// GET: Server-side sync (for cron - will fail due to IP blocking, kept for reference)
export async function GET(request: NextRequest) {
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';
  const isTest = request.nextUrl.searchParams.get('test') === '1';
  
  if (!isVercelCron && !isTest) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Note: This will likely fail due to Warframe API blocking cloud IPs
  // Client-side POST is the preferred method
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    
    const response = await fetch('https://api.warframe.com/cdn/worldState.php', {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    
    if (!response.ok) {
      return Response.json({ 
        success: false, 
        error: `Warframe API returned ${response.status}`,
        note: 'Cloud IPs are typically blocked. Use client-side sync instead.'
      });
    }
    
    const data = await response.json();
    const cetusMission = data.SyndicateMissions?.find((m: { Tag: string }) => m.Tag === 'CetusSyndicate');
    
    if (!cetusMission) {
      return Response.json({ success: false, error: 'CetusSyndicate not found' });
    }
    
    const activation = parseInt(cetusMission.Activation.$date.$numberLong);
    const expiry = parseInt(cetusMission.Expiry.$date.$numberLong);
    
    // Use the same update logic as POST
    const vercelToken = process.env.VERCEL_ACCESS_TOKEN;
    if (!vercelToken) {
      return Response.json({ success: false, error: 'Missing token' }, { status: 500 });
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
            { operation: 'upsert', key: 'cetus_start', value: activation },
            { operation: 'upsert', key: 'cetus_end', value: expiry },
            { operation: 'upsert', key: 'synced_at', value: Date.now() },
          ],
        }),
      }
    );

    if (!updateResponse.ok) {
      return Response.json({ success: false, error: 'Edge Config update failed' });
    }

    return Response.json({
      success: true,
      data: { activation, expiry, syncedAt: Date.now() },
    });
    
  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

