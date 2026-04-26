# Arb Scanner Extension

Chrome extension that scans Ontario sportsbook tabs for arbitrage opportunities and alerts when one exists.

> **Status: not yet built.** See [`PLAN.md`](./PLAN.md) for the phased implementation plan.

---

## What it is

A browser extension (Chromium: Chrome / Edge / Brave / Arc) that:

1. Injects a content script into pages on supported Ontario sportsbooks (FanDuel ON, BetMGM ON, Bet365 ON, …)
2. Reads odds from the page DOM as the user navigates
3. Background worker aggregates odds across all open sportsbook tabs
4. Detects arbs (combined implied probability `< 1.0`) across books
5. Computes stakes per leg (rounded to nearest `$5`, per [`../tracker/rules.md`](../tracker/rules.md))
6. Fires a native desktop notification with the recommended bets

The user keeps tabs open across 2–5 books and acts on alerts.

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
│ Tab: FanDuel ON        │  │ Tab: BetMGM ON         │  │ Tab: Bet365 ON         │
│ content/fanduel.js     │  │ content/betmgm.js      │  │ content/bet365.js      │
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
                         │ - fires notification        │
                         └─────────────────────────────┘
```

---

## Setup (when built)

### One-time

1. Create a second Chrome profile with no sportsbook accounts logged in — this is the **scanning profile**.
2. In that profile: `chrome://extensions` → enable **Developer mode** (top-right) → **Load unpacked** → select this folder.
3. Place actual bets from your normal logged-in profile when alerts fire — never from the scanning profile.

### Per session

1. Open the scanning profile.
2. For each sport you want to scan, open **one tab per book on that sport's landing page** (e.g. `/sports/nhl`). These pages list every upcoming game with moneylines, spreads, and totals visible inline — no click-through required.
3. For **player props**, open the individual game's detail page on each book — props don't appear on the sport landing page.
4. Leave tabs open. The extension polls each one every 5 seconds in the background.
5. Act on notifications when they fire.

---

## Tab strategy

You navigate. The extension reads.

- **Sport landing page = one tab per book per sport.** For v1 (moneylines/spreads/totals on NHL + MLB across 3 books), that's ~6 tabs total. Adding a sport adds 3 tabs; adding a book adds 1 per already-open sport.
- **Player props = one tab per game per book.** Props live on game-detail pages, so they cost more tabs. Hence Phase 7's note that props are a stretch.
- **In-page navigation works.** Modern sportsbooks are SPAs (URL changes without a full reload). The content script uses a `MutationObserver` to detect DOM changes and re-scrape automatically — so navigating naturally within a tab (e.g. clicking into a specific game) keeps the extension synced without you needing to refresh.
- **The extension will not auto-cycle URLs within a tab.** Constantly loading NHL → NBA → MLB on a timer inside one tab looks bot-like and would defeat the "you are the user" architecture. Tabs are opened once, by you, and polled in place.
- **Phase 9 helper:** an "open scan tabs for NHL" popup button that opens the standard URL set across all books in one click, so you're not pasting URLs every session.

---

## Important constraints

- **Tabs must be open.** The extension only reads what's currently loaded in the browser. It is *not* a 24/7 autonomous scanner.
- **Logged-out is sufficient and preferred.** Moneylines, spreads, and totals are visible without login. Scanning logged-out keeps the scanner cleanly separated from any betting account.
- **Geo-locked to Ontario.** Sportsbook IP geolocation already requires this — no extra config needed on a home Ontario connection.
- **Major markets only.** The scanner only surfaces arbs in NHL, NBA, MLB, NFL, top-tier soccer (Premier, La Liga, Serie A, Bundesliga, Champions League), and ATP/WTA tennis main tour. Niche markets, third-tier leagues, and player props are blocked at detection time per [`../tracker/rules.md`](../tracker/rules.md) — soft markets cluster arbers and accelerate account limiting.
- **No auto-fill.** The extension recommends stakes; the user types them. Sportsbook detection includes behavioural biometrics (mouse movement, typing cadence) — programmatic input would create a fingerprint anomaly among the highest-confidence single signals in the system. Stakes appear in the popup with copy-to-clipboard buttons; never written to any sportsbook page input.
- **Selectors break on redesigns.** Each book's DOM structure is unique and can change without notice. Maintenance is real: expect a few hours of selector-fixing per book per major redesign.

---

## Account-limit risk

The scanner itself creates **zero** risk to user accounts — the scanning profile is logged-out, so no betting identity is attached to the scraping activity at all.

Account-limit risk comes from the *bets you place* after acting on alerts. That risk would exist regardless of how arbs are found (paid scanner, manual eyeballing, this extension — same outcome). See [`../tracker/rules.md`](../tracker/rules.md) for the behaviour rules that mitigate it.
