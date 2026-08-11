# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repo contains a personal portfolio site at `lebe-dev.github.io` and a **Crypto Exchange Spread Calculator PWA** deployed to `/cc/`.

The calculator helps users in Georgia's crypto exchange offices determine if they're being overcharged. Users input their local exchange office's BTC/GEL rate, the app fetches the live CoinGecko market rate, and displays:
- The spread percentage between office and market rates
- Warning if spread > 2% (indicating overcharging)
- How much BTC they'll receive for their GEL amount
- Calculation history saved to localStorage

## Dev instance

Dev-сервер проксирован на https://test.home. Тебе ничего не надо запускать/перезапускать для этого, изменения в файлах подхватываются автоматически.

## Translation rules

This site supports multiple languages but author's primary language is Russian. So when you will translate articles don't pretend to be a native.

## Blog drafts

Blog posts live in `src/content/blog/<lang>/*.md` (Astro content collection, schema in `src/content.config.ts`). The `draft` frontmatter flag defaults to `false`.

- `draft: true` → post is **visible in `astro dev`** but **excluded from `astro build`** (the production artifact).
- The behaviour lives in `src/lib/blog.ts`: `getBlogPosts()` hides drafts only when `import.meta.env.PROD` is true. Always fetch blog entries through this helper, not `getCollection('blog')` directly, so drafts are filtered consistently across the listing pages, `[slug]` route (including translation links), and RSS feed.

## AI usage disclaimer

The disclaimer above a post is **opt-in**, never automatic (`src/i18n/aiUsageDisclaimer.ts`, resolved in `src/pages/[lang]/blog/[slug].astro`):

- `aiUsageDisclaimer: true` — use the language default text (and its button settings) from `aiUsageDisclaimerDefaults`
- `aiUsageDisclaimer: "…"` — a custom text; button fields still fall back to the language default
- field absent, `false`, or an empty string — no disclaimer is rendered at all

Translated posts normally carry `aiUsageDisclaimer: true`; a Russian original only gets one when it explicitly asks for it.

## Subtitles page (/subtitles)

Single, Russian-only, non-localized page (unlike blog/[lang] routes) listing subtitles the author translates into Russian.

- Page: `src/pages/subtitles.astro` (builds to `/subtitles/`, standalone `<BaseLayout lang="ru">`, not under `[lang]`)
- Data: `src/data/subtitles.ts` — array of `SubtitleEntry` objects, edited by hand for each new release
- Subtitle files themselves live in `public/subtitles/` (raw `.srt`/`.vtt`, downloaded via a link on the page)
- Formatting helpers: `src/lib/subtitles.ts` (unit-tested in `subtitles.test.ts`) — duration/date in both a visible short form and a spelled-out form for screen readers, plus `titleLang`/`buildAltTitles`
- `SubtitleEntry` fields: `title` (the Russian title when there is one), `originalTitle?` (native-language title, transliterated if the script isn't Latin), `englishTitle?`, `year?`, `originalLang` (ISO code, mapped to Russian names via `langNames`/`langNamesFrom` in the page), `dateAdded` (ISO 8601, date the entry was added to the site — entries are sorted newest-added-first), `fileName`, `format`, `duration?` (HH:MM:SS, copied by hand from the source video file), `wikipediaUrl?` (film's Wikipedia page, if any), `sourceUrl?` (where the original-language subtitles were sourced from), `translatedWith?`, `notes?`
- Linked from the Russian homepage (`src/pages/[lang]/index.astro`) in a "Субтитры" section shown only when `lang === 'ru'`, placed right after the "Записи" (posts) section

**Layout of one entry:** a lucide `captions` icon hanging left of the title (`text-indent` trick, so wrapped lines align with the text), title + year, download button pinned to the first line by a two-column grid; below it the alternative titles on one line, then a single meta row (`язык → русский`, duration, date). Everything except the title is one small size (0.85rem) in `var(--sans)`.

