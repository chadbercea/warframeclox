# Cetus API Architecture

## Overview

This document describes the data flow architecture for syncing Warframe Cetus cycle data.

## Architecture

```
Warframe API → GitHub Action (daily) → Vercel Edge Config → /api/cetus → Components
```

### Data Flow

1. **GitHub Action** (`daily-worldstate-sync.yml`)
   - Runs once daily at 12:00 UTC
   - Fetches from `https://api.warframe.com/cdn/worldState.php`
   - Parses `SyndicateMissions` for `CetusSyndicate` entry
   - Writes `cetus_start`, `cetus_end`, `synced_at` to Vercel Edge Config

2. **API Route** (`/api/cetus`)
   - Reads from Edge Config first
   - Falls back to deterministic calculation if Edge Config unavailable
   - Returns: `{ cycleStart, cycleEnd, isDay, source, syncedAt?, responseTime? }`

3. **Components**
   - Fetch from `/api/cetus`
   - Calculate display state locally (time remaining, percent complete)
   - Re-fetch every 5 minutes to stay synced

## Why This Architecture?

### The CORS Problem

The Warframe API (`content.warframe.com`) returns data to any requester, but **does not include CORS headers**. This means:
- Server-side requests work fine
- Browser JavaScript cannot read the response (blocked by browser security)

Client-side direct API calls are not possible.

### The IP Blocking Problem

Warframe blocks requests from cloud provider IP ranges:
- Vercel function IPs: intermittently blocked
- GitHub Actions IPs: sometimes blocked
- Residential IPs: not blocked

This rules out reliable real-time server-side fetching.

### The Solution

**Once-daily sync + deterministic calculation**

The Cetus cycle is fixed at 150 minutes (100 day + 50 night). Once we know any cycle start time, we can calculate all future cycles indefinitely. The GitHub Action syncs once daily as a sanity check—if it fails, the calculated fallback continues working.

## Data Sources

| Source | Description |
|--------|-------------|
| `edge-config` | Synced from Warframe API via GitHub Action |
| `calculated` | Deterministic calculation from reference timestamp |

## Cycle Constants

```
CYCLE_LENGTH = 9,000,000 ms (150 min)
DAY_LENGTH   = 6,000,000 ms (100 min)
NIGHT_LENGTH = 3,000,000 ms (50 min)
```

## File Locations

| File | Purpose |
|------|---------|
| `.github/workflows/daily-worldstate-sync.yml` | Daily sync action |
| `src/app/api/cetus/route.ts` | API endpoint (Edge Config + fallback) |
| `src/components/cetus-cycle-card.tsx` | Main cycle display |
| `src/components/cetus-clock.tsx` | Countdown timer |
| `src/components/earth-globe-inner.tsx` | 3D globe with day/night sync |
| `src/hooks/use-notifications.ts` | Notification scheduling |
| `src/hooks/use-api-status.ts` | Connection status indicator |

## Removed Code

The following were removed as part of the CORS fix:

- `src/lib/cetus-cycle.ts` - Client-side Warframe API fetch (CORS blocked)
- `.github/workflows/sync-cetus-cycle.yml` - Old workflow with retry logic

## API Health Check

```bash
curl -s "https://warframeclox.vercel.app/api/cetus" | jq
```

Expected response:
```json
{
  "cycleStart": 1734234923671,
  "cycleEnd": 1734240923671,
  "isDay": true,
  "source": "edge-config",
  "syncedAt": 1734200000000,
  "fetchedAt": "2025-12-15T12:00:00.000Z"
}
```
