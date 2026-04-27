# Implementation Plan — Arb Scanner Extension

Ships in 9 phases. Each phase is a complete, demonstrable milestone — we don't move to the next one until the current one works end-to-end on a real Ontario sportsbook page.

---

## Status as of 2026-04-26

The phase order in this document is the original plan. The actual build deviated — Phases 2/4/5 shipped together, Phase 8 (sport expansion) was pulled forward, and Phase 6 (risk scoring) was deferred. The owner's current scope:

> Get extractors for BetMGM + FanDuel → arb math → side panel UI → multi-sport coverage → first real arb in the wild → then risk scoring → then more books.

| Phase | Status | Notes |
|---|---|---|
| 0 — Scaffolding | ✅ shipped | manifest, books registry, markets allowlist, side panel skeleton |
| 1 — BetMGM NHL moneyline reader | ✅ shipped | build v9 (multi-sport) |
| 2 — Background aggregation | ✅ shipped | with serial queue around storage to defeat the multi-tab race |
| 3 — FanDuel NHL moneyline reader | ✅ shipped | build v2 (multi-sport) |
| 4 — Arb detection + stake calculator + market filter | ✅ partial | arb math + stake split shipped + tested. Market filter not yet enforced at detection time (only moneylines are scraped today, so nothing reaches the filter) |
| 5 — Side panel UI | ✅ shipped | arbs section + matched-events section (debug affordance) + stake input + LIVE badges + per-league color tags |
| 6 — Risk scoring + tracker bridge | ✅ shipped | local bridge + `lib/risk.js` (all 18 factors + multipliers + offline fallback) + side panel verdict tags / reasoning trace / banners |
| 7 — Bet365 | ⏳ deferred | until first real arb confirmed across the easier two books |
| 8 — Sport / market expansion | ✅ partial | NHL + NBA + NFL + MLB shipped (moneylines). **Soccer killed** by owner. Tennis pending DOM capture. Other markets per sport (spread/totals) deferred |
| 9 — Polish | ✅ partial | "Open scan tabs" button shipped. Notifications, history view, freshness indicator, closing-odds capture, selector-health panel display all deferred |

See [`CHANGELOG.md`](./CHANGELOG.md) for what shipped per session and the manual-verification record.

---

> Risk scoring (Phase 6) ships before adding more books or sports. The rules — fact-checked in [`../tracker/DETECTION_RESEARCH.md`](../tracker/DETECTION_RESEARCH.md) — are the foundation of the strategy. Every alert should carry a verdict from the moment alerts exist.

> **Two non-obvious behaviours that come from the rulebook and constrain the design:**
>
> 1. **Major markets only.** Arbs in non-major markets (third-tier soccer, niche sports, exotic markets, player props) are blocked at detection time. The approved list lives in `lib/markets.js`. Surfacing a non-approved market would invite the user to violate a hard-SKIP rule.
> 2. **Stake recommendations are display-only.** The extension must never write values into sportsbook page DOMs. Sportsbook detection includes behavioural biometrics (mouse movement, typing cadence) — programmatic input creates a fingerprint anomaly. Copy-to-clipboard is fine; auto-paste / DOM mutation on sportsbook pages is forbidden.

---

## Phase 0 — Scaffolding

**Goal:** an empty extension installed in a dev Chrome profile that proves the harness works, with the dynamic book registry and approved-markets list in place from day one.

- `manifest.json` (Manifest V3, permissions: `sidePanel`, `storage`, `alarms`, `tabs`, `windows`, host permissions matching every entry in `lib/books.js`, `http://localhost:*/*` for the Phase 6 bridge)
- `background.js` — service worker that logs `"extension loaded"` on install and registers the side panel
- `content/hello.js` — minimal content script injected on every registered book's host
- `sidepanel/sidepanel.{html,js,css}` — empty side panel that confirms it can open
- `lib/books.js` — dynamic registry of books the user has accounts on. Add a book = add an entry + matching `host_permissions` line + a `content/<book>.js` selector script. Default multiplier `1.00` per `../tracker/rules.md`.
- `lib/markets.js` — approved sports + markets allowlist (positive list; everything else is rejected)
- `CHANGELOG.md` — created here; every phase appends what was built and what was manually verified