**Accessibility:** `duration`/`dateAdded` are rendered twice — a short visible form marked `aria-hidden`, and a spelled-out `.visually-hidden` sentence ("Продолжительность: 1 час 49 минут") for screen readers. `title` attributes always sit on the `aria-hidden` element so they never double-read. Titles carry `lang` (`titleLang()` picks `ru` / the source language / `xx-Latn` for transliterations) so speech synthesis switches pronunciation. Also: `role="list"` (Tailwind preflight strips list semantics), `<article aria-labelledby>` per entry, `aria-label` on download links, per-entry text in the `<summary>`, `:focus-visible` outlines, `prefers-reduced-motion` and `prefers-contrast` handling. `.visually-hidden` lives in `src/styles/global.css`.

**Adding a new entry:** drop the file in `public/subtitles/`, add an object to the `subtitles` array in `src/data/subtitles.ts`.

## Podcast translations (/[lang]/podcasts/)

Localized section (unlike `/subtitles`): it exists in every site locale, and the *transcript* language is chosen on the episode page itself, independently of the site locale.

- Pages: `src/pages/[lang]/podcasts/index.astro` (listing) and `[slug].astro` (one episode)
- Metadata: `src/data/podcasts.ts` — array of `PodcastEpisode`, edited by hand per episode: `slug`, `podcast`, `podcastUrl?`, `episode?`, `publishedAt?`, `dateAdded`, `sourceUrl?`, `translatedWith?`
- Transcripts: `src/data/podcasts/<slug>.<lang>.json`, shape `{ title, guest?, url?, transcript: [{ start, end, speaker, text }] }` with `HH:MM:SS` timecodes. **Title, guest, link to the original and duration all come from the JSON** and are deliberately not duplicated in `podcasts.ts` — `guest` is meant to become searchable later. `guest` is written in the transcript's own language, like `title` (`Ruben Laukkonen` / `Рубен Лаукконен`). `sourceUrl` in `podcasts.ts` exists only as an override for `url` (see `originalUrl`).
- Listing order: newest `dateAdded` first, ties broken by `publishedAt` (newest release first). Several episodes usually land on the same day, so keep `publishedAt` filled in — without it a tie falls back to array order.
- Loading/derivation: `src/lib/podcasts.ts` (unit-tested in `podcasts.test.ts`) — `import.meta.glob` over the JSON files, `availableLangs`, `preferredLang`, `transcriptDuration`, `originalUrl`, `listEpisodes` (returns `EpisodeSummary`: the episode plus `title`/`titleLang`/`guest`/`duration`/`langs` resolved for a given site locale)
- UI strings: `podcasts.*` and `section.podcasts*` keys in `src/i18n/ui.ts`, present in all seven locales
- Optional `glossary: [{ term, definition, aliases?, ignore? }]` in a transcript JSON renders as a definition list after the transcript **and** as inline tooltips inside the text (see below). It is **per language** and per episode — it lives inside `Transcript.svelte` so it switches together with the transcript, and the whole section is skipped for languages that don't have one. Only the heading (`podcasts.glossary`) comes from the site locale.
- Pure timecode helpers live separately in `src/lib/podcastTimecode.ts` **on purpose**: the Svelte component imports them, and importing `podcasts.ts` there would drag every transcript JSON into the client bundle. `src/lib/podcastTerms.ts` exists for the same reason.
- Linked from every locale's homepage (`src/pages/[lang]/index.astro`) in a "Podcast translations" section right after "Posts"

**Language selection:** the site locale picks the initial transcript (`ru` → Russian, everything else → English, via `preferredLang`); the reader then switches freely with the toggle in `src/components/Transcript.svelte`, which persists the choice in `localStorage` under `podcast-transcript-lang` and restores it on mount. Both languages ship in the page (~70 KB gzipped for a 55-minute episode), so switching needs no reload. The `<h1>` lives inside the component so the title switches with the transcript; `<title>`/`og:` stay in the locale's preferred language.

