# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repo contains a personal portfolio site at `lebe-dev.github.io` and a **Crypto Exchange Spread Calculator PWA** deployed to `/cc/`.

The calculator helps users in Georgia's crypto exchange offices determine if they're being overcharged. Users input their local exchange office's BTC/GEL rate, the app fetches the live CoinGecko market rate, and displays:
- The spread percentage between office and market rates
- Warning if spread > 2% (indicating overcharging)
- How much BTC they'll receive for their GEL amount
- Calculation history saved to localStorage

## Translation rules

This site supports multiple languages but author's primary language is Russian. So when you will translate articles don't pretend to be a native.

## Development Commands

All commands use `just` (Justfile-based):

```bash
just dev       # Start local dev server on http://localhost:8000
just lint      # Check for console.log and debugger statements in JS
just build     # Validate all required files exist + run lint
```

For focused testing: `just test <name>` (inherited from global CLAUDE.md, adapt as needed)

## Code Architecture

### Crypto Exchange Calculator (cc/)

**Single-page PWA with two-tab UI:**
- **Tab 1: Calculator** — Input GEL amount + office rate → calculates BTC spread + amount received
- **Tab 2: History** — Persistent list of saved calculations with Moscow timezone timestamps

**File Structure:**
```
cc/
├── index.html              # Single page with two DaisyUI tabs
├── manifest.json           # PWA manifest (standalone mode)
├── sw.js                   # Service Worker (cache-first static assets, network-first API)
├── js/
│   ├── app.js              # Core logic: API calls, calculations, storage (~350 lines)
│   └── ui.js               # Pure DOM rendering functions (~150 lines)
├── css/
│   ├── tailwind.min.css    # Vendored Tailwind CSS v4 (no CDN)
│   ├── daisyui.min.css     # Vendored DaisyUI (no CDN)
│   └── custom.css          # Animation keyframes (warning pulse) + status colors
└── icons/
    ├── icon-192.svg        # PWA icon
    └── icon-512.svg        # PWA icon (2x scale)
```

**Theme:** DaisyUI `lemonade` (configured in `index.html` via `data-theme="lemonade"`)

### Core Logic (app.js)

**API & Caching:**
- Single source: CoinGecko (`/api/v3/simple/price?ids=bitcoin&vs_currencies=gel`)
- Rate cache duration: **2 minutes** — repeated calculations within 2 min reuse the cached rate
- Timeout: 5 seconds on fetch
- No multi-source fallback (CoinCap×ExchangeRate would give ~5% different rate, causing phantom warnings)
- On 429 (rate limit) or timeout: fall back to cached rate with age displayed
- On all failures + no cache: show "Cannot fetch rate" error

**Calculations** (pure functions, easy to test):
```javascript
spread = ((officeRate - marketRate) / marketRate) × 100
btcAmount = gelAmount / officeRate
satoshis = btcAmount × 100,000,000
```

**Storage (localStorage):**
- `cc-lastRate`: JSON with `{rate, timestamp, source}`
- `cc-history`: Array of up to 50 calculation objects (oldest auto-deleted on overflow)
- Timestamps in ISO 8601 format (stored), rendered in Moscow timezone (UTC+3) via `ru-RU` locale with `Europe/Moscow` timeZone
- On `QuotaExceededError`: delete oldest 10 history entries and retry

**Event Flow:**
- Form submit → validate inputs → fetch/cache market rate → render results → save to currentCalculation
- "Save to History" button → append currentCalculation to storage → re-render history list
- "Refresh Rate" button → force fetch from API (bypass 2-min cache)

### UI Rendering (ui.js)

**Pure rendering functions** (no state, only DOM writes):
- `renderResults()` — Display calculation results, warning icon (if spread > 2%), market rate age
- `renderHistory()` — Render list of saved calculations as DaisyUI cards with delete buttons
- `renderStatus()` — Update connection status dot + text (online/cached/offline)
- `renderError()` — Display error message alert
- `hideError()` — Clear error alert

**Color Classes for Spread:**
- `spread-negative` (green) — office rate < market rate (good for user)
- `spread-warning` (red) — spread > 2% (warning icon pulsing)
- Default (gray) — 0% ≤ spread ≤ 2%

### Service Worker (sw.js)

