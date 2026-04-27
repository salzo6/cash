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

## FanDuel multi-day event collision — fixed (2026-04-27)

The phantom Yankees @ Rangers arb root-caused. **Every** FanDuel MLB reading was tomorrow's odds, not today's, because FanDuel renders multiple game-days on a single scroll and `canonicalEventKey()` collapses cross-day same-teams matchups to one key.

### How the bug was diagnosed

The freshly-shipped American-odds-in-brackets display made the pattern instantly visible:

| Game | Page (today) | Page (tomorrow) | Panel read |
|---|---|---|---|
| NYY @ TEX | -168 / +142 | **-118** / +100 | -118 ✓ tomorrow |
| LAA @ CHW | -116 / -102 | **-136** / **+116** | -136 / +116 ✓ tomorrow |
| TB @ CLE | -136 / +116 | **-130** / **+110** | -130 / +110 ✓ tomorrow |
| CHC @ SD | -104 / -112 | **-118** / — | -118 ✓ tomorrow |
| BOS @ TOR | -138 / +118 | n/a | -120 (matches tomorrow pattern) |

100% consistency across 5 matched events made the root cause obvious. FanDuel emits two events for `New-York-Yankees-@-Texas-Rangers` (today + tomorrow). After `canonicalEventKey()` strips the book event ID and collapses `-@-` → `__`, both keys are `new-york-yankees__texas-rangers`. The second one wins the overwrite in `chrome.storage.session.byEventKey`. BetMGM doesn't have this problem because its MLB page only renders today's games, so its single per-game emission keys cleanly.

### Shipped

- `content/fanduel.js` `readEvents()` now passes its output through `dedupeByClosestStart()`. When multiple events collapse to the same canonical event_key, the dedup keeps the one whose `start_time_iso` is closest to `Date.now()` — in-progress and upcoming both beat far-future. FanDuel already emits `start_time_iso` per event, so no DOM changes were needed. Events without a time (unlikely on FanDuel) score `Infinity` (lowest priority).

### Diagnostic visibility

Two earlier fixes from this session enabled the diagnosis:

- **American odds in brackets** — `1.847 (-118)` made it instantly clear the script wasn't reading what was on the page (-168). Without this, the bug was indistinguishable from a freshness issue.
- **Per-team odds in matched events** — exposed the same bug across 5 different games, proving it wasn't a one-off and giving the cross-reference data to identify the root cause.

### Known follow-ups

- BetMGM also strips event ID from `event_key` and would have the same collision bug if BetMGM's MLB page started rendering multi-day games. Audit `content/betmgm.js`'s canonical-event-key logic + add the same dedup as defensive measure when start times become available there. (BetMGM doesn't currently emit `start_time_iso` — see `CHANGELOG.md` Phase 3 entry. Adding it requires capturing fresh BetMGM DOM samples.)
- Long-term, the right fix is to include the date portion of `start_time_iso` directly in `event_key` so cross-day same-teams games NEVER collide. Blocked on BetMGM emitting start times — without symmetry, including date in FanDuel-only would break cross-book matching for *today's* games too.

---

## Freshness — TTL tightened, per-leg staleness indicator (2026-04-27)

Phantom arbs survive when one book's stored data goes stale while the other refreshes. Tightening the cache TTL and surfacing staleness per leg.

### Shipped

- `background.js` `TTL_MS` reduced from `60_000` → `20_000`. Content scripts poll every 5s, so 20s = 4 missed polls before an entry is considered dead. Short enough to clear phantoms quickly; long enough to absorb one or two missed polls during a page transition without flapping. Stale entries now expire ~3× faster.
- `sidepanel/sidepanel.js` per-leg staleness indicator: small "Ns" tag next to each book name in the leg row. Reads `received_at_ms` from `item.by_book[leg.book]` and shows seconds since the last refresh from that book. Goes gold + bold when age >10s — visual cue that this leg's data is approaching its 20s expiry and may be the cause of a suspect margin.

### Not yet fixed (queued)

The deeper root cause — content scripts that include the wrong DOM element, or that go silent on a page transition — is unaddressed. The TTL fix is mitigation, not cure. Two follow-ups still pending:

- Per-book heartbeat tracking: if a book's content script hasn't sent ANY batch in N seconds (regardless of league), expire all of that book's entries. Catches the "tab navigated away" case faster than the per-event TTL.
- `stale_odds_suspect` factor in `risk.js`: fire when one leg is significantly older than the other or when implied total whipsaws between polls. Catches phantom arbs at the verdict layer even if the storage-side fix is imperfect.

---

## Profit display: worst / best / ideal (2026-04-27)

Caught during a real-world phantom-arb observation: panel showed "Profit $0.08 · ROI 0.08% on $100" for a Yankees @ Rangers MLB arb at 1.820 / 2.400. The $0.08 was technically correct (worst-case min profit), but the asymmetry was hidden — the Rangers-win outcome would have paid +$8.00, and the ideal pre-rounding split would have been a guaranteed +$3.51. At small total stakes ($100 here), $5 stake rounding can warp one outcome to "barely above zero" and the other to "8× higher" — the old summary line surfaced only the worst case.

### Shipped

- `lib/arb.js` `computeStakes()` now returns `profit_if_away`, `profit_if_home`, `min_profit`, `max_profit`, `min_roi_pct`, `max_roi_pct`, `ideal_profit`, `ideal_roi_pct`, `rounding_cost`. `realized_profit` / `realized_roi_pct` retained as backwards-compat aliases for `min_profit` / `min_roi_pct`. Per-outcome P&L = winning leg's payout − total stake (the losing leg's stake is sunk).
- `sidepanel/sidepanel.js` arb summary now shows `+$min → +$max · ideal +$X (X.XX%) on $N` so the spread is visible. When min == max (typical at $1000+ stakes) the range collapses to a single number. A second muted-gold line surfaces `$5 rounding cost: −$X.XX vs ideal split $A/$B` when the rounding cost is ≥$0.50 — visual cue that bumping stake size would close the gap.
- `lib/arb.test.js` adds the Yankees/Rangers screenshot as a regression fixture: 1.820/2.400 at $100 → $55/$45 rounded, $0.10/$8.00 per-outcome, $3.51 ideal, $3.41 rounding cost. All numbers locked.

