import { get } from '@vercel/edge-config';
import { NextResponse } from 'next/server';

// Calculated fallback (only if Edge Config is completely empty)
function calculateCetusCycle() {
  const CYCLE_LENGTH = 9000000;  // 150 minutes
  const DAY_LENGTH = 6000000;    // 100 minutes
  const REFERENCE_TIMESTAMP = 1765688923671; // Known day start

  const now = Date.now();
  const elapsed = now - REFERENCE_TIMESTAMP;
  const currentCycleStart = now - (elapsed % CYCLE_LENGTH);
  const currentCycleEnd = currentCycleStart + CYCLE_LENGTH;
  const isDay = (elapsed % CYCLE_LENGTH) < DAY_LENGTH;

  return {
    cycleStart: currentCycleStart,
    cycleEnd: currentCycleEnd,
    isDay,
    source: 'calculated'
  };
}

export async function GET() {
  try {
    // Read from Edge Config
    const start = await get<number>('cetus_start');
    const end = await get<number>('cetus_end');
    const syncedAt = await get<number>('synced_at');

    // If Edge Config has data, use it
    if (start && end) {
      const now = Date.now();
      const CYCLE_LENGTH = 9000000;
      const DAY_LENGTH = 6000000;
      const elapsed = now - start;
      const isDay = (elapsed % CYCLE_LENGTH) < DAY_LENGTH;

      return NextResponse.json({
        cycleStart: start,
        cycleEnd: end,
        isDay,
        syncedAt,
        source: 'edge-config'
      });
    }

    // Fallback: Edge Config is empty (should never happen after first sync)
    const calculated = calculateCetusCycle();
    return NextResponse.json(calculated, { status: 200 });

  } catch (error) {
    // Edge Config read failed - use calculation
    const calculated = calculateCetusCycle();
    return NextResponse.json(calculated, { status: 200 });
  }
}