**Show filters on the listing:** chips above the list ("All" + one per show), derived from the episodes themselves (`new Set` over `podcast`), so a new show gets its chip for free. Filtering toggles `hidden` on the `<li>`s from a plain inline script in `index.astro` — the bar itself ships `hidden` and is revealed by that script, so no dead buttons without JS. Because `:first-child`/`:last-child` can't see past hidden items, the script adds `filterable` to the `<ul>` and marks the first/last *visible* entry with `is-first`/`is-last`; the CSS for spacing and rules is keyed off those classes. Keep this in mind when touching `.podcast-list` spacing.

**Search on the listing:** a `data-search` text input above the filter chips, case-insensitive, matched against `data-title` then `data-guest` on each `<li>` (either matching is enough — combined with the show filter via `applyFilters()` in the same inline script). A `data-no-results` message toggles when a query leaves nothing visible. The input also reads a `?q=` URL param on load to pre-fill and apply a search — that's how the guest link on the episode page lands here pre-filtered.

**Guest link on the episode page:** `Transcript.svelte` renders a link right after the `<h1>` (`guest`/`guestHref`/`guestLabel` props, from `[slug].astro`) pointing at `/${lang}/podcasts/?q=<guest>`. The guest text is fixed to the episode's `initial` transcript language (matching how `listEpisodes` resolves guest for that site locale) and does not follow the in-page language toggle — switching the toggle would otherwise point the link at a guest spelling the listing page can't match.

**Missing translations are fine:** only the languages actually present on disk are offered. With a single language the toggle is hidden and a `podcasts.onlyOneLang` note is shown instead.

**Inline glossary tooltips.** A glossary term is underlined in the transcript and shows its definition in a shadcn-svelte (bits-ui) tooltip, so the reader never has to jump to the glossary at the bottom. Both are kept — the section at the bottom is still rendered.

- **Positions are precomputed, not searched at runtime.** The glossary lists terms in the nominative ("Випассана"), the transcript inflects them ("випассану"); matching those needs Russian morphology. `scripts/glossary_terms.py` (PEP 723 script, `pymorphy3`, run through `uv`) lemmatises both sides and writes the character spans to `src/data/podcasts/<slug>.<lang>.terms.json` — `{version, sourceHash, hits: [[segment, from, to, term], …]}`. These files are **generated; never edit them by hand.**
- **Run it with `just glossary`.** It is a dependency of both `just dev` and `just build` (and therefore `just deploy`), so it cannot be forgotten. It is incremental: `sourceHash` covers the segment texts, the terms and the script's `VERSION`, so an unchanged episode is skipped in ~40 ms before `pymorphy3` is even imported. **Bump `VERSION` in the script whenever the matching algorithm changes** — that is what forces every sidecar to be rebuilt. `just glossary --force` rebuilds everything regardless.
- **Which spellings are matched.** The `term` field packs several names into one string; the script splits it on top-level `/` and `,`, and keeps a parenthetical only when it is Latin script (`Дзен (Zen)` → both). Cyrillic parentheticals are dropped on purpose — they are as often a qualifier (`Сати (пали)`, `Идеализм (философия сознания)`) that would match unrelated sentences. Words are matched whole and lemma-to-lemma, and the longest match wins on overlap.
- **When the automatic result is wrong,** fix it in the glossary entry, not in the sidecar: `aliases: [...]` adds spellings, `ignore: [...]` drops ones the script derived. The run prints a per-term hit count and flags terms it never found — read it. Two terms in ep. 112 legitimately never occur in the text; they still appear in the glossary section.
- **Only the first occurrence of a term per segment is marked up.** A speaker repeating "випассана" six times in one reply would otherwise turn the paragraph into a field of underlines. The sidecar still records *every* occurrence — the thinning happens in `splitSegment()`, so this rule can change without regenerating anything.
- **Rendering** lives in `Transcript.svelte`: `splitSegment()` from `src/lib/podcastTerms.ts` slices the segment text into plain runs and term runs. One `Tooltip.Root` with a bits-ui **tether** serves every occurrence, instead of a floating layer each. The `<p class="segment-text">` markup is deliberately written on one line — a newline between the parts would render as a space and pull sentences apart.
- **Touch:** a tap opens the tooltip through an explicit `onclick` → `tether.open(id)` (hence the hand-written trigger `id`), and `disableCloseOnTriggerClick` keeps the following click from closing it again. Do not "simplify" this to relying on focus: bits-ui deliberately ignores focus that arrived via a pointer, so on a phone the tooltip would never appear. The tooltip is capped at `min(24rem, 100vw - 1.5rem)` so it never runs off a phone screen.
- **Styling** follows the theme rather than inverting it (`bg-popover`/`text-popover-foreground`, `border-primary/80`), so the card is light in the light theme and dark in the dark one.
- **English transcripts carry no glossary yet,** so nothing is highlighted there; the code needs no change when one is added.