**Done when:** opening any registered sportsbook in the dev profile shows our `"hello"` log in the page console; clicking the extension icon opens the side panel.

---

## Phase 1 — Single book, NHL moneylines, console-only

**Goal:** prove we can reliably read odds from a real sportsbook page, *and fail loudly when we can't*.

- Target: **BetMGM Ontario** first (FanDuel as fallback if BetMGM proves harder)
- `content/betmgm.js` reads NHL moneylines only — one market type, one sport (NHL moneyline is a major-market combo by definition; safe scope)
- Output: every 5 seconds, log `[{ event, home, away, home_ml, away_ml, timestamp }, …]` to the console
- **Selector strategy:** prefer `data-*` attributes over CSS classes (more redesign-resistant); document each selector with a comment naming the DOM hook it came from
- **Fail-loudly pattern:** if a polling cycle returns zero events while the URL pattern says we're on a games-list page, log `[SELECTOR-HEALTH] <book> returned 0 events`. This pattern carries through every later content script and feeds the popup health indicator in Phase 9. Without it, broken selectors fail silently and we don't notice for days.

**Done when:** loading BetMGM's NHL page shows accurate odds in the console for every visible game; intentionally breaking a selector triggers the `[SELECTOR-HEALTH]` warning.

---

## Phase 2 — Background aggregation

**Goal:** a central store for odds from any tab, surviving Manifest V3's idle-worker behaviour.

- `background.js` maintains a map `{ event_id: { betmgm: {...}, fanduel: {...}, … } }`
- **Persistence (critical for MV3):** write the map to `chrome.storage.session` on every update and re-hydrate on worker startup. Service workers shut down when idle (~30s) and module-scope variables get wiped. Without persistence, odds disappear every time you don't touch the browser for half a minute.
- Content scripts post via `chrome.runtime.sendMessage({ type: 'ODDS_UPDATE', book, events })`
- `event_id` = canonical key derived from `(sport, normalized_home, normalized_away, start_date)`
- TTL: a book's data for an event ages out after 60s without refresh (handles closed tabs)

**Done when:** opening BetMGM's NHL page populates the background map; closing the tab causes that book's data to age out; restarting the browser doesn't crash the extension on next page load.

---

## Phase 3 — Second book

**Goal:** odds from two books matched to the same event.

- Add `content/fanduel.js` (or whichever wasn't built in Phase 1)
- `lib/normalize.js`: team-name canonicalization (`"Toronto Maple Leafs"`, `"Maple Leafs"`, `"TOR"` → `"tor"`)
- Background log shows side-by-side odds when the same game is open in two tabs (one per book)
- Log unmatched events for debugging the normalizer

**Done when:** the same NHL game open in two tabs (one per book) shows up as a single entry in the background map with both books' odds.

---

## Phase 4 — Arb detection + stake calculator + market filter

**Goal:** detect real arbs *in approved markets only*, and compute exact stakes.

- Pure-JS module `lib/arb.js` (testable in Node without the browser)
- **Market filter (`lib/markets.js`):** approved sports + markets list, derived from [`../tracker/rules.md`](../tracker/rules.md) "Market selection rules":
  - **NHL, NBA, MLB, NFL** — moneyline, spread / puck-line / run-line, totals
  - **Top-tier soccer** — Premier League, La Liga, Serie A, Bundesliga, Champions League — moneyline (3-way) and totals
  - **Top-tier tennis** — ATP / WTA main tour — moneyline
  - Anything else (third-tier soccer, esports, niche sports, player props, exotics) → emit a `[MARKET-FILTER]` log line and discard. The arb is not surfaced. Per `RISK_SCORING.md`, non-major markets are a hard SKIP — surfacing would invite the user to violate the rule.
- **Scope at this phase: 2-way arbs only.** Head-to-head moneylines and over/under totals. 3-way arbs (soccer with draw possibility) deferred to Phase 8 with the soccer rollout.
- An arb exists when implied probabilities sum to `< 1.0` minus a margin floor (default `0.5%` to absorb stake rounding)
- Stake calculator: given a per-book max stake (from `MAX_STAKE_PCT_OF_FLOAT` in `rules.md`), split between legs to equalize payout; round each leg to nearest `$5`
- **Rounding loss surfaced:** compute both the *ideal* stake split (continuous) and the *rounded* split, and report the realized return after rounding. Notification shows rounded; popup shows both
- Re-run on every odds update; deduplicate the same arb if it persists across cycles

**Done when:** synthetic tests in `lib/arb.test.js` cover positive arbs, anti-arbs (both legs same book), 0% margin edge case, rounding behaviour, AND market-filter rejection of non-approved markets; live odds detect actual arbs in approved markets only.

---

## Phase 5 — Side panel UI (no verdict yet)

**Goal:** detected arbs appear in the side panel as they're found, with stake breakdowns the user can copy — *without* the extension auto-actioning anything in the sportsbook page.

- Side panel (`sidepanel/sidepanel.html` + `.js` + `.css`) renders an arb list. Background pushes updates to it via `chrome.runtime.sendMessage`; the panel listens.
- Each arb row example: `"NHL TOR/BOS — bet $80 on TOR @ BetMGM (-130), $100 on BOS @ FanDuel (+115). Profit ~$4 (2.1%)"`
- Each leg has a **copy-to-clipboard** button for its stake amount
- **Auto-fill / auto-paste forbidden.** The side panel must never set the value of any sportsbook page input. Behavioural biometrics track mouse movement and typing cadence — programmatic stake input creates a fingerprint anomaly. The user copies, switches to the sportsbook tab, and types manually.
- Empty state: when no arbs exist, the panel shows the count of (book × sport) tabs being monitored and the timestamp of the last scan, so the user can tell the system is alive.
- Cooldown: don't re-render the same arb as new within 10 minutes unless odds materially change. (Once it's in the list it stays; cooldown prevents flashing it as "NEW" repeatedly.)
- *Verdict (`GO` / `WAIT` / `SKIP`) is added in Phase 6. Phase 5 ships only the stake breakdown.*

