# Risk Scoring

How the extension decides whether (and how) to recommend an arb it finds.

The scanner doesn't just find arbs — it evaluates each candidate against the rules in [`../tracker/rules.md`](../tracker/rules.md) and the bet history in [`../tracker/events.jsonl`](../tracker/events.jsonl), then surfaces a **verdict per book pairing** so the user has a one-glance answer to "should I place this?"

The factor list below was recalibrated 2026-04-26 based on detection-vendor research — see [`../tracker/DETECTION_RESEARCH.md`](../tracker/DETECTION_RESEARCH.md) for the full evidence trail.

---

## Goal

For every arb the scanner detects, output:

- A **risk score** per candidate book pairing (0.0 = safest, 1.0 = highest)
- A **verdict**: `GO`, `WAIT`, or `SKIP`
- A **reasoning trace**: one line per factor contributing to the score, so the user can sanity-check before placing

---

## Inputs

1. **The candidate arb** (from the scanner): event, market, both legs (book / side / odds / proposed stake), opening odds (for CLV)
2. **Rules** (parsed from `../tracker/rules.md` "Quantitative thresholds" section)
3. **Event history** (replayed from `../tracker/events.jsonl`)

---

## Per-book derived state (from event replay)

For each book in the candidate arb, the bridge computes:

| Field | How |
|---|---|
| `current_balance` | sum(deposits) + sum(payouts on this book) − sum(stakes on this book) − sum(withdrawals) |
| `total_pnl` | current_balance − sum(deposits) + sum(withdrawals) |
| `recent_avg_stake` | mean stake over the last 20 placed bets on this book |
| `recent_max_stake` | max stake over the last 20 placed bets on this book |
| `bets_last_7d` | count of `bet_placed` events in past 7 days on this book |
| `last_bet_at` | timestamp of last `bet_placed` |
| `last_deposit_at` | timestamp of last `deposit` |
| `last_withdrawal_at` | timestamp of last `withdrawal` |
| `account_age_days` | days since first event for this book |
| `non_arb_bets_count` | count of `bet_placed` events flagged as recreational on this book |
| `pairings_last_30d` | counter `{(book_a, book_b): count}` over `arb_id`s in the past 30 days |
| `recent_clv_avg` | mean CLV over the last 20 settled bets (closing-odds − placed-odds, normalized) |
| `recent_cashouts_count` | count of `bet_cashed_out` events on this book in the last 30 days |
| `status` | from most recent `account_status_change` (default: `active`) |

These come from replaying `events.jsonl` from the start. No state file to keep in sync.

---

## Risk factors

Each factor adds to the pairing's risk score. Final score = (sum of all triggered factors) × per-book multiplier, capped at 1.0. Each factor cites the rule it derives from.

### Hard blocks (force SKIP)

| Factor | Trigger | Score | Rule reference |
|---|---|---|---|
| **Account not active** | `status` ≠ `active` | **+1.00 (forces SKIP)** | hard block |
| **Stake exceeds float cap** | proposed_stake > `MAX_STAKE_PCT_OF_FLOAT` × current_balance | **+0.40 (forces SKIP)** | `MAX_STAKE_PCT_OF_FLOAT` |
| **Account too new** | account_age_days < `MIN_ACCOUNT_AGE_DAYS` | **+1.00 (forces SKIP)** | `MIN_ACCOUNT_AGE_DAYS` |
| **Insufficient recreational history** | non_arb_bets_count < `MIN_NON_ARB_BETS_BEFORE_ARBING` | **+1.00 (forces SKIP)** | `MIN_NON_ARB_BETS_BEFORE_ARBING` |
| **Non-major market** | event market is not in the major-leagues / mainline set | **+1.00 (forces SKIP)** | "Market selection rules" |
| **VPN or non-Ontario location detected** | bridge reports VPN/proxy/non-ON IP | **+1.00 (forces SKIP)** | "Never use a VPN" |

### Behavioural risk (signal-driven, not hard blocks)

| Factor | Trigger | Score | Rule reference |
|---|---|---|---|
| **High recent CLV** | recent_clv_avg > +1.5% | +0.30 | "Persistent positive CLV is the strongest single signal" |
| **Moderate recent CLV** | recent_clv_avg > +0.5% | +0.15 | same |
| **Stake spike (severe)** | proposed_stake > 2× recent_avg_stake | +0.25 | "No sudden spikes on any account" |
| **Stake spike (mild)** | proposed_stake > 1.5× recent_avg_stake | +0.10 | "Gradual scaling" |
| **Stake not rounded** | proposed_stake mod `STAKE_ROUNDING_CAD` ≠ 0 | +0.20 | `STAKE_ROUNDING_CAD` |
| **Recent deposit-withdraw cycle** | last_deposit_at within `MIN_DAYS_BETWEEN_DEPOSIT_AND_WITHDRAWAL` of any withdrawal on this book | +0.30 | "Don't withdraw soon after depositing" |
| **Post-withdrawal heat window** | last_withdrawal_at within `POST_WITHDRAWAL_HEAT_DAYS` | +0.20 | "A withdrawal triggers human review" |
| **Repeated pairing** | this `(book_a, book_b)` has been > 30% of arbs in last 30d | +0.15 | "Rotate book pairings" |
| **Outcome risk: winning** | total_pnl > 30% × sum(deposits on this book) | +0.10 | "Books ban CLV-positive accounts" |
| **Outcome risk: winning a lot** | total_pnl > 70% × sum(deposits on this book) | +0.20 | same |
| **High frequency** | bets_last_7d > `MAX_BETS_PER_BOOK_PER_WEEK` on this book | +0.15 | "Vary timing" |
| **Frequent cash-outs** | recent_cashouts_count > 2 in last 30d | +0.15 | "Don't use cash-out as a tactic" |

