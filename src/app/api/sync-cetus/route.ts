import { NextRequest } from 'next/server';
import { get } from '@vercel/edge-config';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const EDGE_CONFIG_ID = process.env.EDGE_CONFIG_ID;

// Max unchanged attempts before stopping for the day
const MAX_UNCHANGED_ATTEMPTS = 3;

// Rate limiting: max requests per minute (global across all clients)
const MAX_REQUESTS_PER_MINUTE = 30;
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute

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

// Update rate limit counter in Edge Config
async function updateRateLimit(
  vercelToken: string,
  edgeConfigId: string,
  currentData: { count: number; windowStart: number } | null | undefined
): Promise<void> {
  const now = Date.now();
  const windowExpired = !currentData || (now - currentData.windowStart > RATE_LIMIT_WINDOW_MS);

  const newRateLimit = windowExpired
    ? { count: 1, windowStart: now }
    : { count: currentData!.count + 1, windowStart: currentData!.windowStart };

  await fetch(
    `https://api.vercel.com/v1/edge-config/${edgeConfigId}/items`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          { operation: 'upsert', key: 'rate_limit', value: newRateLimit },
        ],
      }),
    }
  );
}

// POST: Accept sync data from client browsers (residential IPs)
export async function POST(request: NextRequest) {
  const logPrefix = `[sync-cetus ${new Date().toISOString()}]`;

  try {
    // Rate limiting check
    const rateLimitData = await get<{ count: number; windowStart: number }>('rate_limit');
    const rateLimitNow = Date.now();

    if (rateLimitData) {
      const windowExpired = rateLimitNow - rateLimitData.windowStart > RATE_LIMIT_WINDOW_MS;
      if (!windowExpired && rateLimitData.count >= MAX_REQUESTS_PER_MINUTE) {
        console.log(`${logPrefix} RATE LIMITED - ${rateLimitData.count} requests in current window`);
        return Response.json({
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
        }, { status: 429 });
      }
    }

    const body = await request.json();
    const { activation, expiry } = body;

    // Validate required fields
    if (!activation || !expiry) {
      return Response.json({ 
        success: false, 
        error: 'Missing activation or expiry' 
      }, { status: 400 });
    }

    const activationTs = typeof activation === 'string' ? parseInt(activation, 10) : activation;
    const expiryTs = typeof expiry === 'string' ? parseInt(expiry, 10) : expiry;

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
      console.log(`${logPrefix} BLOCKED - Daily limit reached (${currentUnchangedCount}/${MAX_UNCHANGED_ATTEMPTS})`);
      return Response.json({ 
        success: true, 
        action: 'skipped',
        reason: `Daily limit reached (${MAX_UNCHANGED_ATTEMPTS} unchanged syncs)`,
        unchangedCount: currentUnchangedCount
      });
    }

    const vercelToken = process.env.VERCEL_ACCESS_TOKEN;
    if (!vercelToken || !EDGE_CONFIG_ID) {
      return Response.json({
        success: false,
        error: 'Server configuration error'
      }, { status: 500 });
    }

    // Update rate limit counter (non-blocking, fire and forget)
    updateRateLimit(vercelToken, EDGE_CONFIG_ID, rateLimitData).catch(() => {
      // Silently ignore rate limit update failures
    });

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

      console.log(`${logPrefix} UNCHANGED - count: ${newUnchangedCount}/${MAX_UNCHANGED_ATTEMPTS}, activation: ${activationTs}`);
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
      console.log(`${logPrefix} ERROR - Edge Config update failed`);
      return Response.json({ 
        success: false, 
        error: 'Failed to update storage' 
      }, { status: 500 });
    }

    console.log(`${logPrefix} UPDATED - activation: ${activationTs}, expiry: ${expiryTs}`);
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
    console.log(`[sync-cetus ${new Date().toISOString()}] ERROR - ${errorMessage}`);
    return Response.json({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}

// GET: Server-side sync (for Vercel cron only)
export async function GET(request: NextRequest) {
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';

  if (!isVercelCron) {
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
    
    const activation = parseInt(cetusMission.Activation.$date.$numberLong, 10);
    const expiry = parseInt(cetusMission.Expiry.$date.$numberLong, 10);
    
    // Use the same update logic as POST
    const vercelToken = process.env.VERCEL_ACCESS_TOKEN;
    if (!vercelToken || !EDGE_CONFIG_ID) {
      return Response.json({ success: false, error: 'Server configuration error' }, { status: 500 });
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

