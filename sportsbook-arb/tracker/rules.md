# Arbitrage Betting Rulebook

*Operating principles for sustainable arbitrage betting on Ontario-regulated sportsbooks. The goal: keep accounts off the limit list long enough to compound the bankroll into something material.*

> **Last verified:** 2026-04-26 — fact-checked against detection-vendor publications, AGCO standards, ROGA filings, and arber/matched-betting practitioner forums. See [`DETECTION_RESEARCH.md`](./DETECTION_RESEARCH.md) for per-claim evidence and citations.
>
> **Re-verify every ~6 months, or immediately if an account gets unexpectedly limited.** Sportsbook detection methods evolve; outdated assumptions are worse than no assumptions.

---

## Detection mechanics — why these rules exist

Every rule below traces back to one of these mechanisms. If a claim here turns out to be wrong on re-verification, the corresponding rule should be re-evaluated. Full evidence in [`DETECTION_RESEARCH.md`](./DETECTION_RESEARCH.md).

### How sportsbooks track players

Detection is multi-layered. No single signal triggers a ban — risk scores accumulate across signals, with one signal (CLV, below) far more predictive than the rest.

- **KYC identity** — real name, government ID, photo collected at signup. Ties activity to a real person across logins, devices, and payment methods.
- **IP address and geolocation** — Ontario IP required by iGO regulators. Vendors like GeoComply layer GPS, Wi-Fi, cell-tower, browser API, and device metadata, plus VPN/proxy detection. **Never use a VPN.** It voids all KYC trust at once and is the highest-confidence single flag in the system.
- **Device fingerprinting** — browser/hardware characteristics, plus **behavioural biometrics: mouse movement and typing cadence.** Persists across cookie clears and sometimes across devices. This is why stake input must be done by hand — extension auto-fill leaves a fingerprint anomaly.
- **Behavioural profiling** — automated, continuous scoring (think 0–100 per account). Books build a model of "normal recreational bettor" and accumulate deviation scores per bet.
- **Bet timing analysis (Closing Line Value, "CLV")** — bets placed shortly *before* odds move are the cleanest mathematical tell of an edge. **This is the primary signal**, not one of five equal ones. ESPN: *"Beating closing lines is what gets you banned, rather than simply winning."* Arbitrage strategy structurally generates CLV — there is no way to arb without it.

### What raises flags

The flags below are cumulative — one occasional flag is fine; a persistent pattern of flags drives the risk score up.

| Flag | What's behind it |
|---|---|
| **Persistent positive CLV** | Beating the closing line repeatedly. The strongest single signal. |
| **Stake anomalies** | Non-round numbers ($73.42 from arb calculators), sudden spikes from your own historical average |
| **Soft / niche markets** | Bets on third-tier soccer, obscure props, or low-liquidity markets cluster arbers. Major-league moneylines/spreads/totals are far safer cover. |
| **Frequent deposit-withdrawal cycles** | Pattern matches both arbers *and* money-laundering compliance models — double red flag |
| **Always winning** | More precisely: persistent positive CLV. Recreational bettors lose over time. |
| **Always-same-pairing** | Always FanDuel vs Bet365 across many arbs is a detectable cross-event pattern |
| **Frequent cash-outs** | Professional arbers cash out to exit when both legs become uneconomic. Treated as an arber signature by detection vendors. |
| **VPN / proxy / location spoofing** | Highest-confidence single flag. GeoComply runs hundreds of checks per transaction. |

### Detection cadence and review

- **Continuous and automated for scoring.** Software scores every bet in real time.
- **Withdrawals trigger human review.** Practitioner consensus: *"every payout request results in someone manually looking at your account."* Eyeballs land on the account in the days after a withdrawal — keep behaviour clean during that window.
- **Cross-book data sharing exists, scoped to "responsible gaming" — but assume scope creep.** The Responsible Online Gaming Association (ROGA) — members include FanDuel, BetMGM, Bet365, DraftKings, Penn (theScore Bet), Fanatics, Hard Rock Bet — runs a LexisNexis-administered clearinghouse (live since September 2025). Officially scoped to problem-gambling self-exclusion. Critics note Bet365 specifically has a documented history of using "problem gambling" as cover for sharp-bettor exclusions. **Treat ROGA-member books as having shared risk infrastructure.** Proline+ (OLG-operated) is the only Ontario-relevant book *not* in ROGA — that's why it stays in the rotation.
- **Same vendors serve every book.** GeoComply, LexisNexis, Sumsub, Sift. Even without a formal arber list, identical detection rulesets get applied across books in parallel.

### What happens when caught

The typical sequence is **limit, then sometimes ban** — but it varies materially by book.

