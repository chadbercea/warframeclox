# Warframe Clox

Real-time Cetus day/night cycle tracker for Warframe's Plains of Eidolon.

## The Problem

Warframe players hunting Eidolons need to know when night falls on the Plains of Eidolon. The in-game cycle runs on a fixed 150-minute schedule (100 min day, 50 min night), but there's no easy way to check it without launching the game. Existing community tools are often outdated, ad-heavy, or unreliable.

## The Solution

A fast, accurate, offline-capable PWA that shows exactly when night begins—with optional notifications so you never miss a hunt.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: Shadcn UI + Tailwind CSS
- **Data Sync**: GitHub Actions + Vercel Edge Config
- **PWA**: Service worker with stale-while-revalidate caching
- **Notifications**: Web Notifications API
- **Deployment**: Vercel

## How It Works

### Data Sync Architecture

```
Warframe API → GitHub Action (daily) → Vercel Edge Config → /api/cetus → Components
```

The Cetus cycle is deterministic (150 min total). Once synced, timing stays accurate indefinitely. A GitHub Action runs daily to sync the current cycle timestamp to Edge Config. Components fetch from `/api/cetus` and calculate display state locally.

**Why not fetch directly from Warframe?**
- **CORS**: Warframe API has no CORS headers—browser JavaScript can't read responses
- **IP Blocking**: Cloud provider IPs (Vercel, GitHub) are intermittently blocked

The daily sync + calculation approach bypasses both problems.

| Priority | Source | Description |
|----------|--------|-------------|
| 1 | **Edge Config** | Synced daily from Warframe API via GitHub Action |
| 2 | **Calculated** | Deterministic fallback from reference timestamp |

### Cycle Calculation

Once we know any cycle start time, we can calculate all cycles:

```
CYCLE_LENGTH = 150 minutes
DAY_LENGTH   = 100 minutes
NIGHT_LENGTH = 50 minutes
```

The app fetches cycle data every 5 minutes and calculates countdown client-side between syncs.

### Offline Support

The service worker caches the app shell and uses stale-while-revalidate. If offline, the calculated fallback provides accurate timing.

### Notifications

Browser notifications fire at:
1. **5-minute warning** before transition
2. **At transition** when the cycle changes

Notifications work even when the tab is backgrounded.

## API Health Check

Verify the API is working:

```bash
curl -s "https://warframeclox.vercel.app/api/cetus" | jq
```

Response fields:
- `cycleStart` / `cycleEnd` - Unix timestamps (ms) for current cycle
- `isDay` - Boolean indicating day/night
- `fetchedAt` - When the response was generated
- `source` - Data source: `edge-config` or `calculated`
- `syncedAt` - When Edge Config was last synced (only for edge-config source)

## Development

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Production Build

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/
│   ├── api/cetus/route.ts   # Edge Config reader + fallback
│   ├── layout.tsx           # Root layout with PWA config
│   └── page.tsx             # Landing page
├── components/
│   ├── cetus-cycle-card.tsx # Main cycle display
│   ├── cetus-clock.tsx      # Countdown timer
│   ├── earth-globe-inner.tsx # 3D globe visualization
│   └── floating-menu.tsx    # Settings menu
├── hooks/
│   ├── use-notifications.ts # Web Notifications API
│   ├── use-api-status.ts    # Connection status
│   └── use-pwa-install.ts   # Install prompt handling
.github/
└── workflows/
    └── daily-worldstate-sync.yml  # Daily Warframe API sync
```

## Maintenance

### API Changes

If the Warframe World State API format changes:
1. Update the GitHub Action parsing logic
2. Verify `SyndicateMissions` structure and `CetusSyndicate` tag

### Cycle Timing Changes

If Digital Extremes changes the Cetus cycle duration:
1. Update constants in `src/app/api/cetus/route.ts`:
   - `DAY_LENGTH`
   - `NIGHT_LENGTH`
   - `CYCLE_LENGTH`
2. Update `REFERENCE_TIMESTAMP` with a recent known cycle start

### Cache Issues

Users can clear the PWA cache via the footer link. For development, bump `CACHE_NAME` in `public/sw.js`.

## Architecture Documentation

See [METHOD-DOC.md](./METHOD-DOC.md) for detailed architecture documentation.

## License

MIT
