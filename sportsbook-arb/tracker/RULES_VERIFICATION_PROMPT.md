# Rules Verification Prompt

A prompt to paste into a fresh Claude Code chat in this repo to fact-check the claims in [`rules.md`](./rules.md).

Re-run periodically — sportsbook detection methods evolve, and stale assumptions are worse than no assumptions.

---

## How to use

1. Open a fresh Claude Code chat in this repo. It will have direct read/write access to all files here.
2. Paste the prompt below.
3. The chat reports findings in the conversation — **it does not edit files yet**.
4. Read the findings critically and cross-check links it cites; LLMs hallucinate sources.
5. Approve specific corrections, then let the chat update [`rules.md`](./rules.md) and [`../extension/RISK_SCORING.md`](../extension/RISK_SCORING.md) directly.
6. The chat updates the "Last verified" line at the top of `rules.md` with today's date.

---

## --- PROMPT ---

I'm building a system for sustainable arbitrage betting on Ontario-regulated sportsbooks (FanDuel ON, BetMGM ON, Bet365 ON, theScore Bet, Proline+, etc.). The strategy depends on **not** getting my accounts limited or banned. The rulebook captures what I currently believe is true about how books detect arbers and what behaviour keeps you safe long-term.

**Read these first:**
- `sportsbook-arb/tracker/rules.md` — the rulebook. The "Detection mechanics" section near the top is the part I most need fact-checked.
- `sportsbook-arb/extension/RISK_SCORING.md` — how the rules turn into an automated risk score on every bet. Skim this so you understand which claims, if wrong, would corrupt the scoring.

I need you to fact-check the rulebook. **Use web search and cite specific sources** — arber forums (r/sportsbook, BettingTalk, BetBurger blogs), sportsbook ToS pages, regulator publications from iGaming Ontario, news articles, account-limiting case studies. Don't paraphrase common knowledge — find evidence and link to it. **If a search returns nothing useful, say "couldn't verify" — do not fabricate citations.**

## What I want from you

### 1. Verify each factual claim in the "Detection mechanics" section

For each claim, give me:
- **TRUE / LIKELY TRUE / UNCERTAIN / LIKELY FALSE / FALSE**
- Current public evidence supporting your assessment (with links)
- How your assessment differs from what the rulebook says, if at all

The claims I'm most worried about being wrong or oversimplified:

- Detection is multi-layered (KYC + IP + device fingerprint + behavioural profile + bet timing)
- Detection is automated and continuous, not periodic human review
- Each Ontario book monitors independently — no formal sharing of arber data between books
- Third-party fraud networks *might* connect books, but no public confirmation
- Typical first response is "limit, not ban" (max bet drops to $5–20)
- Regulated Ontario books legally must return funds even when accounts are closed
- Account lifespan with full defenses (5+ books, modest stakes, rotated pairings) extends to years rather than months
- 1–4% per-arb margins and 10–30% monthly returns on betting bankroll are realistic

### 2. Identify gaps

What's missing that experienced arbers consider important but isn't in the rulebook? Be specific. Particularly investigate:

- Bonus / promo handling — do bonus T&Cs or refused bonuses signal arbers?
- Cash-out feature usage interactions with arber profiling
- Live / in-play betting signatures
- Payment methods — same Interac/Visa across books vs mixing
- VPN / IP signals beyond geolocation
- Whether intentional -EV "cover" bets (parlays, longshots, prop ladders) actually deter detection or are an arber-forum myth
- Ontario/Canadian arber experience vs US/UK reports — measurably different?
- "Account aging" — do older accounts get leeway, and how do you build that aging without arbing on it?
- Withdrawal-method-vs-deposit-method compliance signals

### 3. Flag anything outdated

The research behind this rulebook was done in **April 2026**. Has anything changed since? New detection technology, Ontario book policy changes, new iGaming Ontario regulator guidance, new fraud-network arrangements, new payment-flow restrictions?

### 4. Final verdict

Bans are probabilistic, not deterministic. With that caveat:

**If I follow this rulebook strictly AND only place bets that pass an automated risk assessment grounded in these rules, what's the realistic probability of keeping my Ontario sportsbook accounts unlimited for *years* rather than months? What's the single biggest residual risk that would still get me caught even with perfect compliance?**

## Output format

Report your findings to me **in this chat — do not edit any files yet**. I want to read your assessment first and decide which changes to apply. Once I approve specific corrections, you can update:

- `sportsbook-arb/tracker/rules.md` — the claims and rules
- `sportsbook-arb/extension/RISK_SCORING.md` — factor weights, if any need to change based on what you find
- The "Last verified" line at the top of `rules.md` (add today's date once verification is complete)

## Tone

I don't want validation. I want to know what's wrong, what's incomplete, and what's actually true. If the rulebook is naive in places, say so. If you can't verify with public evidence, say "uncertain" rather than guessing. If something contradicts arber-forum conventional wisdom, flag the contradiction explicitly. Be brutal — I'd rather find out the rulebook is broken here than after my accounts get limited.
