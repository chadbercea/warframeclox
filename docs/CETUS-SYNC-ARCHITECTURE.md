# Cetus Cycle Sync Architecture

## Overview

This document describes the **Browser-Side Sync** architecture for keeping Cetus day/night cycle data accurate without hitting API rate limits.

### The Problem

The Warframe API (`api.warframe.com`) blocks requests from:
- Cloud server IPs (Vercel, AWS, etc.)
- Data center IPs
- Any IP that looks "non-residential"

This means traditional server-side cron jobs or GitHub Actions **cannot reliably fetch** from the Warframe API.

### The Solution

**Browser-Side Sync**: The user's browser fetches DIRECTLY from the Warframe API using their residential IP (which is not blocked), then syncs it UP to Edge Config for all users.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BROWSER-SIDE SYNC ARCHITECTURE                      │
└─────────────────────────────────────────────────────────────────────────────┘

   USER'S BROWSER                                              WARFRAME
   (Residential IP)                                            (API)
        │                                                         │
        │  1. DIRECT fetch (no proxy, no server)                  │
        │  ────────────────────────────────────────────────────>  │
        │     https://api.warframe.com/cdn/worldState.php         │
        │                                                         │
        │  <────────────────────────────────────────────────────  │
        │     World State JSON (works because residential IP)     │
        │                                                         │
        │  2. Parse CetusSyndicate activation + expiry            │
        │                                                         │
        │                              VERCEL                     │
        │                              (Edge)                     │
        │                                │                        │
        │  3. POST to /api/sync-cetus    │                        │
        │  ───────────────────────────>  │                        │
        │     { activation, expiry }     │                        │
        │                                │                        │
        │                                │  4. Validate & store   │
        │                                │     in Edge Config     │
        │                                │                        │
        │  <───────────────────────────  │                        │
        │     { success: true }          │                        │
        │                                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Why this works:** The Warframe API blocks datacenter/cloud IPs but allows residential IPs. When your browser makes a direct fetch, it uses YOUR IP address, not any server's IP.

---

## Data Flow

### Step 1: Browser Fetches World State Directly

**File:** `src/lib/cetus-cycle.ts` → `fetchDirectFromWarframeApi()`

```typescript
// Browser makes DIRECT request to Warframe API (user's residential IP)
const response = await fetch('https://api.warframe.com/cdn/worldState.php', {
  cache: 'no-store',
});
```

**Why direct?** The Warframe API blocks datacenter IPs but allows residential IPs. The user's browser makes the request directly, using their home IP address, which is not blocked.

### Step 2: Parse Cetus Cycle Data

The World State JSON contains a `SyndicateMissions` array. We find `CetusSyndicate`:

```typescript
const cetusMission = data.SyndicateMissions?.find(m => m.Tag === 'CetusSyndicate');
const cycleStart = parseInt(cetusMission.Activation.$date.$numberLong, 10);
const cycleEnd = parseInt(cetusMission.Expiry.$date.$numberLong, 10);
```

**Data extracted:**
- `cycleStart` - Unix timestamp (ms) when current day cycle began
- `cycleEnd` - Unix timestamp (ms) when night cycle ends (150 min later)

### Step 3: Sync to Server (Edge Config)

**File:** `src/lib/cetus-cycle.ts` → `submitSyncToServer()`

```typescript
const response = await fetch('/api/sync-cetus', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ activation: cycleStart, expiry: cycleEnd }),
});
```

### Step 4: Server Validates & Stores

**File:** `src/app/api/sync-cetus/route.ts`

The server performs these validations before storing:

1. **Required fields** - activation and expiry must exist
2. **Reasonable timestamps** - Not too old (> 1 year), not too far future (> 3 hours)
3. **Valid cycle duration** - Must be ~150 minutes (8-10 million ms)
4. **Deduplication** - Skip if data unchanged from what's already stored
5. **Rate limiting** - Max 3 unchanged syncs per day per Edge Config

**Storage:** Vercel Edge Config (global, < 1ms reads)

```typescript
// Keys stored in Edge Config
{
  "cetus_start": 1765904896667,     // Cycle start timestamp (ms)
  "cetus_end": 1765913896667,       // Cycle end timestamp (ms)
  "synced_at": 1765908642000,       // When last synced (ms)
  "sync_date": "2025-12-16",        // Date of last sync (for rate limit reset)
  "sync_unchanged_count": 1          // How many times data was same today
}
```

---

## Reading Cycle Data

### For the UI (Fast Path)

**File:** `src/app/api/cetus/route.ts`

The `/api/cetus` endpoint reads from Edge Config and calculates current state:

```typescript
// 1. Read stored reference point
const cetusStart = await get<number>('cetus_start');

// 2. Calculate current cycle position
const CETUS_CYCLE_MS = 150 * 60 * 1000; // 150 minutes
const CETUS_DAY_MS = 100 * 60 * 1000;   // 100 minutes

const timeSinceReference = now - cetusStart;
const cyclePos = timeSinceReference % CETUS_CYCLE_MS;
const isDay = cyclePos < CETUS_DAY_MS;

// 3. Return current state
return Response.json({
  cycleStart: currentCycleStart,
  cycleEnd: currentCycleEnd,
  isDay,
  source: 'edge-config'
});
```

