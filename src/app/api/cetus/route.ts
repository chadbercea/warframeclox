import { get } from '@vercel/edge-config';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const CETUS_DAY_MS = 100 * 60 * 1000; // 100 minutes
const CETUS_CYCLE_MS = 150 * 60 * 1000; // 150 minutes total

// Hardcoded fallback reference (updated via sync script)
const FALLBACK_REF = 1766246853909;

export async function GET() {
  const startTime = Date.now();
  const now = Date.now();

  try {
    // Read from Edge Config (updated by sync-cetus.sh script)
    const cetusStart = await get<number>('cetus_start');
    const cetusEnd = await get<number>('cetus_end');
    const syncedAt = await get<number>('synced_at');

    if (cetusStart && cetusEnd) {
      // Use Edge Config data directly
      const timeInCycle = now - cetusStart;
      const isDay = timeInCycle >= 0 && timeInCycle < CETUS_DAY_MS;

      return Response.json({
        cycleStart: cetusStart,
        cycleEnd: cetusEnd,
        isDay,
        state: isDay ? 'day' : 'night',
        fetchedAt: now,
        source: 'edge-config',
        syncedAt,
        responseTime: Date.now() - startTime,
      });
    }

    // No Edge Config data - use fallback calculation
    const timeSinceRef = now - FALLBACK_REF;
    const posInCycle = ((timeSinceRef % CETUS_CYCLE_MS) + CETUS_CYCLE_MS) % CETUS_CYCLE_MS;
    const currentCycleStart = now - posInCycle;
    const currentCycleEnd = currentCycleStart + CETUS_CYCLE_MS;
    const isDay = posInCycle < CETUS_DAY_MS;

    return Response.json({
      cycleStart: currentCycleStart,
      cycleEnd: currentCycleEnd,
      isDay,
      state: isDay ? 'day' : 'night',
      fetchedAt: now,
      source: 'calculated-fallback',
      warning: 'No Edge Config data. Run scripts/sync-cetus.sh to update.',
      responseTime: Date.now() - startTime,
    });

  } catch {
    // Edge Config read failed - use fallback calculation
    const timeSinceRef = Date.now() - FALLBACK_REF;
    const posInCycle = ((timeSinceRef % CETUS_CYCLE_MS) + CETUS_CYCLE_MS) % CETUS_CYCLE_MS;
    const currentCycleStart = Date.now() - posInCycle;
    const currentCycleEnd = currentCycleStart + CETUS_CYCLE_MS;
    const isDay = posInCycle < CETUS_DAY_MS;

    return Response.json({
      cycleStart: currentCycleStart,
      cycleEnd: currentCycleEnd,
      isDay,
      state: isDay ? 'day' : 'night',
      fetchedAt: Date.now(),
      source: 'calculated-fallback',
      error: 'Edge Config read failed',
      responseTime: Date.now() - startTime,
    });
  }
}
