# Cetus Cycle Architecture

## Overview

The Cetus day/night cycle is **deterministic** - it repeats every 150 minutes (100 min day, 50 min night). Once you have a single valid reference timestamp, you can calculate the current state forever using modulo math.

## How It Works

1. **Read reference from Edge Config** (`cetus_start`)
2. **Calculate current state** using modulo math
3. **Done** - no repeated API calls needed

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ARCHITECTURE                                       │
└─────────────────────────────────────────────────────────────────────────────┘

   CLIENT                     VERCEL EDGE                    EDGE CONFIG
     │                            │                              │
     │  GET /api/cetus            │                              │
     ├───────────────────────────►│                              │
     │                            │                              │
     │                            │  get('cetus_start')          │
     │                            ├─────────────────────────────►│
     │                            │◄─────────────────────────────┤
     │                            │  1766039879789               │
     │                            │                              │
     │                            │  Calculate: now - ref % 150m │
     │                            │                              │
     │  { isDay, timeLeft, ... }  │                              │
     │◄───────────────────────────┤                              │
```

## Edge Config Data

```json
{
  "cetus_start": 1766039879789,
  "cetus_end": 1766048878662,
  "synced_at": 1766040477052
}
```

This data is seeded once and used forever. The cycle math is deterministic.

## The Math

```typescript
const CETUS_DAY_MS = 100 * 60 * 1000;    // 100 minutes
const CETUS_CYCLE_MS = 150 * 60 * 1000;  // 150 minutes total

function calculateFromReference(referenceStart: number) {
  const now = Date.now();
  const timeSinceReference = now - referenceStart;
  const cyclePos = timeSinceReference % CETUS_CYCLE_MS;
  const isDay = cyclePos < CETUS_DAY_MS;
  return { isDay };
}
```

## Seeding Edge Config

If Edge Config is empty, the API route fetches once from Warframe and seeds Edge Config:

```typescript
// Only runs if Edge Config has no data
const freshData = await fetchFromWarframeApi();
await seedEdgeConfig(freshData.cycleStart, freshData.cycleEnd);
```

## Manual Re-sync

If the clock drifts (shouldn't happen, but just in case):

```bash
./scripts/sync-cetus.sh
```

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `EDGE_CONFIG` | Auto-added by Vercel when Edge Config created |
| `EDGE_CONFIG_ID` | For writing to Edge Config (`ecfg_xxx`) |
| `VERCEL_ACCESS_TOKEN` | For writing to Edge Config |

## For AI Agents

1. **DO NOT** add periodic API refreshes - the math is deterministic
2. **DO NOT** replace Edge Config with KV
3. **DO** use the existing `cetus_start` reference for all calculations
4. **DO** keep the fallback calculation as last resort
