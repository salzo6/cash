# Changelog

Each phase appends what shipped, what was manually verified on a real sportsbook page, and what's deferred. Per [`PLAN.md`](./PLAN.md) testing strategy.

---

## Phase 0 — Scaffolding (2026-04-26)

### Shipped

- `manifest.json` — MV3, `sidePanel` + `storage` + `alarms` + `tabs` + `windows` permissions, host permissions for BetMGM Ontario (`*.betmgm.ca`), FanDuel (`*.fanduel.com`), and `localhost:*/*` for the future Phase 6 bridge.
- `background.js` — module service worker. Logs install, registers side panel to open on toolbar click, accepts `GET_BOOKS` and `ODDS_UPDATE` runtime messages.
- `content/hello.js` — confirms content scripts inject on registered hosts.
- `sidepanel/sidepanel.{html,js,css}` — empty side panel; queries background for the book registry, listens for `ARBS_UPDATE` messages.
- `lib/books.js` — dynamic registry of FanDuel + BetMGM with multipliers from `../tracker/rules.md`. Per-sport URLs are starting placeholders; `null` entries indicate "not yet captured."
- `lib/markets.js` — approved-leagues allowlist (NHL, NBA, NFL, MLB, top-tier soccer, ATP/WTA tennis) per `../tracker/rules.md` "Market selection rules."

### Manual verification (2026-04-26 — passed)

- Loaded unpacked into a dev Chrome profile.
- `chrome.runtime.id` returns the extension ID from the service worker console — worker is alive.
- BetMGM Ontario (`www.on.betmgm.ca`): `[arb-scanner] hello` and `[arb-scanner] betmgm content script live` both fire.
- FanDuel (`sportsbook.fanduel.com`): `[arb-scanner] hello` fires.
- Side panel docks open with "monitoring 2 books" + empty state copy.
- Confirmed actual BetMGM Ontario host is `on.betmgm.ca` (not `sports.on.betmgm.ca`); `lib/books.js` updated.

### Deferred

- VPN detection — declared as v1 limitation in `RISK_SCORING.md`; relies on user discipline.
- "Open scan window" helper button — planned for Phase 9.
- Per-sport URL completion in `lib/books.js` — required only when Phase 9's helper ships; until then the user manually opens whatever sport pages they want scanned.

---

## Phase 1 — BetMGM NHL moneyline reader (2026-04-26)

### Shipped

- `content/betmgm.js` — polling harness (5s), parses decimal odds, posts `ODDS_UPDATE` messages, dedupes via signature comparison, re-polls on SPA URL changes via `MutationObserver`. Fail-loud `[SELECTOR-HEALTH]` warning fires when 0 events match on a games-list URL.
- Extractor reads each `ms-six-pack-event` game row, takes the 2 `.participant` divs (away, home), finds the moneyline group as the `ms-option-group` whose picks lack `.option-attribute` (falls back to last group), reads `.custom-odds-value-style` for decimal odds.
- `cleanTeamName()` reads only direct text nodes of `.participant` to skip the `.participant-country` span.

### Manual verification (2026-04-26 — passed)

- BetMGM Ontario NHL page (`/en/sports/hockey-12/betting/usa-9/nhl-34`) returns 7 moneyline events in console: Sabres@Bruins, Avalanche@Kings, Lightning@Canadiens, Oilers@Ducks, Flyers@Penguins, Golden Knights@Mammoth, Wild@Stars.
- Sabres@Bruins (live, score 4-0): away_odds=1.02 home_odds=14.00 — matches the visible page values.

### Process learning

The fastest way to write a per-book extractor is to copy `document.querySelector('<game-row-element>').outerHTML` into chat and let Claude write selectors against the actual DOM. Probing the live page through diagnostic logs costs many round-trips when the page is still hydrating or when a class name (`team-name` here) exists elsewhere on the page but not in the game container. Documented in `README.md` "Capturing selectors for a new book."

---

## Phase 3 — FanDuel NHL moneyline reader (2026-04-26)