| Book | Typical response | Notes |
|---|---|---|
| **FanDuel** | Limit to ~$100 max | Softest of the majors. Tolerates sharps more than most. |
| **BetMGM** | Limit to $10–$50 max | Baseline. |
| **DraftKings** | Limit to $10–$50 max | Aggressive on parlays/props specifically. |
| **theScore Bet** | Limit to $10–$50 max | Less data; assume baseline. |
| **Bet365** | Often outright closure | Documented track record of full closures, sometimes dressed as RG. UK-style soft-book aggression. |
| **Proline+** | Limits driven by withdrawal-verification friction more than arber detection | OLG bureaucracy; bans rare but withdrawals slow. |

**Funds:** Regulated Ontario books are legally required by AGCO Standard 7 + Standard 8 to return your funds when an account is closed, after KYC verification. Withdrawals must go to "an account of which the player is a legal holder." This is a real protection, not a hope.

**Why "no reason" closures happen anyway** — a closure can be triggered by AML signals, multi-account links from your household (shared IP/device/payment with someone else), self-exclusion contagion, payment-history flags from cross-industry vendors, or a book using "responsible gambling" as a label for what's really a sharp-bettor exclusion. Books are not required to disclose the reason. This rulebook covers the arber-detection axis; it cannot cover risks that come from people in your household or your card history.

### Reference numbers (for sizing expectations)

| Metric | Reported range | Notes |
|---|---|---|
| Average arb margin | 1–4% per play | Top-tier (10%+) opportunities are rare and short-lived. |
| Realistic plays per week (manual placement) | 5–15 | More than this on a single book is a flag. |
| Account lifespan with no defenses (single book) | 1–6 months | Some report days. |
| Account lifespan with full defenses (5+ books) | Median: many months. 12+ months: ~30–50% per book. 24+ months: ~10–20% per book. | "Years across the board" is the long tail, not the planning assumption. |
| Reported monthly returns by experienced arbers | 10–30% of betting bankroll | 30% is unsustainable once limits land. Plan around 5–15% steady-state. |

---

## The two-axis risk model

Every account carries two independent risks. **Both must stay low.**

| Axis | What it means | Lowered by |
|---|---|---|
| **Outcome risk** | How much we're winning on this book — and especially how much CLV we've accumulated. Books ban CLV-positive accounts. | Losing or breaking even on this book; placing bets that don't beat the closing line |
| **Behaviour risk** | How unnatural our patterns look. Books flag anomalies. | Round stakes, consistent sizing, varied timing, mixed pairings, major-league markets, recreational bets |

A losing account is **not** automatically safe — if it suddenly gets a perfectly-sized bet at a suspicious time on a niche market, it still flags. Loss provides outcome cover, not behaviour cover.

---

## Account & float rules

- **Target:** 5–8 active sportsbook accounts long-term. Start with 2–3 and add over time.
- **Float per book:** at least $200; ideally $300–500 to make stakes meaningful.
- **Money never moves between books.** Each book's float lives there permanently.
- **Don't re-deposit on a book** unless opening it for the first time, or after a true wipeout (rare — only from calculation errors or voided bets).
- **Withdrawals:** infrequent, in clean amounts, only after a balance has grown materially. Space them months apart per book.
- **Same Interac email is fine across books.** AGCO + AML enforce deposit-method = withdrawal-method matching, so all books need the same banking source. This is unavoidable in Canada and is normal recreational behaviour. Do **not** also reuse usernames, passwords, or display names — that's a fingerprint linkage that's avoidable.

---

## Account aging rules

New accounts are the highest-risk, lowest-trust state. Don't arb on them.

- **Don't place an arb on an account younger than `MIN_ACCOUNT_AGE_DAYS` days.**
- **Place at least `MIN_NON_ARB_BETS_BEFORE_ARBING` recreational-looking bets** — small, varied, on major leagues — before the first arb on a new account.
- First deposit should be small ($100–$200). Top up to working float only after the account has aged.

---

## Market selection rules

The fastest path to a limit is betting soft props or obscure leagues. Major-league liquid markets are the cover.

- **Stick to major leagues.** NHL, NBA, MLB, NFL, top-tier soccer (Premier League, La Liga, Serie A, Bundesliga, Champions League), top-tier tennis (ATP/WTA main tour).
- **Stick to mainline markets.** Moneyline, spread, totals. Player props and exotic markets cluster arbers and are tracked specifically.
- **No third-tier soccer, no minor-league anything, no esports unless mainstream.**
- **Live (in-play) over pre-game where the arb supports it.** Books have less time to compare live bets to closing lines, so live betting extends account life. Don't force it if execution risk eats the margin.

---

## Bet sizing rules

- **Max stake per bet:** 10–20% of that book's current float.
- **Round all stakes to clean numbers.** $50, $75, $100 — never $73.42. Arb calculators produce ugly numbers; round and absorb the small margin loss.
- **Proportional growth across books.** As floats grow, stakes grow on *all* books at similar rates. Asymmetric growth (FanDuel doubling, Bet365 flat) creates a profile mismatch if anyone cross-references.
- **Gradual scaling.** ~10–20% growth in average stake per month is natural. Doubling in 6 weeks is suspicious.

---

## Behaviour rules

