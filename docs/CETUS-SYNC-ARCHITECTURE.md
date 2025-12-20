# Cetus Cycle Architecture

## Overview

This document describes the architecture for fetching Cetus day/night cycle data.

### The Challenge

Warframe's official API (`api.warframe.com/cdn/worldState.php`) blocks requests from datacenter IPs (like Vercel servers), but works fine from residential IPs (browsers).

### Solution

We use a **server-side caching architecture** with Vercel KV:

1. Server fetches from Warframe API on each request
2. If successful, caches to Vercel KV for 60 seconds
3. Subsequent requests serve from KV cache
4. If KV is unavailable, direct fetch or calculated fallback

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ARCHITECTURE                                       │
└─────────────────────────────────────────────────────────────────────────────┘

   CLIENT                     VERCEL EDGE                  WARFRAME API
     │                            │                             │
     │  GET /api/cetus            │                             │
     ├───────────────────────────►│                             │
     │                            │                             │
     │                            │  Read from KV cache         │
     │                            ├──────┐                      │
     │                            │      │                      │
     │                            │◄─────┘                      │
     │                            │                             │
     │                            │  If stale: fetch fresh      │
     │                            ├────────────────────────────►│
     │                            │                             │
     │                            │◄────────────────────────────┤
     │                            │  CetusSyndicate data        │
     │                            │                             │
     │                            │  Update KV cache            │
     │                            ├──────┐                      │
     │                            │      │                      │
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

### Step 2: Server Reads/Writes KV Cache

**File:** `src/app/api/cetus/route.ts`

```typescript
// Read from KV cache
const cached = await kv.get<CachedCetusData>('cetus_cycle');

// If fresh (< 60s old), return it
if (cached && Date.now() - cached.syncedAt < 60_000) {
  return Response.json({ ...cached, source: 'kv-cache' });
}

// If stale, fetch fresh from Warframe API
const wfData = await fetchFromWarframeApi();
if (wfData) {
  await kv.set('cetus_cycle', { ...wfData, syncedAt: Date.now() }, { ex: 3600 });
  return Response.json({ ...wfData, source: 'warframe-api' });
}

// Fallback to stale cache or calculation
```

## API Response Format

### Warframe `worldState.php` (CetusSyndicate)

```json
{
  "Tag": "CetusSyndicate",
  "Activation": { "$date": { "$numberLong": "1766246853909" } },
  "Expiry": { "$date": { "$numberLong": "1766255852783" } },
  ...
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
  "source": "kv-cache",
  "cacheAge": 1234,
  "responseTime": 45
}
```

### Source Values

| Source | Meaning |
|--------|---------|
| `warframe-api` | Fresh data from Warframe API |
| `warframe-api-direct` | Fresh data (KV unavailable) |
| `kv-cache` | Fresh cache (< 60s old) |
| `kv-cache-stale` | Stale cache (API failed) |
| `fallback` | Calculated from reference timestamp |

## Fallback Chain

| Priority | Source | When Used |
|----------|--------|-----------|
| 1 | Vercel KV (fresh) | Cache exists and < 60s old |
| 2 | Warframe API | Cache stale, fetch fresh |
| 3 | Vercel KV (stale) | API failed, use old cache |
| 4 | Calculated fallback | Everything failed |

## Environment Setup

### Required for Production

Add these to your Vercel project settings:

```
KV_REST_API_URL=<from Vercel KV dashboard>
KV_REST_API_TOKEN=<from Vercel KV dashboard>
```

### Local Development

- Without KV: Works with direct Warframe API fetch
- With KV: Set env vars in `.env.local`

## Why This Architecture?

### Advantages

1. **Simple** - Server handles all Warframe API calls
2. **Fast** - KV cache eliminates most API calls
3. **Reliable** - Multiple fallback layers
4. **No CORS issues** - Server-side fetch only
5. **Edge-compatible** - KV works from Vercel Edge runtime

### Trade-offs

1. **KV dependency** - Requires Vercel KV for caching in production
2. **Eventual consistency** - Data cached for 60 seconds
3. **Server IP blocking** - May fail in some datacenters (fallback handles this)

## For AI Agents

When working on this codebase:

1. **DO NOT** add client-side fetches to `api.warframe.com` (CORS blocked)
2. **DO** use the server API route for all Warframe data
3. **DO** maintain the fallback chain (KV → API → stale → calculated)
4. **DO** keep cache durations reasonable (60s matches Warframe update frequency)
5. **DO NOT** add external CORS proxies (unreliable, often blocked)
