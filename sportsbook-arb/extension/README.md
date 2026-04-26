# Arb Scanner Extension

Chrome extension that scans Ontario sportsbook tabs for arbitrage opportunities and surfaces them in a side panel.

> **Status:** **operational.** Two books (BetMGM, FanDuel) × four leagues (NHL, NBA, NFL, MLB) × moneyline market. End-to-end pipeline verified; not yet observed surfacing a real arb in the wild — that's the immediate verification milestone. See [`CHANGELOG.md`](./CHANGELOG.md) for what shipped and [`PLAN.md`](./PLAN.md) for the original phased plan.

---

## What it is

A browser extension (Chromium: Chrome / Edge / Brave / Arc) that:

1. Injects a content script into pages on every Ontario sportsbook listed in [`lib/books.js`](./lib/books.js) — the dynamic registry of books the user has accounts on
2. Reads odds from the page DOM as the user navigates
3. Background worker aggregates odds across all open sportsbook tabs
4. Detects arbs (combined implied probability `< 1.0`) across books — restricted to approved major markets per [`lib/markets.js`](./lib/markets.js)
5. Computes stakes per leg (rounded to nearest `$5`, per [`../tracker/rules.md`](../tracker/rules.md)). The user-set total stake is the input today; live per-book float derived from [`../tracker/events.jsonl`](../tracker/events.jsonl) lands with Phase 6 risk scoring.
6. Surfaces detected arbs in a **side panel** (Chrome 114+, also Brave) docked to the side of the browser; the panel updates live as odds change

The user keeps tabs open across their books, leaves the side panel docked, and acts on what appears.

---

## Why a browser extension (and not a scraper or paid API)

We considered three approaches and ruled out two. Locking in the rationale here so we don't relitigate it:

| Approach | Why ruled out |
|---|---|
| **Local scraper** (Playwright + stealth plugin) | Bet365 (Datadome), FanDuel (Cloudflare), BetMGM (Akamai) detect and block free local scrapers within hours. Defeating them requires paid residential proxies. |
| **Paid odds API** (The Odds API, SportsGameOdds, OddsJam) | Either no Ontario regional coverage (The Odds API supports `us`, `us2`, `uk`, `eu`, `au`, `fr`, `se` — no `ca`) or starts at $99–500/month. User is firm: no paid services. |
| **Browser extension** ✅ | Runs inside the user's real browser session — there's no bot fingerprint to detect, because the user *is* the user. Free, no proxies, no API fees. Tradeoff: tabs must be open. |

---

## How it works

```
┌────────────────────────┐  ┌────────────────────────┐  ┌────────────────────────┐
│ Tab: <book A> NHL      │  │ Tab: <book A> NBA      │  │ Tab: <book B> NHL      │
│ content/<book A>.js    │  │ content/<book A>.js    │  │ content/<book B>.js    │
│ reads odds every 5s    │  │ reads odds every 5s    │  │ reads odds every 5s    │
└──────────┬─────────────┘  └──────────┬─────────────┘  └──────────┬─────────────┘
           │                           │                           │
           └───────────────────────────┴───────────────────────────┘
                                       │
                                       ▼
                         ┌─────────────────────────────┐
                         │ background.js               │
                         │ - aggregates odds by event  │
                         │ - runs arb detection        │
                         │ - computes stake split      │
                         │ - pushes update to panel    │
                         └──────────┬──────────────────┘
                                    │
                                    ▼
                         ┌─────────────────────────────┐
                         │ side panel (sidepanel/)     │
                         │ - live arb list             │
                         │ - reasoning + verdict       │
                         │ - copy-to-clipboard stakes  │
                         └─────────────────────────────┘
```

---

## Setup

### One-time