**Adding an episode:** drop `<slug>.en.json` / `<slug>.ru.json` into `src/data/podcasts/`, add an object to the `podcasts` array in `src/data/podcasts.ts`. Nothing else — routes, listing, filters, duration, guest and the link to the original all follow from the data, and `just dev`/`just build` generate the glossary sidecars. `just build` checks that `dist/<lang>/podcasts/` exists for every locale and that at least one Russian transcript still highlights terms.

## Reading progress & "read" marks (blog posts + podcast transcripts)

The site remembers how far the reader got in a post or a transcript, and lets them mark it read by hand. Everything is client-side: one `localStorage` key, no account, no sync, nothing sent anywhere.

**All the logic is in `src/lib/readingProgress.ts`** (pure, unit-tested in `readingProgress.test.ts`) — parsing/serializing the store, the position math, pruning. Only `loadStore()`/`saveStore()` at the bottom touch `localStorage`, and both swallow every error (Safari private mode throws on *access*, a full quota throws on write, and neither may break reading).

**Storage:** `localStorage['reading-progress']` = `{ v: 1, items: { [id]: { p, read, at } } }`, `p` a 0…1 position, `at` epoch ms. Anything unparseable, malformed or of a foreign `v` reads as empty, so a format change needs only a `STORE_VERSION` bump. Capped at `MAX_ENTRIES` (500), least recently touched dropped first.

**Identity is language-independent, and that is the point.** A `Target` carries two ids:

| content | `progressId` | `readId` |
|---|---|---|
| blog post | `post:<translationKey>` | same |
| podcast episode | `podcast:<slug>:<transcriptLang>` | `podcast:<slug>` |

A post read in Russian therefore shows as read in every translation (`translationKey`, falling back to the slug — every post currently has one). For a podcast the *position* is per transcript language — the two languages are two different texts to scroll through — while "read" belongs to the episode as a whole, so finishing the English transcript marks the Russian one read too. This split was a deliberate choice; don't collapse it.

**On the page — `src/components/ReadingProgress.svelte`**, one island that renders three things: the inline read toggle (it is placed where the toggle belongs, the other two are `position: fixed`), the 2px progress rail at the top of the viewport, and the "continue reading · 45%" pill.

- Progress is measured against a content element passed as `contentSelector` (`article` for posts, `.episode` for podcast pages) by the *bottom* of the viewport, so the last screenful counts as read and content shorter than the viewport is read on sight.
- **Nothing is written until the reader actually scrolls.** Merely opening a page must not overwrite the position saved on the previous visit — that is what the `dirty` flag guards, and it is why the resume pill still has something to offer.
- Reaching `READ_THRESHOLD` (95%) marks read automatically; scrolling back up never un-reads. Unmarking by hand resets the position to 0, so the pill does not immediately offer the very end.
- The pill is **never an auto-scroll**: it appears only when the stored position is a real distance ahead (`RESUME_MIN_GAP`), there is no `#hash` in the URL (an anchor is an explicit destination), and it disappears by itself after 15 s. Its scroll respects `prefers-reduced-motion`.
- Writes are debounced (400 ms) and flushed on `pagehide`/`visibilitychange`.
- In `Transcript.svelte` the island is nested inside the component (not placed in `[slug].astro`) because `progressId` follows the in-page language toggle. Switching language flushes the old language's position before adopting the new one — that `$effect` is the whole reason the component takes ids rather than a slug.