**Done when:** a real arb (or test-injected one) appears in the side panel within seconds of being detected; copy-to-clipboard works on each leg's stake; verified that no DOM mutation happens on any sportsbook page from the extension.

---

## Phase 6 — Risk scoring + tracker bridge

**Goal:** every alert carries a `GO` / `WAIT` / `SKIP` verdict per pairing, with a reasoning trace.

The full contract is defined in [`RISK_SCORING.md`](./RISK_SCORING.md) — read that first. Phase 6 implements all 18 factors documented there (6 hard blocks + 12 behavioural risk factors), plus per-book multipliers.

### Local bridge

- Tiny Node server (Bun stdlib, no framework) on `localhost:NNNN`, started manually before scanning
- Lives in a sibling folder `sportsbook-arb/local-bridge/` (not part of the extension)
- Reads [`../tracker/events.jsonl`](../tracker/events.jsonl) on every request and computes the per-book derived state defined in `RISK_SCORING.md`:
  - Existing fields: `current_balance`, `total_pnl`, `recent_avg_stake`, `recent_max_stake`, `bets_last_7d`, `last_bet_at`, `last_deposit_at`, `last_withdrawal_at`, `pairings_last_30d`, `status`
  - **New from 2026-04-26 research:** `account_age_days`, `non_arb_bets_count` (count of `bet_placed` with `is_arb: false`), `recent_clv_avg` (computed from last 20 `bet_settled` events with `closing_odds` populated), `recent_cashouts_count`
- Reads thresholds from `../tracker/rules.md` (re-read on every request — no caching, so threshold edits take effect immediately)
- `GET /state` returns the per-book derived state object

### Risk scoring (`lib/risk.js`)

- Pure-JS, no I/O, no DOM — fully unit-tested in `risk.test.js`
- Implements 6 hard-SKIP factors and 12 behavioural-risk factors from `RISK_SCORING.md`
- Per-book multiplier applied: `final_leg_score = clamp(sum(factors) × per_book_multiplier, 0, 1)`
- Pairing score: `max(leg_a_score, leg_b_score)` — the worse leg drives the verdict
- Verdict: `GO < 0.30 < WAIT < 0.60 < SKIP`, plus any hard-SKIP factor forces SKIP regardless of score

### Hard-block coverage

The 6 hard-SKIP factors come from research-backed rules. The bridge must compute the data for all of them:

1. **Account not active** — from `account_status_change` events
2. **Account too new** — `account_age_days < MIN_ACCOUNT_AGE_DAYS` (30)
3. **Insufficient recreational history** — `non_arb_bets_count < MIN_NON_ARB_BETS_BEFORE_ARBING` (5)
4. **Stake exceeds float cap** — computed live against `current_balance`
5. **Non-major market** — pre-filtered in Phase 4 (this hard-block fires only as defense-in-depth if filter is bypassed)
6. **VPN / non-Ontario IP** — **v1 limitation: bridge does not check.** Detecting VPN/proxy reliably requires either an external IP-geolocation API (rejected: paid services + external dependency) or browser-side checks the bridge can't reach. The factor stays in the spec as `UNVERIFIED`; the rule is enforced by user discipline. Popup shows a "VPN check unverified — relying on user" indicator.

### Bridge-offline fallback

With 6 hard-block factors evaluated by the bridge, falling back to `GO` when the bridge is down would silently bypass account-age, recreational-history, market-tier, and frequency safeguards.

**v1 default when bridge is unreachable:** every pairing returns verdict `WAIT` with reasoning `"Bridge offline — hard-block and history factors not evaluated. Verify manually against rules.md before placing."` Notification still fires. Popup shows a "Bridge offline" banner with a "How to start the bridge" hint.

History-free checks that still run when bridge is offline: stake rounding, market-filter (since markets.js is in the extension, not the bridge), basic stake-vs-default-cap (using the `MIN_FLOAT_PER_BOOK_CAD` floor since live `current_balance` is unknown).

### Phase 5 panel extended

- Each arb row in the side panel ends with a verdict tag: `[GO]`, `[WAIT]`, or `[SKIP]`
- Expanding a row shows the full reasoning trace per pairing
- `WAIT` and `SKIP` verdicts highlighted; copy-to-clipboard buttons hidden behind a "show anyway" toggle on `WAIT` and disabled entirely on `SKIP`

### Extension does not write events

Events are still logged via Claude in chat — per [`../tracker/README.md`](../tracker/README.md). The extension reads `events.jsonl` (via the bridge) but never writes to it.

**Done when:** every arb notification includes a verdict per pairing and a reasoning trace; tests in `risk.test.js` cover each of the 18 factors plus per-book multipliers; alerts still fire (with `WAIT` + offline banner) when the bridge is down; the 6 hard-blocks are exercised end-to-end against synthetic events.

---

## Phase 7 — Add Bet365

**Goal:** the third book — known to be the hardest to scrape, *and* the highest-risk to bet on.

- `content/bet365.js`
- Bet365 uses obfuscated class names; expect attribute-and-structure-based selectors instead of class-based
- Document the selector approach explicitly in code comments so future redesigns can be patched fast
- Realistic time budget: 2–3× longer than FanDuel/BetMGM
- Per-book multiplier `1.10` applied automatically by `risk.js` per `rules.md` — Bet365 legs come back ~10% riskier than baseline. Same code path; multiplier is just data.

**Done when:** Bet365 NHL moneylines appear alongside the other books in the aggregated view; `risk.js` correctly applies the 1.10 multiplier in tests.

---

## Phase 8 — Sport & market expansion (within approved-markets list)

**Goal:** extend beyond NHL moneylines, but only into markets approved by `lib/markets.js`.

- Sport rollout order (Ontario book volume + arb frequency, all major-tier per `rules.md`):
  1. **NBA** — moneyline, spread, totals
  2. **NFL** — moneyline, spread, totals
  3. **MLB** — moneyline, run-line, totals
  4. **Top-tier soccer** — Premier League, La Liga, Serie A, Bundesliga, Champions League. Moneyline (3-way) and totals. **No third-tier leagues. MLS deferred until liquidity is reconfirmed.**
  5. **Top-tier tennis** — ATP / WTA main tour. Moneyline.
- For each sport: confirm per-book DOM is the same as NHL's (it usually is) and add the route
- **3-way arb math (soccer):** extend `lib/arb.js` with a 3-outcome variant for win/draw/loss markets. Same implied-probability principle, three legs, one extra constraint in the stake split. Add `arb.test.js` coverage for 3-outcome detection and rounding.
- **Player props / exotic markets are out of scope.** Per `rules.md` "Market selection rules," soft props cluster arbers and are tracked specifically. The extension never surfaces them, regardless of how juicy the math looks.