**Caching Strategy:**
- Static assets (HTML, JS, CSS, icons): **cache-first** (fast, offline support)
- API calls to coingecko.com: **network-first** with 5s timeout, fall back to cache
- Cache versioning: `cc-v1` (bump in sw.js to force update)

**Update Flow:**
- On new version detected: show update banner (via `updatefound` event)
- User clicks "Update" → send SKIP_WAITING message to waiting worker
- Worker calls `skipWaiting()` → controller changes → page auto-reloads
- Banner has "Update" + "Later" buttons

### Styling

**CSS Framework:**
- **Tailwind CSS v4** (vendored, no CDN/build step)
- **DaisyUI** (vendored, provides pre-made components: card, form, alert, tabs, button, badge)
- **Custom animations** (pulse warning icon in custom.css)

**Status indicator colors (custom.css):**
```css
.status-dot.online  { /* green */ }
.status-dot.cached  { /* yellow */ }
.status-dot.offline { /* red */ }
```

## Key Implementation Details

### Input Validation
- GEL amount: must be > 0
- Office rate: must be > 0
- Both fields required (HTML5 validation + JS fallback)
- Show error alert on invalid input

### Spread Warnings
- Show warning icon (⚠️ triangle SVG) when **spread > 2%**
- Negative spreads (office < market) displayed in green, no warning
- Icon has "warning-pulse" animation class

### Rate Caching Strategy
**Why 2 minutes?** Avoid CoinGecko rate limit (10–30 req/min) while keeping data relatively fresh.

**Why single source?** Tested: CoinCap (via ExchangeRate API) gives ~5% different BTC/GEL than CoinGecko direct. With a 2% warning threshold, using two sources would produce spurious warnings mid-session.

### History & Timestamps
- Timestamps stored in ISO 8601 (app.js)
- Rendered in **Moscow timezone** (UTC+3) via `ru-RU` locale in ui.js
- Max 50 entries; oldest auto-deleted on new saves

### Error Handling
- Network errors → try cache fallback
- 429 (rate limit) → cache fallback with message
- Timeout (>5s) → cache fallback
- No cached rate at all → clear error message: "Cannot fetch rate. Check internet connection."
- Invalid inputs → validation error message
- localStorage full → delete oldest 10 history entries, retry

## Testing Approach

Manual checklist (no automated tests file yet):
- Calculate with known values: 1000 GEL, office 272000, market 259498 → spread 4.82%
- Verify satoshi conversion: 1 BTC = 100,000,000 sats
- Warning icon appears at spread > 2%, absent at spread ≤ 2%
- Negative spread displays in green without warning
- Offline mode: disable network → cached rate displayed with age
- Rate caching: two calculations within 2 min → same market rate (verify no extra API calls)
- History: save, delete individual entry, clear all
- Timestamps show Moscow timezone format
- PWA installs on mobile (DevTools → Application → Web App Manifest)
- Service Worker updates: check DevTools → Application → Service Workers

## Common Tasks

**Add a new calculation field:**
1. Add input in HTML form
2. Extend form validation in app.js
3. Update currentCalculation object structure
4. Pass new field to renderResults()
5. Add to history entry template in ui.js

**Change cache duration:**
- Modify `RATE_CACHE_DURATION` constant in app.js (currently 120000 ms = 2 minutes)

**Add rate source fallback (not recommended — see design notes):**
- Would require multi-source API logic in fetchRate()
- Risk: conflicting rates may trigger false warnings
- Better: stick with CoinGecko, cache aggressively, let user force-refresh

**Deploy changes:**
- `just lint` (catch console.log/debugger)
- `just build` (validate all files)
- `git push origin main` → auto-deployed to https://lebe-dev.github.io/cc/

## Browser & Platform Support

- **Modern browsers** (ES6 modules, fetch, localStorage, Service Workers)
- **PWA:** Installable on iOS 16+, Android (Chrome/Firefox)
- **Offline:** Works with cached rate for up to storage quota
- **Mobile:** Responsive via Tailwind (single column on small screens)

## Notes

- **No build step required** — Tailwind/DaisyUI are pre-minified, vendored locally
- **No database** — all data in localStorage (single user per browser)
- **No TypeScript** — plain ES6 modules
- **No package manager** — inline HTML, local CSS, no npm/yarn
- **Deployment:** GitHub Pages (static files only)