**In listings — `src/components/ReadingMarks.astro`.** The marks cannot be rendered at build time, so the markup ships an empty `<span class="reading-mark" data-reading-mark …>` slot per entry and one script per page fills the ones that have something to say (a check + "read", or "45%"), and puts `reading-read` on the slot's parent so the title dims. A slot declares `data-read-id` and optionally `data-progress-ids` (comma-separated; a podcast lists one per transcript language and the *furthest* is shown). Include `<ReadingMarks lang={lang} />` once on any page carrying slots — currently the homepage, `/[lang]/blog/` and `/[lang]/podcasts/`. It re-renders on the `storage` event, so a second tab stays in sync. `.reading-mark` / `.reading-read` styles live in `src/styles/global.css`.

**i18n:** the `reading.*` keys in `src/i18n/ui.ts`, present in all seven locales.

## Offline support / PWA (site-wide)

The whole site works offline through a root service worker at `/sw.js`, scoped to `/`. The calculator under `/cc/` keeps its **own** worker (`public/cc/sw.js`, scope `/cc/`) — the root worker bails out of every `/cc/` request, and the more specific registration wins for those pages anyway. Don't merge the two.

**`/sw.js` is generated, never committed.** `src/integrations/offline.ts` (an Astro integration wired up in `astro.config.mjs`) assembles it from two hand-written sources:

- `src/sw/shared.js` — pure helpers (`normalizePath`, `classifyAsset`, `planSync`, `staleUrls`, `formatBytes`, …), unit-tested in `shared.test.js` and also imported by `OfflineToggle.svelte`
- `src/sw/worker.js` — the worker body (lifecycle, fetch strategies, message protocol)

The two are **concatenated into one classic worker** with the leading `export` keywords stripped, so `shared.js` may only contain `export const` / `export function` / `export class` declarations — no `import`, no `export { … }`, no `export default`. The build throws a named error otherwise, and `src/integrations/offline.test.ts` compiles the real assembled output with `node:vm` to catch it in `just test`.

In `astro build` the integration scans `dist/`, hashes every file and inlines a manifest (`buildId`, `version`, `langs`, `shell` / `pages` / `media` entries with `url`, `hash`, `size`). In `astro dev` an `astro:server:setup` middleware serves the same worker with a `mode: 'dev'` manifest whose page list is derived from the content on disk — **dev and production behave the same**, except the dev worker never prefers the cache (Vite rewrites modules on every edit) and caches no assets.

**Caching strategies** (`src/sw/worker.js`):

| what | cache | strategy |
|---|---|---|
| `/_astro/*`, icons, `manifest.webmanifest` | `site-shell` | cache-first — every URL is content-hashed |
| HTML | `site-pages` | stale-while-revalidate; offline page as fallback |
| `/images/*`, `/subtitles/*.srt` | `site-media` | cache-first |
| previous manifest | `site-meta` | — |

Pages are keyed by `normalizePath()` — one entry serves `/ru/blog/x`, `/ru/blog/x/` and `/ru/podcasts/?q=name`.

**Install precaches only the seven `/[lang]/offline/` pages.** Everything else arrives through runtime caching, so a first visit costs nothing extra.

**Updates.** A deploy changes `buildId`, which changes `sw.js` byte-wise, so the normal service-worker update check applies: the new worker installs, waits, and `OfflineToggle.svelte` shows the update banner. On activate the worker compares the stored manifest with the new one and drops **only the URLs whose hash actually moved** (`staleUrls`) — a "saved for offline" copy survives a deploy and a re-save fetches just the changed pages. Bump `SW_VERSION` in `src/integrations/offline.ts` when the worker's own caching rules change; activating a worker with a new version wipes the content caches instead.

