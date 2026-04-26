# Tracker

Personal log of every betting-related action. Two purposes:
1. **Discipline** — keep behaviour aligned with `rules.md`.
2. **Risk scoring** — future arb-finder code reads this log to decide which book to use for the next play.

---

## Workflow

You describe what you did in chat. Claude appends events to `events.jsonl`. You do **not** edit `events.jsonl` by hand — describe the action and Claude logs it, so the format stays consistent and machine-parseable.

**Examples:**

> "I just deposited $200 into FanDuel via Interac and $200 into Bet365 via Visa debit."

→ Two `deposit` events appended.

> "Bet $50 on Jets ML at 2.50 on FanDuel and $80 on Maple Leafs ML at 1.65 on Bet365 — same game arb."

→ Two `bet_placed` events appended, both sharing an `arb_id`.

> "Jets won. FanDuel paid out $125, Bet365 leg lost."

→ Two `bet_settled` events appended.

---

## File layout

- `rules.md` — operating rulebook (numeric thresholds at the bottom; code references those)
- `DETECTION_RESEARCH.md` — long-form evidence behind every claim in `rules.md`. Re-run every ~6 months.
- `RULES_VERIFICATION_PROMPT.md` — the prompt to use when re-fact-checking the rulebook against current public information.
- `events.jsonl` — append-only event log, one JSON object per line
- `README.md` — this file

---

## Event schema

Every event has these common fields:

- `timestamp` — ISO 8601 with timezone, e.g. `"2026-04-26T15:30:00-04:00"`
- `type` — one of the types below

All monetary amounts are in **CAD** (numbers, not strings).

### `account_open`
- `book` (string) — e.g. `"FanDuel"`, `"Bet365"`
- `kyc_notes` (string, optional)

### `deposit`
- `book` (string)
- `amount` (number, CAD)
- `method` (string) — e.g. `"Interac e-Transfer"`, `"Visa debit"`

### `withdrawal`
- `book` (string)
- `amount` (number, CAD)
- `method` (string)

### `bet_placed`
- `bet_id` (string) — unique, format `"bet-YYYY-MM-DD-NNN"`
- `book` (string)
- `sport` (string) — e.g. `"NHL"`, `"NBA"`
- `event` (string) — e.g. `"Jets vs Maple Leafs 2026-04-27"`
- `market` (string) — e.g. `"moneyline"`, `"spread"`, `"total"`
- `side` (string) — e.g. `"Jets ML"`, `"Over 5.5"`
- `odds` (number) — decimal odds at time of placement, e.g. `2.50`
- `stake` (number, CAD)
- `is_arb` (boolean) — `true` if part of an arb, `false` if recreational/cover. Drives `non_arb_bets_count` and warmup checks in scoring.
- `arb_id` (string, optional) — shared across legs of the same arb (only when `is_arb` is `true`)
- `notes` (string, optional) — e.g. `"Recreational cover bet"`

### `bet_settled`
- `bet_id` (string) — references the `bet_placed` event
- `result` (string) — `"win"` | `"loss"` | `"push"` | `"void"`
- `payout` (number, CAD) — total returned to balance (stake + winnings on a win; 0 on a loss; stake on push/void)
- `closing_odds` (number, optional) — decimal odds at market close on the same side. Used to compute Closing Line Value (CLV) for the scorer. Skip if unavailable.

### `bet_cashed_out`
- `bet_id` (string) — references the `bet_placed` event
- `cashout_amount` (number, CAD) — what the book paid to close the position
- `notes` (string, optional)

Cash-outs are tracked separately so the scorer can flag frequent cash-out behaviour as an arber signature.

### `account_status_change`
- `book` (string)
- `status` (string) — `"active"` | `"limited"` | `"banned"` | `"closed"`
- `evidence` (string) — e.g. `"Max bet capped at $20"`, `"Account closed via email"`

### `balance_audit`
- `book` (string)
- `balance` (number, CAD) — actual balance read from the book's app/site
- `notes` (string, optional)

Log this whenever you check a book's balance. Catches drift between log and reality.

### `note`
- `subject` (string, optional) — book name or general topic
- `text` (string)

Free-form observations that don't fit the structured types — promo received, ID verification request, customer service interaction.

---

## ID conventions

- `bet_id`: `"bet-YYYY-MM-DD-NNN"` — NNN is a daily sequence (001, 002, …)
- `arb_id`: `"arb-YYYY-MM-DD-NNN"` — shared by all legs of a single arb pair

---

## Derived state

Account balances, P&L, bet frequency, and average stakes are **derived** by replaying `events.jsonl` from the beginning. There is no separate state file to keep in sync — the log is the single source of truth.