### Why it matters

At $100 total stake, $5 rounding can bleed 90%+ of an arb's value. The display now makes that obvious instead of presenting min profit as if it were "the" profit. Practical takeaway baked into the UI: at small stakes the rounding cost is the bigger story; at $1000+ the cost falls below 0.1% of stake and the range visibly tightens.

### Related stale-odds finding (not yet fixed)

The screenshot that surfaced this also exposed a real stale-data bug: FanDuel's stored Yankees odds were 1.820 (decimal) while the actual FanDuel page was showing -168 (1.595). The arb was a phantom — at real odds the implied total is 1.044 (anti-arb, book vig). Two fixes pending:

- **Per-book-per-league freshness in `background.js`**: a missing-from-batch event should expire faster than the 60s TTL. Today, an empty batch (e.g. tab momentarily off the MLB page) leaves stale entries for the full TTL window.
- **`stale_odds_suspect` factor in `risk.js`**: fire when one book's reading is significantly older than the other's, or when implied total whipsaws between polls. Catches this class even if the storage-side fix is imperfect.

The Phase 6 risk scorer correctly returned SKIP on this phantom — but only because the user's accounts are still hard-blocked on age/recreational/float-cap, not because freshness was detected. If the accounts were warmed up, the same phantom would have come back as `GO`.

---

## Phase 6 — Risk scoring + tracker bridge (2026-04-26)

Every arb in the side panel now carries a `[GO]` / `[WAIT]` / `[SKIP]` verdict per pairing with an expandable reasoning trace, evaluated against the full 18-factor contract in [`RISK_SCORING.md`](./RISK_SCORING.md).

### Shipped

- **`../local-bridge/`** — read-only HTTP bridge (Node http stdlib, zero dependencies, ~80 LOC). `GET /state` re-reads `../tracker/events.jsonl` and `../tracker/rules.md` on every request — no caching — so threshold edits and new event logs both take effect immediately. Default port `5731`. Bun stdlib also works (`bun run server.js`); Node was used because `bun` isn't installed locally and the constraint was "stdlib, no framework," not "Bun specifically."
  - `local-bridge/state.js` — pure `parseEvents` + `parseRules` + `deriveState` functions. Replays event history into per-book derived state (current_balance, total_pnl, account_age_days, non_arb_bets_count, recent_avg_stake, recent_max_stake, bets_last_7d, last_{bet,deposit,withdrawal}_at, recent_clv_avg, recent_cashouts_count, status) plus a global `pairings_last_30d` counter keyed by sorted book pair.
  - `local-bridge/state.test.js` — synthetic event lists exercise every derived field plus the rules.md table parser. Run with `node state.test.js`.
  - **Read-only by design** — events are still appended by Claude in chat per `../tracker/README.md`. The extension never writes to `events.jsonl`.
