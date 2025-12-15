import { get } from '@vercel/edge-config';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const CETUS_DAY_MS = 100 * 60 * 1000; // 100 minutes
const CETUS_CYCLE_MS = 150 * 60 * 1000; // 150 minutes total

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

  const cetusStart = await get<number>('cetus_start');
  const syncedAt = await get<number>('synced_at');

  if (cetusStart) {
    const calculated = calculateFromReference(cetusStart);
    return Response.json({
      cycleStart: calculated.cycleStart,
      cycleEnd: calculated.cycleEnd,
      isDay: calculated.isDay,
      fetchedAt: Date.now(),
      source: 'edge-config',
      syncedAt,
      responseTime: Date.now() - startTime,
    });
  }

  // Fallback
  const FALLBACK_REFERENCE = 1765688923671;
  const calculated = calculateFromReference(FALLBACK_REFERENCE);
  return Response.json({
    cycleStart: calculated.cycleStart,
    cycleEnd: calculated.cycleEnd,
    isDay: calculated.isDay,
    fetchedAt: Date.now(),
    source: 'calculated',
  });
}
