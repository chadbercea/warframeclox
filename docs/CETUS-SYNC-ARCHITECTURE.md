# Cetus Cycle Architecture

## Overview

This document describes the architecture for fetching Cetus day/night cycle data.

### The Challenge

Warframe's official API (`api.warframe.com`) blocks requests from datacenter IPs (like Vercel servers), but `content.warframe.com/dynamic/worldState.php` works from servers.

### Solution

We use **Edge Config as a cache** with automatic refresh from the Warframe API:

1. Read cycle reference from Edge Config (ultra-fast, <1ms)
2. If stale (>2 hours), fetch fresh data from Warframe API
3. Update Edge Config with fresh data
4. Calculate current cycle state from reference

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ARCHITECTURE                                       │
└─────────────────────────────────────────────────────────────────────────────┘

   CLIENT                     VERCEL EDGE                  WARFRAME API
     │                            │                             │
     │  GET /api/cetus            │                             │
     ├───────────────────────────►│                             │
     │                            │                             │
     │                            │  Read from Edge Config      │
     │                            ├──────┐                      │
     │                            │      │ cetus_start,         │
     │                            │◄─────┘ synced_at            │
     │                            │                             │
     │                            │  If stale (>2h): fetch      │
     │                            ├────────────────────────────►│
     │                            │                             │
     │                            │◄────────────────────────────┤
     │                            │  CetusSyndicate data        │
     │                            │                             │
     │                            │  Update Edge Config         │
     │                            ├──────┐                      │
     │                            │      │ via Vercel API       │
     │                            │◄─────┘                      │
     │                            │                             │
     │  { cycleStart, isDay, ... }│                             │
     │◄───────────────────────────┤                             │
```

## Data Flow

### Step 1: Client Requests Cycle Data

The client calls `/api/cetus` on mount and periodically (every 60 seconds).

**File:** `src/lib/cetus-cycle.ts`

```typescript
const response = await fetch('/api/cetus');
const data = await response.json();
// { cycleStart, cycleEnd, isDay, state, source, ... }
```

### Step 2: Server Reads Edge Config

**File:** `src/app/api/cetus/route.ts`

```typescript
import { get } from '@vercel/edge-config';

const cetusStart = await get<number>('cetus_start');
const syncedAt = await get<number>('synced_at');
```

### Step 3: Auto-Refresh if Stale

If Edge Config data is older than 2 hours, fetch fresh from Warframe API:

```typescript
if (isStale) {
  const freshData = await fetchFromWarframeApi();
  if (freshData) {
    await updateEdgeConfig(freshData.cycleStart, freshData.cycleEnd);
  }
}
```

### Step 4: Update Edge Config

Uses Vercel REST API to update Edge Config:

```typescript
await fetch(`https://api.vercel.com/v1/edge-config/${configId}/items`, {
  method: 'PATCH',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({
    items: [
      { operation: 'upsert', key: 'cetus_start', value: cycleStart },
      { operation: 'upsert', key: 'cetus_end', value: cycleEnd },
      { operation: 'upsert', key: 'synced_at', value: Date.now() },
    ],
  }),
});
```

## Edge Config Data

```json
{
  "cetus_start": 1766039879789,
  "cetus_end": 1766048878662,
  "synced_at": 1766040477052
}
```

## API Response Format

### Warframe `worldState.php` (CetusSyndicate)

```json
{
  "Tag": "CetusSyndicate",
  "Activation": { "$date": { "$numberLong": "1766246853909" } },
  "Expiry": { "$date": { "$numberLong": "1766255852783" } }
}
```

### Our `/api/cetus` Response

```json
{
  "cycleStart": 1766246853909,
  "cycleEnd": 1766255852783,
  "isDay": true,
  "state": "day",
  "syncedAt": 1766250000000,
  "fetchedAt": 1766250001234,
  "source": "edge-config",
  "daysSinceSync": 0,
  "isStale": false,
  "responseTime": 2
}
```

### Source Values

| Source | Meaning |
|--------|---------|
| `edge-config` | Fresh data from Edge Config (<2h old) |
| `edge-config-stale` | Stale cache (API refresh failed) |
| `warframe-api` | Fresh data from Warframe API (Edge Config updated) |
| `warframe-api-no-cache` | Fresh API data (Edge Config update failed) |
| `warframe-api-seeded` | First-time seed from API |
| `warframe-api-direct` | Direct fetch (Edge Config unavailable) |
| `fallback` | Calculated from hardcoded reference |

## Fallback Chain

| Priority | Source | When Used |
|----------|--------|-----------|
| 1 | Edge Config (fresh) | Data exists and <2h old |
| 2 | Warframe API + update | Edge Config stale, API works |
| 3 | Edge Config (stale) | API failed, use old cache |
| 4 | Warframe API direct | Edge Config read failed |
| 5 | Calculated fallback | Everything failed |

## Environment Setup

### Required for Production

Add these to your Vercel project settings:

```
EDGE_CONFIG=<from Edge Config dashboard - auto-added>
EDGE_CONFIG_ID=<your Edge Config ID, e.g., ecfg_xxx>
VERCEL_ACCESS_TOKEN=<from Vercel account settings>
```

### Manual Sync Script

If automatic refresh fails, run manually:

```bash
./scripts/sync-cetus.sh
```

Requires `VERCEL_ACCESS_TOKEN` and `EDGE_CONFIG_ID` in `.env.local`.

## Why This Architecture?

### Advantages

1. **Ultra-fast reads** - Edge Config <1ms globally
2. **Auto-refresh** - No manual intervention needed
3. **Reliable fallbacks** - Multiple layers of backup
4. **No CORS issues** - Server-side fetch only
5. **Existing infrastructure** - Uses Edge Config you already have

### Trade-offs

1. **2-hour staleness** - Data refreshes every 2 hours max
2. **Requires env vars** - Need VERCEL_ACCESS_TOKEN for updates
3. **API dependency** - Warframe API must be accessible from Vercel

## For AI Agents

When working on this codebase:

1. **DO NOT** add client-side fetches to Warframe APIs (CORS blocked)
2. **DO** use Edge Config for caching (already set up)
3. **DO** maintain the fallback chain
4. **DO NOT** replace Edge Config with KV (Edge Config is already configured)
5. **DO NOT** add external CORS proxies (unreliable)