### Shipped

- `content/fanduel.js` — same polling/dedup/MutationObserver harness as betmgm.js. Anchors on `aria-label="Moneyline, <team>, <odds> Odds"` (FanDuel's CSS class names are obfuscated, but aria-labels are stable). Reads American odds and converts to decimal so the data shape matches BetMGM.
- `manifest.json` — added `content/fanduel.js` content_scripts entry for `*://*.fanduel.com/*`.
- BetMGM extractor (`content/betmgm.js`, build v8) — now emits `event_key`, `event_id_book`, `is_live` to align with FanDuel's shape.

### Standardized event shape

Both books now emit:

```
{
  league: 'NHL',
  market: 'moneyline',
  away,                  // book's display name (BetMGM "Sabres", FanDuel "Buffalo Sabres")
  home,
  away_odds, home_odds,  // decimal
  event_key,             // canonical: "buffalo-sabres__boston-bruins" — matches across books
  event_id_book,         // book's internal numeric ID (different per book)
  start_time_iso,        // FanDuel only for now; BetMGM emits null until pre-game HTML is captured
  is_live,
  captured_at
}
```

`event_key` is derived from each book's URL slug: BetMGM `buffalo-sabres-at-boston-bruins` and FanDuel `buffalo-sabres-@-boston-bruins` both normalize to `buffalo-sabres__boston-bruins`.

### Sanity check

FanDuel American odds for live Sabres@Bruins (4-0): −6000 / +1400 → decimal 1.017 / 15.0. BetMGM emitted 1.02 / 14.00 for the same game. Same game, both books, expected close-but-not-equal pricing — exactly what arb math will look for.

### Manual verification (2026-04-26 — passed)

- BetMGM Ontario NHL page reads 7 moneyline events; FanDuel NHL page reads 9 (FD lists Carolina home games that BetMGM doesn't show on its abbreviated card).
- Sabres@Bruins (live, 4-0): BetMGM 1.02/14.00, FanDuel 1.017/15.0 — close but not equal pricing across books, exactly the shape the arb pass needs to consume.

---

## Phase 2 + 4 + 5 — Background aggregation, side panel UI (2026-04-26)

Phases 2, 4, and 5 of the original plan ship together because they're a single user-visible feature: odds in → arbs surfaced in side panel. Phase 6 (risk scoring) and Phase 9 (polish) deferred until a real arb is observed end-to-end.

### Shipped

- `lib/arb.js` — pure 2-way arb math. `findArb()` returns the best cross-book pairing if margin ≥ 0.5%; refuses same-book pairings. `computeStakes()` equalizes payout across both legs, rounds to nearest $5, reports realized profit AFTER rounding.
- `lib/arb.test.js` — 6 cases (real arb across two books, favorite-on-both rejection, same-book rejection, live extreme-odds rejection, stake-split equality, rounding-loss bounds). All pass.
- `background.js` — rewrites the Phase 0 stub:
  - `chrome.storage.session` is the source of truth (MV3 SW shutdown safe). Key `arb_state_v1` holds `{ byEventKey: { [event_key]: { [bookKey]: { ...event, received_at_ms } } } }`.
  - On every `ODDS_UPDATE`: replaces this book's entries for the leagues represented in the batch (an empty batch leaves data alone — TTL handles it), then runs `findArb()` + `computeStakes()` across each event with ≥ 2 books, broadcasts `ARBS_UPDATE`.
  - 60s TTL purge: per-book entries older than 60s drop out. A `chrome.alarms` tick (every 30s) flushes stale data even when no tabs are sending updates.
  - Handles `GET_STATE` (side panel cold-start) and `SET_STAKE` (user changes stake input).
- `sidepanel/sidepanel.{html,js,css}`:
  - Stake input (default $100, min $5, $5 step) — broadcasts `SET_STAKE`, panel re-renders with new stake.
  - Two sections: **Arbs** (full cards, green left-border, margin %, profit / ROI summary, two leg rows with book / team / decimal odds / clickable copy-stake button) and **Matched events** (compact rows, shows best 2-way margin even when negative, so the matching pipeline is debuggable when no arbs exist).
  - LIVE badge on live games. "updated Ns ago" status, ticks once a second.
  - No DOM mutation on any sportsbook page (rulebook constraint). Stake values are copied via `navigator.clipboard.writeText()`; the user types into the sportsbook tab manually.

### Manual verification (2026-04-26 — passed)

- Side panel renders matched-event cards with margin %, both books' badges, league tags. Empty `Arbs` section was correct — no positive-margin pairings in the slate.
- Stake input edits round-trip through the background and re-render the panel with new stake values.

### Deferred

- **Phase 6 — risk scoring + tracker bridge.** Owner doing this in the next session.
- **Phase 7 — Bet365.** Hardest book to scrape; only worth the cost once the pipeline has surfaced real arbs across the easier two.
- **Phase 9 polish** beyond the open-scan button (notifications, history view, freshness indicator, closing-odds capture).

### Process notes

- `chrome.storage.session` is the right surface here, not `chrome.storage.local`. Session storage is tied to the browser profile session and survives SW shutdown — it's exactly the right scope for "live odds across the next few hours of scanning." `local` would persist stale odds across browser restarts, which is worse than starting empty.
- Two-section UI (arbs above, matched events below) is a debugging affordance: if matching is broken, both sections will be empty even when content scripts are reading data correctly. Without the matched-events section the only signal of a broken pipeline is "no arbs," which is also the expected steady state.

---

## Multi-sport rollout — NHL / NBA / NFL / MLB (2026-04-26)

### Shipped

- `content/betmgm.js` (build v9) — sport detection from `location.pathname`. League is the first match of `/(nhl|nba|nfl|mlb)[-_/]/i` in the URL. Pages that don't match any league slug (homepage, account, settings) send empty events, letting TTL clear stale data. Same DOM anchors as v8 (`ms-six-pack-event`, `.participant`, moneyline `ms-option-group` via "no `.option-attribute`" rule).
- `content/fanduel.js` (build v2) — multi-sport href regex `/^\/(?:hockey|basketball|football|baseball)\/(nhl|nba|nfl|mlb)\/<slug>-<id>$/i`. Each event self-labels its league from its own href, so a single tab on a multi-sport page correctly tags every event. Same aria-label anchor for moneyline picks.
- Both scripts now log per-event lines for easy verification:

  ```
  [arb-scanner] betmgm NHL Sabres@Bruins 1.020/14.000 key=buffalo-sabres__boston-bruins LIVE
  [arb-scanner] fanduel NHL Buffalo Sabres@Boston Bruins 1.017/15.000 key=buffalo-sabres__boston-bruins LIVE
  ```

  Same `event_key` across books proves cross-book matching for that game.
- `background.js` — threads `league` through the matched-event payload (picked from whichever book's leg has it).
- `sidepanel/sidepanel.{js,css}` — small per-league color-coded tag (`NHL` / `NBA` / `NFL` / `MLB`) on every arb card and matched-event row.

### Manual verification (2026-04-26 — passed)

- BetMGM NHL: 7 events. NBA: 8 events. MLB: 5 events. NFL: 0 (offseason — only futures, no moneylines).
- FanDuel NHL: 9 events. NBA: 8 events. MLB: 10 events. NFL: 0.
- Cross-book `event_key` matching verified on every overlapping pair (20+ games checked across the 3 in-season leagues).
- Per-event console log lines render with team names, decimal odds, key, and `LIVE` tag where present.
- Side panel league tag colors render correctly (NHL blue, NBA orange, NFL purple, MLB green).

### Notes

- **NFL is offseason as of 2026-04-26** — expect 0 events on both books. Not a SELECTOR-HEALTH failure; the league page just lists future-season futures markets, not moneylines.
- **No new manifest entries** — both books are already host-permissioned; the same `content/<book>.js` runs on every page of that host regardless of sport.

### Deferred

- **Soccer (3-way moneyline)** — explicitly **out of scope.** The owner has decided not to support soccer arbs for the foreseeable future. `lib/arb.js` stays 2-way; soccer pages aren't matched by the URL regex.
- **Tennis** — 2-way math works, but ATP/WTA list-page DOM unverified on either book. Provide a sample URL + game-row outerHTML to enable.
- **Other markets** (spread / puck-line / run-line, totals) — separate dimension per sport. Defer until 2-way moneylines have surfaced real arbs.

---

## Stability + scan-window helper (2026-04-26)

Discovered during multi-sport verification: with 6+ tabs polling concurrently, several real bugs surfaced. Fixed in this pass plus the Phase 9 "Open scan tabs" helper since it was a small wire-up.

### Shipped

- **`background.js` — serial queue around all `chrome.storage.session` operations.** With 6+ tabs each posting `ODDS_UPDATE` every 5s, message handlers fire concurrently. The read-modify-write cycle in `handleOddsUpdate` was racing — later writers clobbered earlier writers' contributions, silently dropping entire books' worth of data (observed: panel showing 9 matched events when the underlying logs proved 19+ should match). All state-touching handlers (`ODDS_UPDATE`, `GET_STATE`, `SET_STAKE`, alarm tick) now run through a single-promise serial queue. Verified post-fix with the same tab set: 18 matched events, all books' data preserved.
- **`canonicalEventKey()` strips trailing `-neutral` from URL slugs (both `content/betmgm.js` and `content/fanduel.js`).** BetMGM appends `-neutral` to slugs for neutral-site games (e.g. MLB Mexico City series). FanDuel doesn't. Without normalization the same game produced different keys across books and didn't match. Both extractors now normalize, so neutral-site games key identically.
- **Doubleheader handling preserved.** `-game-1` / `-game-2` suffixes are NOT stripped — those represent genuinely different games with the same teams, and stripping would incorrectly merge them.
- **`background.js` + `sidepanel/` — "Open scan tabs" button.** Side panel header has a button that opens all 8 (book × in-season-league) tabs from `lib/books.js` in the user's currently focused window. Dedupes by exact URL — clicking again skips any already-open tabs. Driven by `scanWindowUrls()` from the registry, so adding a sport later automatically picks up its URL with no code changes.
- **`lib/books.js` — populated all 4 BetMGM URLs** (NHL `nhl-34`, NBA `nba-6004`, NFL `nfl-35`, MLB `mlb-75`). FanDuel URLs were already there from Phase 0. Soccer + tennis remain `null`.

### Manual verification (2026-04-26 — passed)

- After race-fix: panel showed 18 matched events (7 NHL + 8 NBA + 3 MLB after the `-neutral` issue, expected 5 MLB once content scripts re-load with the strip).
- Two phantom arbs (NBA Spurs@Trail Blazers +3.01%, MLB Marlins@Giants +1.80%) appeared in the first observation, both BetMGM-LIVE vs FanDuel-pre-game. On the next poll cycle when FanDuel's odds caught up, both flipped to negative margin — confirmed as stale-page mirages, not real arbs. Documents the live-vs-pre-game class of false positive.
- "Open scan tabs" button: opens all 8 in current window, dedupes correctly on second click (showed `all open`).

### Known issues (cosmetic, not blocking)

- **FanDuel `is_live` selector is wrong.** Avalanche@Kings was visibly LIVE during testing but the `svg[aria-label="live event"]` selector didn't match — the LIVE badge doesn't fire on FanDuel rows. Capture works fine; just the badge is missing. Fix needs the outerHTML of a confirmed-live FanDuel game row.
- **Live-vs-pre-game mirage arbs.** When BetMGM is live-pricing a game and FanDuel's content script polled while their UI was still showing pre-game odds, an apparent arb surfaces and disappears within seconds. Not user-actionable. Could be suppressed by requiring both books' `is_live` flags to agree before surfacing — deferred until LIVE-badge fix is in.