**Done when:** the extension is finding arbs across at least 3 sports in normal use, with at least one 3-outcome (soccer) arb tested end-to-end.

---

## Phase 9 — Polish + closing-odds capture

- Side panel header: last N arbs, current odds count per book, selector-health warnings, bridge-online indicator, VPN-unverified warning
- Per-book selector health check: surface in the panel if a book starts returning empty results (likely DOM redesign)
- Per-arb history view: log every detected arb to `chrome.storage.local` with whether the user acted on it
- Surfaced error logging in the panel (no need to open DevTools)
- **"Open scan window" button:** one click opens a separate Chrome window (`chrome.windows.create`) populated with one tab per (book × sport) combination from `lib/books.js`. The user minimizes that window and works in their main window with the panel. This is the *primary* way to start a scanning session.
- **Closing-odds capture for CLV scoring:** persist a per-event time series of odds in `chrome.storage.local` (in addition to current odds in `chrome.storage.session`). When a user logs a settlement via Claude in chat, the scorer can pull the last-observed odds at scheduled start time as `closing_odds`. Until this ships, the user notes closing odds manually at settlement. CLV is the primary signal in `RISK_SCORING.md`, so this polish is high-value, not cosmetic. TTL: drop history at scheduled game start (closing odds are captured at start; later odds are post-game noise).
- **Approved-markets list view:** panel shows the current `lib/markets.js` list. Editing the list still requires editing the file (intentional friction — adding non-major markets bypasses a hard-SKIP and accelerates account limiting).

**Done when:** a normal scanning session is observable from the side panel alone, no DevTools required; closing-odds auto-fill works on at least one settled bet end-to-end.

---

## Tech stack

- **Manifest V3** (current Chrome standard; service-worker background, not persistent background pages)
- **Vanilla JS** for v1 — no build step, fastest iteration. Migrate to TypeScript only if the codebase grows past ~5 files.
- **Pure-JS** logic in `lib/` (arb math, risk scoring, market filter, normalization) — testable in Node without the browser
- **No frameworks.** Popup is plain HTML + CSS + a small script.
- **No external runtime dependencies** for the extension itself. The Phase 6 local bridge is the only place a Node dependency lives, and it stays minimal (Bun stdlib + JSONL parsing).

---

## Tech notes — Manifest V3 gotchas + research-backed constraints

- **Service workers are short-lived.** Chrome shuts down idle workers within ~30s. Any state that needs to survive must be in `chrome.storage` (not module-scope variables). Phase 2 handles this for odds; risk-score caches in Phase 6 follow the same pattern.
- **`setInterval` doesn't survive worker shutdown.** Use `chrome.alarms` for any background polling that needs to outlive idle periods. (Content-script polling inside live tabs is fine — those run in the page's own context.)
- **Side panel API requires Chrome 114+.** Manifest declares `"side_panel": { "default_path": "sidepanel/sidepanel.html" }` plus the `sidePanel` permission. `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })` makes clicking the toolbar icon open the panel.
- **Cross-origin requests from the extension to `localhost:NNNN`** (the Phase 6 bridge) require `http://localhost:*/*` in `host_permissions`. Without this, fetch fails silently.
- **Content-script injection timing.** Use `run_at: "document_idle"` for sportsbook pages — they hydrate odds asynchronously, and `document_start` would scrape a blank page.
- **Behavioural-biometrics constraint (research-backed).** The extension MUST NOT set values in any sportsbook page DOM. Sportsbook detection (per `DETECTION_RESEARCH.md`) tracks mouse movement and typing cadence; programmatic input creates a fingerprint anomaly. The extension reads the page; the user types into it. Enforce in code review: no `.value =`, no `dispatchEvent`, no `click()` on sportsbook page elements.
- **VPN detection limitation.** From a localhost server, detecting VPN/proxy reliably needs either an external IP-geolocation API (rejected) or special browser permissions. v1 documents the gap in the side panel and relies on user discipline. Future: a content script could fetch a known geo-aware endpoint and report results to the bridge.