**"Save the site for offline reading"** is the cloud button in the header, next to the theme toggle (`src/components/OfflineToggle.svelte`, `client:idle`). It owns *all* service-worker interaction on the page: the offline badge (shown when `navigator.onLine` is false), the save/cancel/delete button with its progress ring, and the update banner. Saving covers the **current locale only** — the shell, the media and that locale's pages plus the shared ones (`/`, `/404.html`, `/subtitles/`, `/yaml/`), roughly 15 MB of storage for `ru`. Saving all seven locales would be ~67 MB, almost all of it podcast transcripts, so `planSync()` filters by locale on purpose. The size is shown in the button's label before anything is downloaded, and a running save is cancellable.

Message protocol, page → worker: `OFFLINE_STATUS`, `OFFLINE_SAVE`, `OFFLINE_CANCEL`, `OFFLINE_PURGE` (all carry `lang`), plus `SKIP_WAITING`. The worker broadcasts `OFFLINE_STATUS` and `OFFLINE_SYNC` to every window client.

**Registration lives in `BaseLayout.astro`** as an inline script rather than in the island, so offline support survives a hydration failure.

`public/manifest.webmanifest` + `public/icons/` make the site installable; icons are generated from `public/favicon.svg` with `rsvg-convert`. `/[lang]/offline/` is `noindex` and filtered out of the sitemap.