- **Rotate book pairings.** Don't always pair FanDuel-vs-Bet365 — mix which book holds which leg of an arb.
- **Mix in recreational bets.** Occasional small bets you're happy to lose, ideally on the books you arb on. Treat as marginal cover, not a free pass — practitioner consensus is mixed on how much mug bets actually help.
- **Vary timing.** Don't only bet at the same time of day, or only right after odds move (classic arber tell).
- **No same-stake clones across books.** Even on different events, repeating $87.50 across multiple books is a tell.
- **Don't use cash-out as a tactic.** Frequent cash-outs are an arber signature. Cash out only occasionally on positions that look like recreational decisions.
- **Manual stake input only.** Do not auto-fill stake fields from the extension — behavioural biometrics catch this. The extension recommends; you type.

---

## Withdrawal rules

- **Don't withdraw soon after depositing** — that's a money-laundering flag, not just an arber flag. Minimum `MIN_DAYS_BETWEEN_DEPOSIT_AND_WITHDRAWAL` days.
- **Withdraw to the same method you deposited from.** AGCO + AML enforce this; mismatched methods can hold withdrawals.
- Let floats grow organically from winnings.
- When a balance is roughly 2–3× its starting float, withdraw a clean portion ($500, $1000) — not all of it.
- Withdraw infrequently and in normal-looking amounts.
- **A withdrawal triggers human review.** Don't place sharp-looking bets in the `POST_WITHDRAWAL_HEAT_DAYS` window after a withdrawal. This is when eyeballs are on the account.

---

## VPN / location rules

- **Never use a VPN, proxy, or location spoofer on any sportsbook account.**
- **Never log in from outside Ontario.** If you travel, don't open the app — even a single out-of-jurisdiction session can void location trust.
- **Don't share devices or IPs with other gamblers in your household.** Shared device/IP fingerprints with another account can trigger multi-account closures even if both are legitimate.

---

## Routing rule for high-volume weeks

When there are more arbs than account capacity comfortably handles:
- Push the *extra* bets through accounts with **lower outcome risk** (accounts where we're already down or breakeven *and* CLV-neutral).
- But keep sizing consistent with that account's history. A loss-account with a sudden $400 bet is still a flag.
- Loss provides outcome cover only — never behaviour cover.

---

## What NOT to do

- Use a VPN, proxy, or any location spoofer
- Bet from outside Ontario
- Auto-fill stake fields via extension (manual entry only)
- Bet on niche / soft / third-tier markets
- Use the cash-out feature as a tactic
- Move money frantically between books
- Use exact stakes from an arb calculator (e.g. $73.42)
- Spike bet size suddenly on any account
- Always pair the same two books
- Withdraw shortly after depositing
- Place sharp bets in the days after a withdrawal
- Treat losing accounts as a free pass for risky bets
- Reuse usernames, passwords, or display names across books

---

## Quantitative thresholds

These are the source of truth for the risk scorer. Update them here, not in code.

| Constant | Value | Meaning |
|---|---|---|
| `MIN_FLOAT_PER_BOOK_CAD` | `200` | Minimum float to keep on any active book |
| `MAX_STAKE_PCT_OF_FLOAT` | `0.20` | Cap a single stake at 20% of that book's current float |
| `MAX_MONTHLY_AVG_STAKE_GROWTH` | `0.20` | Average stake should grow ≤ 20% month-over-month |
| `MIN_BOOKS_TARGET` | `5` | Aim for at least 5 active books before scaling stakes |
| `STAKE_ROUNDING_CAD` | `5` | Round all stakes to the nearest $5 |
| `WITHDRAWAL_BALANCE_TRIGGER_MULTIPLIER` | `2.5` | Consider withdrawing only after balance ≥ 2.5× starting float |
| `MIN_DAYS_BETWEEN_DEPOSIT_AND_WITHDRAWAL` | `14` | No withdrawal within 14 days of a deposit on the same book |
| `MIN_ACCOUNT_AGE_DAYS` | `30` | No arbs on an account younger than 30 days |
| `MIN_NON_ARB_BETS_BEFORE_ARBING` | `5` | Place at least 5 recreational bets on a new account before any arb |
| `POST_WITHDRAWAL_HEAT_DAYS` | `10` | Avoid sharp-looking bets for 10 days after any withdrawal on a book |
| `MAX_BETS_PER_BOOK_PER_WEEK` | `12` | High-frequency floor; above this on any single book is a flag |

### Per-book risk multipliers

Applied to the final risk score for a candidate pairing.

| Book | Multiplier |
|---|---|
| `Bet365` | `1.10` |
| `FanDuel` | `0.95` |
| `BetMGM` | `1.00` |
| `DraftKings` | `1.00` |
| `theScore Bet` | `1.00` |
| `Proline+` | `0.95` |

---

*This is a living document. Update as new patterns emerge or as books change behaviour. Re-run [`RULES_VERIFICATION_PROMPT.md`](./RULES_VERIFICATION_PROMPT.md) every ~6 months to re-fact-check.*
