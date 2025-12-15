import { get } from '@vercel/edge-config';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const CETUS_DAY_MS = 100 * 60 * 1000; // 100 minutes
const CETUS_CYCLE_MS = 150 * 60 * 1000; // 150 minutes total
const STALE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days - warn if data older than this

function calculateFromReference(referenceStart: number) {
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
  const now = Date.now();

  try {
    const cetusStart = await get<number>('cetus_start');
    const syncedAt = await get<number>('synced_at');

    if (cetusStart) {
      const calculated = calculateFromReference(cetusStart);
      const isStale = syncedAt ? (now - syncedAt) > STALE_THRESHOLD_MS : true;
      const daysSinceSync = syncedAt ? Math.floor((now - syncedAt) / (24 * 60 * 60 * 1000)) : null;
      
      return Response.json({
        cycleStart: calculated.cycleStart,
        cycleEnd: calculated.cycleEnd,
        isDay: calculated.isDay,
        fetchedAt: now,
        source: 'edge-config',
        syncedAt,
        daysSinceSync,
        isStale,
        responseTime: Date.now() - startTime,
      });
    }
  } catch (error) {
    // Edge Config read failed - likely token expired or config issue
    const FALLBACK_REFERENCE = 1765688923671;
    const calculated = calculateFromReference(FALLBACK_REFERENCE);
    return Response.json({
      cycleStart: calculated.cycleStart,
      cycleEnd: calculated.cycleEnd,
      isDay: calculated.isDay,
      fetchedAt: now,
      source: 'fallback',
      error: 'edge-config-unavailable',
      message: 'Edge Config token may have expired. Check Vercel dashboard.',
      responseTime: Date.now() - startTime,
    });
  }

  // Fallback - no data in Edge Config
  const FALLBACK_REFERENCE = 1765688923671;
  const calculated = calculateFromReference(FALLBACK_REFERENCE);
  return Response.json({
    cycleStart: calculated.cycleStart,
    cycleEnd: calculated.cycleEnd,
    isDay: calculated.isDay,
    fetchedAt: now,
    source: 'calculated',
    warning: 'No data in Edge Config. Manual sync required.',
  });
}