---

## Testing strategy

Each phase ships with regression coverage so the next book or sport doesn't silently break the previous one:

- **Pure logic** (`lib/arb.js`, `lib/risk.js`, `lib/markets.js`, `lib/normalize.js`): unit-tested in Node against synthetic fixtures. Tests live next to the code (`*.test.js`).
- **`lib/markets.js` coverage:** every approved sport+market combo has a positive test; common rejected cases (third-tier soccer, esports, player props, niche markets) have negative tests. Adding to the approved list requires adding the corresponding test.
- **Content scripts:** captured-HTML fixtures. Save a snapshot of each book's relevant page (NHL games list, a game-detail page) into `extension/test/fixtures/`. Selector functions can be unit-tested against the fixtures without a browser.
- **Manual smoke per phase:** every phase's "Done when" requires at least one verification on a live sportsbook page in the dev Chrome profile. What was opened and what was seen → recorded in `CHANGELOG.md`.
- **When a redesign breaks selectors:** capture a fresh fixture, fix the selector, add a test that would have caught the break.

---

## File structure (target shape after Phase 9)

```
sportsbook-arb/
  extension/
    manifest.json
    background.js
    content/
      hello.js            # Phase 0 placeholder
      fanduel.js          # Phase 3
      betmgm.js           # Phase 1
      bet365.js           # Phase 7 (deferred)
    lib/
      books.js            # dynamic registry of books (Phase 0)
      markets.js          # approved sports + markets list (Phase 0)
      markets.test.js     # Phase 4
      arb.js              # arb detection + stake math (Phase 4)
      arb.test.js
      normalize.js        # team-name canonicalization (Phase 3)
      normalize.test.js
      risk.js             # risk scoring per RISK_SCORING.md (Phase 6)
      risk.test.js
    sidepanel/
      sidepanel.html      # Phase 0 placeholder; live UI from Phase 5
      sidepanel.js
      sidepanel.css
    test/
      fixtures/           # captured DOM snapshots per book
    README.md
    PLAN.md
    RISK_SCORING.md       # contract for risk evaluation
    CHANGELOG.md          # added in Phase 0
  local-bridge/           # Phase 6; sibling of extension/, not part of it
    server.js
    package.json
```

---

## Resolved decisions (locked at build start)

1. **First two books:** BetMGM + FanDuel. Bet365 → Phase 7.
2. **First sport:** NHL.
3. **UI surface:** side panel (Chrome 114+). No native notifications. No popup.
4. **Books config:** dynamic registry in `lib/books.js`. Add a book = registry entry + matching `host_permissions` in manifest + per-book content script with that book's selectors.
5. **Bankroll/balance:** dynamic per book, derived from `../tracker/events.jsonl` by the Phase 6 bridge. No hardcoded amounts anywhere.
6. **Multi-tab strategy:** one tab per (book × sport), opened by the Phase 9 "Open scan window" helper into a separate Chrome window the user minimizes. No URL-cycling within a tab.

---

## Known unknowns (will surface during build, not before)

- **Actual selector stability per book.** Estimate: BetMGM moderate, FanDuel moderate, Bet365 hostile. We'll know when we open DevTools.
- **DOM hydration timing.** Some books render odds inside React/Angular components that take 1–3s after page load. Polling intervals may need tuning per book.
- **Anti-bot measures inside the page.** Even though we're a real browser, some sites run JS that probes for extension activity. Unlikely to break scraping but worth flagging.
- **iGaming Ontario regulatory changes.** New iGO rules could change what's visible on logged-out pages. Periodically re-verify per [`../tracker/RULES_VERIFICATION_PROMPT.md`](../tracker/RULES_VERIFICATION_PROMPT.md).
- **CLV history bootstrap.** The CLV factors require some settled bets with `closing_odds` populated before they fire. Until enough history exists, CLV is silent — that's fine; the *other* hard blocks (market filter, account age, recreational history) protect against early-bet damage.
- **Closing-odds time-series storage size.** A tab observing every NHL game over a season could accumulate large odds histories in `chrome.storage.local`. Phase 9's TTL strategy (7-day drop) keeps this bounded.

These don't block the plan — they get addressed as encountered.