- **`lib/risk.js`** — pure scoring function, no I/O, no DOM. Implements all 6 hard-SKIP factors and 12 behavioural-risk factors from `RISK_SCORING.md`. Per-book multiplier applied (`final_leg_score = clamp(sum(factors) × multiplier, 0, 1)`). Pairing score = `max(leg_a, leg_b)` — worse leg drives the verdict. Verdict thresholds `GO < 0.30 ≤ WAIT < 0.60 ≤ SKIP`; any hard-SKIP factor forces `SKIP` regardless of score. Re-imports `lib/markets.js` for the market-filter hard-block (defense-in-depth, since Phase 4 should already filter upstream).
- **`lib/risk.test.js`** — 30+ assertions covering each of the 18 factors individually, per-book multiplier (FanDuel 0.95 brings 0.30 raw down to 0.285 → GO; Bet365 1.10 amplifies 0.30 raw to 0.33 → WAIT), pairing-score `max()` rule, hard-block forcing-SKIP-regardless-of-score, the WAIT/SKIP verdict-threshold boundaries, the bridge-offline path including its history-free hard-block (market filter), the history-free behavioural check (stake rounding), and stake-vs-default-cap fallback. Run with `node lib/risk.test.js`.
- **`background.js`** — `fetchBridgeState()` calls the bridge per `computeAndBroadcast` pass with a 1.5s `AbortController` timeout. Every detected arb gets `{ verdict, pairing_score, bridge_status, vpn_check, legs: [{factors, reasoning, ...}] }` attached as `risk` in the `ARBS_UPDATE` payload. Payload also includes a `bridge` summary `{ online, url, generated_at_iso, vpn_check, event_count }` for the panel banners.
- **`sidepanel/`** — verdict tag (`[GO]` green / `[WAIT]` gold / `[SKIP]` red) on every arb card, color-coded left border per verdict. Expandable `<details>` reasoning trace per arb shows per-leg factors with their weight, label, and rule citation, plus the hard-skip rows highlighted red and the per-book multiplier line when ≠ 1.00. **Stake button per leg gates by verdict:** `GO` shows the normal copy-to-clipboard button; `WAIT` requires a "show $" click first to reveal the stake (then a second click copies); `SKIP` shows the stake struck-through and disabled. Bridge-offline banner (gold) appears at the top of `<main>` whenever the bridge is unreachable; VPN-unverified banner is always visible per the v1 limitation in `RISK_SCORING.md`.

### Phase 6 contract verification (2026-04-26 — passed)

- Two new entries in `tracker/events.jsonl`: FanDuel $100 deposit (2026-04-25), BetMGM $100 deposit (2026-04-26), both via Interac e-Transfer.
- `curl http://127.0.0.1:5731/state` returns the expected derived state for both books — FanDuel `account_age_days=1`, BetMGM `account_age_days=0`, both `current_balance=100`, both `non_arb_bets_count=0`.
- End-to-end smoke (bridge + risk.js): a synthetic NHL moneyline arb with $50/$50 stakes correctly returns `verdict: SKIP, pairing_score: 1.00` with three hard-SKIP factors per leg — `account_too_new`, `insufficient_recreational_history`, `stake_exceeds_float_cap` (50% of the $100 float). FanDuel leg's reasoning trace shows the per-book 0.95 multiplier applied. This is the rulebook talking — these accounts cannot be safely arb'd until they age 30 days, see 5+ recreational bets, and have a bigger float.
- 30+ `risk.test.js` assertions all pass; `state.test.js` 8 assertions all pass.

### Known gaps (per `RISK_SCORING.md` and `PLAN.md` Phase 6 section)

- **VPN factor 6** stays `UNVERIFIED` — the bridge has no reliable way to detect VPN/proxy from localhost. Documented; the side panel shows a persistent "VPN check unverified — relying on user discipline" indicator.
- **CLV factor (high / moderate)** stays silent until enough `bet_settled` events have `closing_odds` populated. That's expected; closing-odds capture is Phase 9 polish. Other factors carry the verdict in the meantime.
- **`bun` not installed locally** — bridge uses Node http stdlib instead. Same constraint (stdlib, no framework, no deps) — runs out of the box on either runtime.

### Process notes

- Bug caught during state.test.js: `bet_settled` and `bet_cashed_out` handlers were calling `bookSlot(placed._book)` before the post-loop fixup that set `_book` on each placed bet. Fix: stamp `_book` at placement time in the handler instead of as a separate pass. Tests went from 6 fails to 0 fails immediately.
- The "every arb is SKIP" output for the just-deposited accounts is **the correct steady state for early-ramp** — the rulebook's hard-blocks exist precisely to prevent arbing on a 0-day account with no recreational history. This is the system working as designed, not a bug. As accounts age past 30d and accumulate 5+ recreational bets, the hard-blocks clear and behavioural-only verdicts (GO / WAIT) start firing.

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