1. Create a second Chrome profile with no sportsbook accounts logged in — this is the **scanning profile**.
2. In that profile: `chrome://extensions` → enable **Developer mode** (top-right) → **Load unpacked** → select this folder.
3. Edit [`lib/books.js`](./lib/books.js) to register your books — see [Adding a book](#adding-a-book) below.
4. Place actual bets from your normal logged-in profile (or your phone apps) when arbs appear — never from the scanning profile.

### Per session

1. Open the scanning profile and click the extension toolbar icon to dock the side panel.
2. Set your total stake in the panel header (default $100, $5 increments).
3. Click **"Open scan tabs"** in the panel header — opens one tab per registered (book × sport) combination from `lib/books.js` in the current window, deduped against any already open. Today: 8 tabs (4 BetMGM + 4 FanDuel × NHL/NBA/NFL/MLB).
4. Leave the tabs alone. Content scripts poll every 5s; the panel updates live as matched events appear and as the math finds (or doesn't find) arbs.
5. When an arb appears, **vet it before placing.** Especially: if one leg is tagged LIVE and the other isn't, it's almost always a stale-page mirage that disappears within seconds. Open both books' game pages and confirm the prices are still bookable in real time.
6. Act fast. Copy the stake from each leg button → switch to the sportsbook tab (or phone app) → type the stake manually → place. No auto-fill, ever.

> **Phase 6 risk scoring (`GO`/`WAIT`/`SKIP` verdicts, account-age and float-cap hard-blocks per [`RISK_SCORING.md`](./RISK_SCORING.md)) is not yet shipped.** Until it is, the panel surfaces every arb regardless of whether it's safe to take. Manual discipline against [`../tracker/rules.md`](../tracker/rules.md) is the only safety layer.

---

## Adding a book

Books are registered in [`lib/books.js`](./lib/books.js). To add a new book the user has an account on:

1. Add an entry to the registry: `{ name, multiplier, urls: { homepage, nhl, nba, ... }, contentScript }`. URLs are the per-sport landing pages on that book's Ontario site.
2. Add the book's host pattern to `host_permissions` in `manifest.json` (manifest permissions are static; can't be derived at runtime).
3. Write a content script (`content/<book>.js`) with the DOM selectors for that book's odds. Per-book selectors are unavoidable — every book's page structure is unique.
4. Reload the extension.

### Capturing selectors for a new book

Don't probe blind. Open one of the book's games-list pages in your dev profile, then in the DevTools console run:

```js
copy(document.querySelector('<game-row-element>').outerHTML)
```

(For BetMGM that's `ms-six-pack-event`. For FanDuel/DraftKings/etc., it's whatever Angular/React component wraps a single game row — usually findable by inspecting one game card.) Paste the resulting HTML into chat and Claude writes the extractor in one pass. This avoids the iteration loop of guessing selectors against a page that hasn't hydrated yet.

Per-book risk multipliers come from [`../tracker/rules.md`](../tracker/rules.md). New books default to `1.00` until enough history exists to recalibrate.

---

## Tab strategy

You leave tabs open. The extension reads them passively.

- **One tab per (book × sport).** Today that's 8 tabs (2 books × 4 leagues), opened in one click via the **"Open scan tabs"** button. Adding tennis or another book later automatically expands the count via the registry.
- **In-page navigation works.** Modern sportsbooks are SPAs (URL changes without a full reload). The content script uses a `MutationObserver` to detect DOM changes and re-scrape automatically — so navigating naturally within a tab (e.g. clicking into a specific game) keeps the extension synced.
- **The extension will not auto-cycle URLs within a tab.** Constantly loading NHL → NBA → MLB on a timer inside one tab looks bot-like and triggers Cloudflare/Datadome rate-limiting on the scanning profile within hours, even logged-out. Tabs are opened once and read in place.
- **Many tabs in parallel is fine.** Each page loads once, content script reads passively. No timing pattern that bot-detection can latch onto.
- **Background tab throttling caveat.** Chrome throttles JavaScript in tabs that aren't visible — our 5s polling may slow to ~1 poll/min on a fully hidden tab. Still inside our 60s TTL, so the panel data won't expire. If you see "updated Ns ago" climb past 60s and counts drop, click into the scan window briefly to wake the tabs.

---

## Important constraints

- **Tabs must be open.** The extension only reads what's currently loaded in the browser. It is *not* a 24/7 autonomous scanner.
- **Logged-out is sufficient and preferred.** Moneylines, spreads, and totals are visible without login. Scanning logged-out keeps the scanner cleanly separated from any betting account.
- **Geo-locked to Ontario.** Sportsbook IP geolocation already requires this — no extra config needed on a home Ontario connection.
- **Major markets only.** The scanner currently surfaces arbs in **NHL, NBA, NFL, MLB moneylines** across two books. Other markets in [`lib/markets.js`](./lib/markets.js) are approved by the rulebook but not yet implemented: top-tier tennis (ATP/WTA — pending DOM capture), spreads / totals / puck-line / run-line (pending separate per-book extractor work). **Soccer is explicitly out of scope** — 3-way moneylines (win/draw/loss) require a different arb-math path the owner has decided not to build. Niche markets, third-tier leagues, and player props are blocked at detection time per [`../tracker/rules.md`](../tracker/rules.md) — soft markets cluster arbers and accelerate account limiting.
- **No auto-fill.** The extension recommends stakes; the user types them. Sportsbook detection includes behavioural biometrics (mouse movement, typing cadence) — programmatic input would create a fingerprint anomaly among the highest-confidence single signals in the system. Stakes appear in the side panel with copy-to-clipboard buttons; never written to any sportsbook page input.
- **Selectors break on redesigns.** Each book's DOM structure is unique and can change without notice. Maintenance is real: expect a few hours of selector-fixing per book per major redesign.

---

## Account-limit risk

The scanner itself creates **zero** risk to user accounts — the scanning profile is logged-out, so no betting identity is attached to the scraping activity at all.

Account-limit risk comes from the *bets you place* after acting on alerts. That risk would exist regardless of how arbs are found (paid scanner, manual eyeballing, this extension — same outcome). See [`../tracker/rules.md`](../tracker/rules.md) for the behaviour rules that mitigate it.
