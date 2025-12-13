# Warframe Clox

Real-time Cetus day/night cycle tracker for Warframe's Plains of Eidolon.

## The Problem

Warframe players hunting Eidolons need to know when night falls on the Plains of Eidolon. The in-game cycle runs on a fixed 150-minute schedule (100 min day, 50 min night), but there's no easy way to check it without launching the game. Existing community tools are often outdated, ad-heavy, or unreliable.

## The Solution

A fast, accurate, offline-capable PWA that shows exactly when night begins—with optional notifications so you never miss a hunt.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: Shadcn UI + Tailwind CSS
- **API**: Official Warframe World State (`content.warframe.com/dynamic/worldState.php`)
- **PWA**: Service worker with stale-while-revalidate caching
- **Notifications**: Web Notifications API
- **Deployment**: Vercel

## How It Works

### Cycle Calculation

The app fetches cycle data from Digital Extremes' official World State API:

```
GET https://content.warframe.com/dynamic/worldState.php
```

The `SyndicateMissions` array contains a `CetusSyndicate` entry with `Activation` and `Expiry` timestamps marking the current cycle boundaries. The app syncs with this API every 5 minutes and calculates the countdown client-side between syncs.

### Offline Support

The service worker caches the app shell and uses a stale-while-revalidate strategy—serve cached content immediately, fetch fresh data in the background. If the API is unreachable, the app falls back to calculation from a known epoch.

### Notifications

Browser notifications fire at two points:
1. **5-minute warning** before transition
2. **At transition** when the cycle changes

Notifications work even when the tab is backgrounded.

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
│   ├── layout.tsx      # Root layout with PWA config
│   └── page.tsx        # Landing page
├── components/
│   ├── cetus-cycle-card.tsx  # Main cycle display
│   ├── header.tsx      # Nav with notification/install toggles
│   └── footer.tsx      # Offline indicator + cache clear
├── hooks/
│   ├── use-notifications.ts  # Web Notifications API
│   ├── use-pwa-install.ts    # Install prompt handling
│   ├── use-online-status.ts  # Online/offline detection
│   └── use-cache-clear.ts    # Cache clearing utility
└── lib/
    └── cetus-cycle.ts  # Cycle calculation engine
```

## Maintenance

### API Changes

The Warframe World State API is unofficial but stable. If the response format changes:
1. Check `SyndicateMissions` array structure in `src/lib/cetus-cycle.ts`
2. Update the `WorldStateResponse` interface
3. Verify the `CetusSyndicate` tag still exists

### Cache Issues

Users can clear the PWA cache via the "Clear cache" link in the footer. This:
- Deletes all service worker caches
- Unregisters the service worker
- Clears localStorage
- Forces a fresh reload

For development, bump `CACHE_NAME` in `public/sw.js` to invalidate old caches.

### Cycle Timing Changes

If Digital Extremes changes the Cetus cycle duration:
1. Update constants in `src/lib/cetus-cycle.ts`:
   - `CETUS_DAY_DURATION`
   - `CETUS_NIGHT_DURATION`
2. Update `FALLBACK_EPOCH` with a recent known cycle start

## License

MIT
