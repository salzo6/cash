# Sportsbook Arbitrage

Phase 1 of the cash project (see [`../ROADMAP.md`](../ROADMAP.md)): place opposing bets on the same event across multiple Ontario sportsbooks at prices that lock in profit regardless of outcome.

---

## Two pillars

This strategy has two halves, each in its own subfolder:

### `tracker/` — discipline & logging

Rules of how we bet (to avoid getting limited or banned) and the append-only log of every bet, deposit, and withdrawal. Single source of truth for our betting behaviour over time.

- [`tracker/rules.md`](./tracker/rules.md) — the rulebook (detection mechanics, account / sizing / behaviour / withdrawal / market-selection rules, numeric thresholds, per-book multipliers)
- [`tracker/DETECTION_RESEARCH.md`](./tracker/DETECTION_RESEARCH.md) — long-form evidence behind every claim in `rules.md`; per-claim verdicts and ~40 cited sources
- [`tracker/events.jsonl`](./tracker/events.jsonl) — append-only event log
- [`tracker/README.md`](./tracker/README.md) — schema docs & workflow
- [`tracker/RULES_VERIFICATION_PROMPT.md`](./tracker/RULES_VERIFICATION_PROMPT.md) — prompt to re-fact-check `rules.md` in a fresh chat (~6-month cadence)

### `extension/` — finding arbs

Chrome extension that runs in your real browser, reads odds from open Ontario sportsbook tabs, and alerts when an arb exists. Sidesteps bot detection by being the user, not impersonating one.

- [`extension/README.md`](./extension/README.md) — what it is, install, usage
- [`extension/PLAN.md`](./extension/PLAN.md) — phased implementation plan
- [`extension/RISK_SCORING.md`](./extension/RISK_SCORING.md) — how the extension evaluates each arb against the rules + log to produce a `GO` / `WAIT` / `SKIP` verdict
- *(code added as phases ship)*

---

## How the two halves fit together

```
[browser tabs]  →  extension/  →  notification: "arb found, bet $X here, $Y there"
                                              ↓
                                  [user places both bets, per rules.md]
                                              ↓
                                  [user describes action in chat]
                                              ↓
                                  Claude appends events to tracker/events.jsonl
```

Eventually the extension will read `tracker/events.jsonl` to compute per-book risk scores and route arb recommendations toward safer (loss-side) books — see `extension/PLAN.md` Phase 8.

---

## Status

| Pillar | Status |
|---|---|
| Tracker | ✅ Schema + rulebook in place; ready to log events |
| Extension | ⏳ Not built — see [`extension/PLAN.md`](./extension/PLAN.md) |