**Testing it:** `just preview` (a real build — the dev server's worker deliberately never serves stale content). Stop the preview server and keep navigating to see the cached site; a locale you never saved falls back to its `/[lang]/offline/` page.

## Error reporting (Sentry)

Unhandled exceptions from the pages and everything the offline machinery swallows are reported to Sentry. The calculator under `/cc/` is **not** covered.

**Configuration is read from `.env` at build time and baked into the bundle** — the site is static, there is nothing to read at runtime. `astro.config.mjs` calls Vite's `loadEnv` with an *empty* prefix (these names carry no `PUBLIC_`, so `import.meta.env` would never expose them) and inlines three `vite.define` constants, declared in `src/env.d.ts`: `__SENTRY_DSN__`, `__SENTRY_ENVIRONMENT__` (default `production`), `__SENTRY_RELEASE__` (the short git SHA). A DSN is a write-only key; shipping it is expected. `.env` is gitignored — see `.env.example`.

**Nothing is sent unless there is a DSN.** `SENTRY_DSN` is validated with the same `parseSentryDsn()` the worker uses, so a missing `.env`, an empty value and the `change-me` placeholder all resolve to "off": `sentryEnabled` is false, `BaseLayout.astro` renders neither boot script, the worker gets `SENTRY_CONFIG = null`, and no source maps are emitted. `astro dev` never reports either (`import.meta.env.PROD`, and the dev worker is assembled without the config) — **use `just preview` to test reporting**.

**Two independent reporters, on purpose:**

| where | how |
|---|---|
| pages | `@sentry/browser`, lazily loaded (`src/lib/sentry.ts` → `sentry.boot.ts`) |
| `/sw.js` | ~60 hand-written lines in `src/sw/worker.js` + helpers in `shared.js` |

The worker is a classic script assembled by concatenation — there is nothing to `import` from. It also reports during install/activate, when no window client exists to forward through, which is exactly when a broken deploy shows up. `parseSentryDsn`, `sentryStackFrames`, `sentryException` and `sentryEnvelope` live in `src/sw/shared.js` and are unit-tested in `shared.test.js`.

**Lazy loading and the early buffer.** The SDK is ~30 KB gzipped; a text-first blog should not spend its first seconds on it, so `bootSentry()` loads it on `requestIdleCallback` (3 s timeout). Errors thrown before it arrives would be lost, so a small inline script in `<head>` buffers `error`/`unhandledrejection` into `window.__sentryEarly` (capped at 25); when the SDK is up, `sentry.ts` replays the queue, calls `window.__sentryEarlyStop()` to remove those listeners and replaces the array with a live sink, so nothing is reported twice and late pushes still work. A pending error makes it skip the idle wait.

**`sentry.boot.ts` exists for tree-shaking, not tidiness.** Reaching the SDK through a namespace (`import('@sentry/browser').then((m) => m.init(…))`) keeps the whole namespace object alive and ships replay, feedback and tracing with it — 150 KB gzipped instead of 30. Static named imports in a separate module are what keeps it small. **Do not merge the two files.**

**Offline events** carry `scope: offline` plus an `op` tag. Worker side: `precache`, `activate`, `save`/`save.entry` (first failing URL + a summary of how many failed), `purge`, `status`, `navigate.put`/`asset.put`/`revalidate.put` (`QuotaExceededError` above all — a full storage box is otherwise completely silent), `offline-fallback` (the precached offline page is gone), and the two global handlers. Page side (`captureOffline`/`warnOffline`): `register` (pushed through the early buffer from the inline registration script in `BaseLayout.astro`, so it does not depend on the island), `ready`, `update`, `sync.partial`. A **failed navigation while offline is not reported** — that is the normal path and the reason the worker exists. The worker caps itself at 12 events per lifetime and dedupes by `op` + message.

**The browser offline transport** (`makeBrowserOfflineTransport`) queues events in IndexedDB and sends them when the connection returns — on this site the interesting errors happen precisely while offline.

**Source maps are published**, not uploaded: `vite.environments.client.build.sourcemap` (Astro 6 reads the client build's flag from there, *not* from `vite.build.sourcemap`) emits `dist/_astro/*.map`, and Sentry fetches them itself over `sourceMappingURL` — no auth token, no upload step. They are only emitted when a DSN is set, and `classifyAsset()` skips `.map` so they never end up in a reader's offline copy.

## Development Commands

All commands use `just` (Justfile-based):

```bash
just dev       # Start local dev server on http://localhost:4200
just lint      # Type-check + run unit tests + check for console.log/debugger in public/cc/js/
just build     # Run lint, then build + validate dist/ output (each locale dir, calculator index.html, sw.js, offline pages)
just test      # Run Vitest unit tests, optionally filtered: just test <name>
```

## Code Architecture

### Crypto Exchange Calculator (public/cc/)

**Single-page PWA with two-tab UI:**
- **Tab 1: Calculator** — Input GEL amount + office rate → calculates BTC spread + amount received
- **Tab 2: History** — Persistent list of saved calculations with Moscow timezone timestamps

**File Structure:**
```
public/cc/
├── index.html              # Single page with two DaisyUI tabs
├── manifest.json           # PWA manifest (standalone mode)
├── sw.js                   # Service Worker (cache-first static assets, network-first API)
├── js/
│   ├── app.js              # Core logic: API calls, event wiring, storage (~400 lines)
│   ├── ui.js               # Pure DOM rendering functions (~150 lines)
│   └── calc.js             # Pure calculation helpers, covered by Vitest (calc.test.js)
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
- Cache versioning: `cc-vN` (currently `cc-v6`; bump `CACHE_VERSION` in sw.js to force update)

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

**Automated (Vitest):**
- `public/cc/js/calc.test.js` — `calcSpread`/`calcBtcAmount`/`calcSats`, the CLAUDE.md worked example (1000 GEL, office 272000, market 259498 → spread 4.82%), `isRateStale`, `getFriendlyErrorMessage`, `isPositiveNumber`
- `src/i18n/utils.test.ts`, `src/i18n/aiUsageDisclaimer.test.ts` — pure i18n/content helpers
- `src/sw/shared.test.js` — the worker's pure helpers: URL normalization, locale detection, asset classification, the per-locale save plan, the stale-URL diff between two builds, size formatting, and the worker's hand-rolled Sentry bits (DSN parsing, V8/SpiderMonkey stack parsing, exception payload, envelope body)
- `src/integrations/offline.test.ts` — that the assembled `sw.js` still compiles as a classic script and carries its manifest, that non-inlineable module syntax fails the build, that `buildManifest` sorts `dist/` into the right caches and only marks genuinely changed files stale, and that the Sentry config is injected when there is one and `null` when there is not
- Run via `just test` or `npm run test`

**Manual checklist (DOM/PWA-only behaviour not covered by unit tests):**
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
- `just deploy` - deploy latest changes on site

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