### Data Sources Priority

The client (`cetus-cycle.ts`) uses this priority:

1. **Direct API** - Browser fetches from Warframe API (syncs to server)
2. **Server API** - Reads from `/api/cetus` (Edge Config)
3. **localStorage** - Cached from previous session (< 24 hours old)
4. **Fallback** - Calculated from hardcoded reference timestamp

---

## Cycle Math

### Constants

```
Day duration:   100 minutes (6,000,000 ms)
Night duration:  50 minutes (3,000,000 ms)
Total cycle:    150 minutes (9,000,000 ms)
```

### Calculating Current State

Given a reference `cycleStart` timestamp (when day began):

```typescript
const now = Date.now();
const elapsed = now - cycleStart;
const positionInCycle = elapsed % CYCLE_DURATION;

// First 100 min = day, next 50 min = night
const isDay = positionInCycle < DAY_DURATION;

// Time remaining in current phase
const timeLeft = isDay 
  ? DAY_DURATION - positionInCycle
  : CYCLE_DURATION - positionInCycle;
```

---

## Validation Rules

### Client-Side (before sending)

```typescript
// Timestamp sanity check
cycleStart > 1577836800000  // After Jan 1, 2020
cycleEnd > cycleStart       // End is after start
```

### Server-Side (before storing)

```typescript
// 1. Timestamps are reasonable
const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;
const maxFuture = now + 3 * 60 * 60 * 1000;  // 3 hours

isValid = ts > oneYearAgo && ts < maxFuture;

// 2. Cycle duration is ~150 minutes
const cycleDuration = expiryTs - activationTs;
isValid = cycleDuration >= 8000000 && cycleDuration <= 10000000;

// 3. Rate limiting (prevent spam)
if (unchangedCount >= 3 && sameDay) {
  return { action: 'skipped', reason: 'Daily limit reached' };
}
```

---

## Error Handling

### Graceful Degradation

| Failure Point | Fallback |
|--------------|----------|
| Proxy fetch fails | Use cached Edge Config data |
| Edge Config empty | Use localStorage cache |
| localStorage empty | Use calculated fallback |
| Sync POST fails | Silent fail, old data persists |

### No Console Errors

All failures should be **warnings** or **info logs**, not errors:

```typescript
// ✅ Good - informational
console.log('[Cetus] Server sync failed:', response.status);

// ❌ Bad - looks like app is broken
console.error('CRITICAL: Failed to sync');
```

---

## File Reference

| File | Purpose |
|------|---------|
| `src/lib/cetus-cycle.ts` | Client-side sync logic, direct API fetch, cycle calculations |
| `src/app/api/cetus/route.ts` | Read endpoint (Edge Config → client) |
| `src/app/api/sync-cetus/route.ts` | Write endpoint (client → Edge Config) |

---

## Environment Variables

Required in Vercel:

```
EDGE_CONFIG=ecfg_xxxxx         # Edge Config connection string (auto-set by Vercel)
VERCEL_ACCESS_TOKEN=xxxx       # For Edge Config writes
```

The `EDGE_CONFIG_ID` is hardcoded in `sync-cetus/route.ts` for the write operation.

---

## Sync Behavior Summary

| Event | Action |
|-------|--------|
| User opens app | Browser fetches Warframe API via proxy |
| Data differs from Edge Config | POST to `/api/sync-cetus`, update Edge Config |
| Data same as Edge Config | Increment unchanged counter, skip write |
| 3+ unchanged syncs today | Stop attempting syncs until tomorrow |
| Proxy fetch fails | Fall back to Edge Config data |
| Edge Config read fails | Fall back to calculated estimate |

---

## Why This Architecture?

### ✅ Advantages

1. **No rate limits** - Each user's residential IP fetches once per session
2. **Self-healing** - Multiple users sync, so data stays fresh
3. **Fast reads** - Edge Config is < 1ms globally
4. **No cron jobs** - No server-side scheduled tasks needed
5. **Resilient** - Multiple fallback layers

### ⚠️ Trade-offs

1. **First user delay** - If Edge Config is stale, first user pays fetch cost
2. **Trust model** - We trust browser-submitted data (with validation)
3. **Eventual consistency** - Data might be ~5 minutes behind API

---

## For AI Agents

When working on this codebase:

1. **DO NOT** add server-side Warframe API calls (they will be blocked - datacenter IPs)
2. **DO NOT** add proxy rewrites - direct browser fetch is intentional (uses user's residential IP)
3. **DO NOT** change `console.log` to `console.error` (causes false alarm in browser)
4. **DO** keep the direct browser fetch to `api.warframe.com` - this works because the user's IP is not blocked
5. **DO** validate all timestamps before storing
6. **DO** maintain fallback chain priority
7. **DO** keep sync attempts rate-limited

### Key Invariants

- Edge Config always has valid data OR is empty (never garbage)
- Calculated fallback uses a known-good reference timestamp
- Sync only happens once per browser session (via `hasAttemptedServerSync` flag)