### Per-book multiplier

After summing the factors above, multiply by the book's risk multiplier from `rules.md`:

| Book | Multiplier |
|---|---|
| `Bet365` | `1.10` |
| `FanDuel` | `0.95` |
| `BetMGM` | `1.00` |
| `DraftKings` | `1.00` |
| `theScore Bet` | `1.00` |
| `Proline+` | `0.95` |

Final score for a leg = clamp(sum(factors) × per_book_multiplier, 0.0, 1.0).
Final score for the pairing = max(leg_a_score, leg_b_score).

---

## Verdict thresholds

| Risk score | Verdict |
|---|---|
| 0.00 – 0.30 | `GO` — proceed |
| 0.30 – 0.60 | `WAIT` — concerns flagged; user decides |
| 0.60 – 1.00 | `SKIP` — too risky, don't place |
| Any "forces SKIP" factor | `SKIP` regardless of score |

---

## Output shape

```json
{
  "arb_id": "arb-2026-04-26-001",
  "event": "NHL TOR vs BOS",
  "market": "moneyline",
  "detected_at": "2026-04-26T15:30:00-04:00",
  "expected_profit": 4.20,
  "expected_roi_pct": 2.1,
  "pairings": [
    {
      "legs": [
        { "book": "FanDuel", "side": "TOR ML", "odds": 2.50, "stake": 50 },
        { "book": "BetMGM",  "side": "BOS ML", "odds": 1.65, "stake": 80 }
      ],
      "risk_score": 0.10,
      "verdict": "GO",
      "reasoning": [
        "FanDuel: balance $360, stake $50 = 14% of float (within 20% cap)",
        "FanDuel: account age 142d, 18 recreational bets — well past warmup",
        "FanDuel: market = NHL moneyline (major)",
        "BetMGM: balance $620, stake $80 = 13% of float",
        "BetMGM: recent CLV avg +0.3% (low)",
        "FanDuel pnl -$40 (low outcome risk); BetMGM pnl +$120 (low outcome risk)",
        "FanDuel-BetMGM pairing used 2/8 of last-30d arbs (within rotation guidance)",
        "Per-book multipliers: FanDuel 0.95, BetMGM 1.00 → final 0.10"
      ]
    },
    {
      "legs": [
        { "book": "Bet365", "side": "TOR ML", "odds": 2.45, "stake": 50 },
        { "book": "FanDuel","side": "BOS ML", "odds": 1.70, "stake": 75 }
      ],
      "risk_score": 1.00,
      "verdict": "SKIP",
      "reasoning": [
        "Bet365: account age 12d (< MIN_ACCOUNT_AGE_DAYS = 30) → SKIP override",
        "Bet365: deposit 5 days ago — within 14-day deposit/withdrawal window",
        "Bet365: stake $50 = 25% of $200 float (exceeds 20% cap) → SKIP override"
      ]
    }
  ],
  "recommended_pairing": 0
}
```

When the recommended pairing is `null` (only candidate is `WAIT`/`SKIP`), the notification still fires but highlights the verdict instead of stake instructions — so the user is aware the arb exists and why it's not actionable.

---

## Where this lives in code

- [`extension/lib/risk.js`](./lib/risk.js) — pure scoring function, no browser dependencies, fully unit-tested in `risk.test.js`
- `local-bridge/server.js` (Phase 6 in [`PLAN.md`](./PLAN.md)) — exposes per-book derived state via `GET /state`, including `account_age_days`, `non_arb_bets_count`, `recent_clv_avg`, `recent_cashouts_count`
- `extension/background.js` — calls the bridge, runs `risk.js` on every detected arb

`risk.js` is pure-JS (no I/O, no DOM) so it can be exercised against synthetic events and rules in tests without standing up the extension.

---

## Updating the scoring

The factor weights above are the **2026-04-26 calibration** based on detection-vendor research. Expect to tune them as we observe real outcomes (e.g., did the model say `GO` on a bet that later got the account limited? raise the relevant factor's weight).

When updating:

1. Edit this doc first (it's the source of truth).
2. Edit `risk.js` to match.
3. Add a test case in `risk.test.js` demonstrating the new behaviour.
4. If the threshold change is driven by a new finding, also update [`../tracker/DETECTION_RESEARCH.md`](../tracker/DETECTION_RESEARCH.md) so the reasoning is preserved.

The numeric thresholds in `../tracker/rules.md` are referenced by name from this doc; if those thresholds change, the rules doc is updated and `risk.js` re-reads them on each evaluation rather than hard-coding values.
