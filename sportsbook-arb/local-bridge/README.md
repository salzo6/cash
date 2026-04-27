# Local Bridge

Read-only HTTP bridge between [`../tracker/events.jsonl`](../tracker/events.jsonl) + [`../tracker/rules.md`](../tracker/rules.md) and the arb-scanner Chrome extension. Implements Phase 6 of [`../extension/PLAN.md`](../extension/PLAN.md) — the per-book derived state that [`../extension/lib/risk.js`](../extension/lib/risk.js) needs to score arbs against the rulebook.

The contract this bridge satisfies is documented in [`../extension/RISK_SCORING.md`](../extension/RISK_SCORING.md).

---

## Why a separate process

The 6 hard-SKIP factors and the 12 behavioural-risk factors all derive from event history (`events.jsonl`) and configurable thresholds (`rules.md`). A Chrome extension service worker has no filesystem access. The bridge is the smallest possible thing that hands those files to the extension over HTTP.

It is **read-only by design.** The extension never writes to `events.jsonl` — events are still appended by Claude in chat per [`../tracker/README.md`](../tracker/README.md). Keeping write authority in chat preserves the discipline workflow.

---

## Run it

```bash
node sportsbook-arb/local-bridge/server.js
```

Or, if you have `bun` installed, `bun run server.js` works identically — there are no framework dependencies, only Node/Bun stdlib.

Default port is **5731**. Override with `BRIDGE_PORT=NNNN node server.js`. The extension hardcodes `127.0.0.1:5731` in `background.js`; if you change the port, update both.

When the bridge isn't running, the extension falls back to a "Bridge offline" banner + every arb gets verdict `WAIT` per the Phase 6 contract — you'll still see the arb, you just won't get the hard-block evaluation.

---

## What it returns

`GET /state` — single endpoint. Re-reads `events.jsonl` and `rules.md` on every request (no caching), so threshold edits in `rules.md` and new event logs both take effect immediately.

```json
{
  "ok": true,
  "bridge_version": 1,
  "thresholds": { "MIN_ACCOUNT_AGE_DAYS": 30, "MAX_STAKE_PCT_OF_FLOAT": 0.20, ... },
  "multipliers": { "BetMGM": 1.00, "FanDuel": 0.95, "Bet365": 1.10, ... },
  "books": {
    "BetMGM": {
      "current_balance": 100,
      "deposits_total": 100, "withdrawals_total": 0, "total_pnl": 0,
      "recent_avg_stake": 0, "recent_max_stake": 0,
      "bets_last_7d": 0,
      "last_bet_at": null, "last_deposit_at": "2026-04-26T14:00:00-04:00", "last_withdrawal_at": null,
      "account_age_days": 0,
      "non_arb_bets_count": 0,
      "recent_clv_avg": null,
      "recent_cashouts_count": 0,
      "status": "active",
      "bets_total": 0, "settled_with_clv": 0
    }
  },
  "pairings_last_30d": { "BetMGM__FanDuel": 3 },
  "event_count": 2,
  "generated_at_iso": "2026-04-26T18:30:00.000Z",
  "vpn_check": "unverified"
}
```

`GET /` and `GET /health` return a tiny ok payload — useful for quickly confirming the bridge is up.

---

## How fields are derived

Replays every event in order, then summarizes per book. Detailed mapping in [`state.js`](./state.js); contract in [`../extension/RISK_SCORING.md`](../extension/RISK_SCORING.md). Highlights:

- `current_balance` = deposits + payouts (settled bets + cashouts) − stakes − withdrawals
- `account_age_days` = days since the **first** event for this book (any event type — `account_open` or first deposit)
- `non_arb_bets_count` = count of `bet_placed` with `is_arb: false` (drives the recreational-warmup hard block)
- `recent_clv_avg` = mean of `(closing_odds − placed_odds) / placed_odds` over the last 20 settled bets that have `closing_odds` populated. `null` until enough history accumulates — that's expected during the early ramp; the CLV factor stays silent and other factors carry the verdict.
- `recent_cashouts_count` = `bet_cashed_out` events in the last 30 days
- `status` = most recent `account_status_change.status`, default `'active'`
- `pairings_last_30d` = global counter `{ "BookA__BookB": n }` keyed by sorted book pair, counted once per `arb_id` whose latest leg fell in the last 30 days

`vpn_check: 'unverified'` is structural — see "VPN limitation" below.

---

## VPN limitation (factor 6)

Per [`../extension/RISK_SCORING.md`](../extension/RISK_SCORING.md), the VPN/proxy/non-Ontario hard-block is the **highest-confidence single ban signal** in the rulebook. A localhost server cannot reliably detect VPN/proxy use — every option (third-party IP-geolocation API, browser permission tricks) was rejected for v1. The bridge reports `vpn_check: 'unverified'` and the side panel surfaces a "VPN check unverified — relying on user discipline" indicator.

This is documented in `RISK_SCORING.md`'s "Where this lives in code" section. Future work: a content script could fetch a known geo-aware endpoint from inside the user's actual browser session and report the result back to the bridge.

---

## Tests

```bash
node state.test.js
```

Synthetic event lists exercise every derived field plus `parseRules`. State derivation is pure (no I/O), so the tests don't need the HTTP layer.

---

## File layout

```
local-bridge/
  server.js        # http stdlib + JSON I/O. No framework. ~80 lines.
  state.js         # parseEvents + parseRules + deriveState. Pure functions.
  state.test.js    # synthetic-event coverage of every derived field.
  package.json     # type: module + scripts. No dependencies.
  README.md        # this file.
```

The bridge intentionally has zero runtime dependencies — Node/Bun stdlib only. Anything else has to be justified against "what does this give us that `http` + `fs/promises` doesn't?"
