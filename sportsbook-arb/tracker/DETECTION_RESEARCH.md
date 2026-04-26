# Detection Research

*Long-form notes behind every claim in [`rules.md`](./rules.md). When a rule looks weird, the reasoning is here.*

> **Last research pass:** 2026-04-26
> **Re-run cadence:** every ~6 months, or whenever an account gets unexpectedly limited
> **Method:** web research across detection-vendor blogs, regulator publications, arber/matched-betting forums, news, and case studies. See [Sources](#sources) at the bottom.

---

## Why this document exists

A friend can have an account closed and never be told why. Sportsbooks are not required to give a reason — Ontario's regulator only requires them to return funds, not to explain decisions. So "banned for seemingly no reason" is normal and expected, and a rulebook that only protects against *arbitrage detection* will miss everything else that closes accounts.

This doc captures three things:

1. **What we believe is true** about detection, with cited evidence.
2. **What's uncertain** — places where the practitioner community disagrees or evidence is thin.
3. **What gets accounts closed beyond arbing** — so the rulebook covers more than just our specific strategy.

If a claim in `rules.md` traces back to a claim here, and the claim here turns out to be wrong on a future research pass, the rule has to be re-evaluated.

---

## Per-claim verdicts (April 2026 pass)

Verdict scale: **TRUE / LIKELY TRUE / UNCERTAIN / LIKELY FALSE / FALSE**.

### Detection stack: KYC + IP + device fingerprint + behavioural profile + bet timing — **TRUE**

Every detection-vendor source describes this exact stack. Sumsub names "device fingerprinting, IP intelligence, and behavioral biometrics" plus liveness detection and payment verification. Ondato and iDenfy describe the same. GeoComply (used by FanDuel, BetMGM, Bet365, Caesars in Ontario) layers GPS, Wi-Fi, cell-tower, browser API, and device metadata.

**Behavioural biometrics include mouse movement and typing cadence** — not in the original rulebook draft. If we ever automate stake input via the extension, that's a fingerprint anomaly. Manual placement is required.

### Detection is automated and continuous, not periodic human review — **PARTIALLY TRUE**

The scoring is automated and continuous. Outplayed/Matched Betting Blog describe a 0–100 risk score that bots maintain.

**But withdrawals trigger human review.** Sportsbook Review Forum poster: "every payout request results in someone manually looking at your account." Sumsub describes a hybrid where algorithms categorize accounts but traders manually "cut the account."

**Implication:** withdrawal events should raise risk for the next 7–14 days. The rule is in `rules.md`; the scorer factor is `RECENT_WITHDRAWAL`.

### Each Ontario book monitors independently — no formal arber-data sharing — **LIKELY FALSE**

This was the rulebook's biggest blind spot.

The **Responsible Online Gaming Association (ROGA)** exists. Members include FanDuel, BetMGM, Bet365, DraftKings, Fanatics, Hard Rock Bet, and Penn Entertainment (parent of theScore Bet). LexisNexis Risk Solutions runs the data clearinghouse (selected September 2025).

**Caveats on what this changes:**
- Officially, ROGA is scoped to **problem-gambling self-exclusion**, not arber blacklists. Public scope: "share information related to protection of consumers" — details "aren't yet clear."
- Critics flag the gap. Bet365 has a track record of "using problem gambling as an excuse to exclude sharp bettors." The clearinghouse is the perfect venue to launder a sharp-bettor blacklist as RG protection.

Separately, ACGCS describes "consortium databases for fraud where one operator can flag a device fingerprint or identity… and others can be alerted" as standard industry practice. The same risk-management vendors (GeoComply, LexisNexis, Sumsub) serve all five books, so even without a formal arber list, identical detection rulesets get applied across books in parallel.

**Net assessment:**
- Assume parent-level shared infrastructure.
- Assume ROGA's stated RG scope can creep.
- Proline+ (OLG-operated, not a ROGA member) is the genuine outlier — independent.

### Typical first response is "limit, not ban" with max bet $5–$20 — **LIKELY TRUE, but per-book**

Limit-before-ban is well-attested. But the *number* in the original draft was too narrow:
- **FanDuel:** reportedly limits sharps to ~$100, not $5–$20. "FanDuel likes getting sharp bettors on their platform, and will only limit you down to a hundred bucks usually."
- **Bet365:** harsher and more likely to outright close. UK soft-book pattern reports go as low as £1–£5 max.
- **BetMGM, DraftKings, theScore Bet, Proline+:** somewhere in between, less data.

The rulebook now uses a per-book aggressiveness multiplier rather than a single number.

### Regulated Ontario books legally must return funds when accounts are closed — **TRUE**

AGCO Standard 7 (Player Account Management) and Standard 8 (Funds Management) require operators to permit withdrawal "in an accurate and complete fashion and within a reasonable timeframe" after KYC verification. Withdrawal must go to "an account of which the player is a legal holder."

**One implicit rule we missed:** AGCO + AML enforce **deposit-withdrawal method matching.** If you deposited via Interac e-Transfer to email X, you must withdraw to email X. Mismatched methods can trigger withdrawal holds. Documented in `rules.md` now.

### Account lifespan with full defenses extends to years rather than months — **OPTIMISTIC**

Evidence skews shorter than "years":
- Real reports: "Bet 365 accounts being limited in a few weeks, Unibet in 1 month, William Hill in only 1 day."
- Arbusers community: soft bookmakers restrict new accounts "in days" once arber patterns are visible.
- Some arbers do report 1+ year accounts with personal scanners — upper tail, not median.

**Honest framing in the rulebook:** with strong defenses, expect median lifespan in many months; some accounts last 12+ months; "years" is the long tail, not the planning assumption.

### 1–4% per-arb margin — **TRUE**

Standard published range for arbs on regulated markets. Top-tier opportunities are rare and the obvious ones get killed quickly.

### 10–30% monthly returns realistic — **OPTIMISTIC**

Published as a range that *exists*, not a typical outcome. ProfitDuel: "ROI over 30%/month" achievable but "no guarantee of specific results each month." Practitioner consensus: 30% monthly is unsustainable once accounts get limited — the high return rate accelerates limiting. 10% monthly is plausible early; the trajectory bends sharply down as books limit.

### Bet right before line moves = arber tell — **TRUE — and bigger than the original draft suggested**

This is **the single most predictive signal** sportsbooks use. ESPN: "Beating closing lines is what gets you banned, rather than simply winning." It's called Closing Line Value (CLV).

**The original draft underweighted this.** Bet timing isn't *one of five* equal signals — it's the **primary** behavioural signal because it's the cleanest mathematical tell of an edge. CLV is now a first-class concept in `rules.md` and a tracked variable per bet in the scorer.

### Stake anomalies (non-round numbers, sudden spikes) — **TRUE**

Confirmed by every source (Sumsub explicitly calls out "$94.31 instead of $100"; RebelBetting recommends rounding to nearest 5).

### Frequent deposit-withdrawal cycles = arber + AML double red flag — **TRUE**

Confirmed across detection vendors. Sumsub flags "repeated small withdrawals despite maintaining a consistently high account balance" and "multiple deposits and subsequent withdrawals without meaningful wagering activity" as both arber and money-laundering signals.

### "Always winning" — **TRUE but underspecified**

More precise: it's **persistent positive CLV** that flags, not raw PnL. A bettor can win a lot and not get limited if their wins look like luck on -EV bets. A bettor can be only mildly profitable and get limited fast if every bet beats the closing line.

This matters for `RISK_SCORING.md`'s outcome-risk axis: PnL alone is a coarse proxy. CLV per bet is the real signal.

---

## Gaps in the original draft (now closed)

### Market selection (HIGH PRIORITY)

Practitioner consensus: betting **soft props and obscure leagues** is the **fastest** way to get limited — faster than stake size, faster than withdrawal cadence.
- "Betting soft props is a quick way to get limited."
- "Keeping bets to the 4 major sports will take a lot longer to get limited."
- "Stick with large markets... NFL, MLB and NBA games are ideal."

**Rule added:** major-league moneyline / spread / totals only. No obscure props, no third-tier soccer, no niche markets.
**Scorer factor added:** `MARKET_TIER` — hard-blocks non-major markets.

### Closing Line Value (CLV)

Already covered above. CLV is now first-class in both `rules.md` and the scorer.

### Cash-out feature behaviour

iDenfy: "Professional arbitrage bettors will frequently cash out. This is another sign you need to track."
Cash-outs are particularly suspicious because they let arbers exit when both legs become uneconomic.

**Rule added:** don't use cash-out as a tactic; only cash out occasionally on positions that look like recreational decisions.

### In-play vs pre-game

Practitioner consensus: live betting reduces detection because books have less time to compare bets to closing lines. **Caveat:** in-play arbs have execution risk (suspended markets, latency) that eats margin. Tradeoff is real but mostly favours longevity.

**Rule added:** modest preference for live betting where the arb supports it.

### Account aging / warming up

Deposit small, place a few recreational bets over weeks before any arb activity. RebelBetting, ProfitDuel, Bonusbank all converge on this.

**Rule added:** `MIN_ACCOUNT_AGE_DAYS` (30) and `MIN_NON_ARB_BETS_BEFORE_ARBING` (5).

### Withdrawal triggers manual review

Already covered above. Encoded as scorer factor `RECENT_WITHDRAWAL` with `POST_WITHDRAWAL_HEAT_DAYS` window.

### Payment-method matching is an AML hard rule

Documented as a hard requirement in `rules.md`. Same Interac email across multiple books is unavoidable in Canada and is usually fine — many recreational bettors do the same. Don't worry about it; just don't *also* reuse usernames, passwords, or account names.

### Mug bets — mixed evidence

Real disagreement in the practitioner community:
- Outplayed and BeatingBetting: it absolutely works.
- Mike Cruickshank (long-time matched bettor): "mug betting is a complete waste of time."

**Honest read:** mug bets help at the margin, especially early in account life, but they don't "cover" sharp behaviour by themselves. A handful of mug bets get noise-cancelled if every other bet beats the closing line. Don't over-rely.

### Never use a VPN on these accounts

GeoComply runs hundreds of checks per transaction including VPN detection. VPN use is one of the highest-confidence flags in the system and would void all KYC trust at once. Hard rule.

---

## Per-book aggressiveness notes

| Book | Operator | Behaviour | Multiplier |
|---|---|---|---|
| **Bet365** | Bet365 (UK) | Most aggressive. Documented track record of full closures, often dressed as RG/problem-gambling. | risk × 1.10 |
| **FanDuel** | Flutter | Softest of the majors. Will limit (often to ~$100) before closing. | risk × 0.95 |
| **BetMGM** | MGM/Entain | Baseline. Limits more readily than FanDuel. | risk × 1.00 |
| **DraftKings** | DraftKings | Baseline. Aggressive on parlays/props specifically. | risk × 1.00 |
| **theScore Bet** | Penn (ROGA member) | Baseline; less data. | risk × 1.00 |
| **Proline+** | OLG | Crown corp. Independent of ROGA. Limits driven more by withdrawal-verification friction than arber detection. | risk × 0.95 |

Note: every ROGA member appears in this table. Proline+ is the only Ontario-relevant book outside ROGA — that's the structural reason to keep it in the rotation even if it's not the best-priced book.

---

## "Banned for seemingly no reason" — non-arber closure causes

Worth knowing because friends-of-friends getting closed is *not always* because they tripped an arber detector. Common reasons that look unexplained:

- **AML / source of funds** — large deposits without explanation, frequent deposit-withdrawal cycles, multiple deposits from different cards. Books are required by AML to investigate; many close rather than investigate.
- **Multi-account links from same household** — KYC flags shared address, IP, device, or payment method as multiple accounts even if they're separate legitimate users (roommates, family). Books default to closing both rather than untangling.
- **Self-exclusion contagion** — under ROGA, if a household member self-excludes through one operator, the device or address may get flagged at others.
- **"Responsible gambling" closures** — some books (notably Bet365) close accounts under RG criteria when the actual driver is sharp/winning behaviour. Ontario AGCO doesn't require books to disclose the reason.
- **Bonus abuse** — accepting promotions and not meeting wagering requirements, or extracting bonus funds in ways the book classifies as abuse.
- **Payment fraud network signals** — using a card that's been flagged elsewhere (fraud chargebacks, identity reuse) flows through to gambling KYC because the same vendors (LexisNexis, Sift) score across industries.
- **Geo / VPN signals** — even occasional use of a VPN, traveling outside Ontario, or sketchy ISP IP reputation can void location trust.

**What to take away:** the rulebook controls what we can control. It cannot cover risks from household, device, or payment-history overlap with other people. Friends getting closed for "no reason" is usually one of these — not necessarily a model that would also catch our pattern.

---

## What I couldn't verify

- **Specific bet-timing thresholds.** Multiple sources say "bets right before line moves," but no public source quantifies the window (seconds? minutes?). Treat any bet placed within the last few minutes before a line move as suspicious; assume the book sees the timing at sub-second resolution.
- **Exact ROGA arber-data scope.** Officially RG-only; critics suspect creep. We can't verify either way without inside access.
- **Per-book limit thresholds.** FanDuel's "$100 limit for sharps" is one practitioner-quoted figure. Bet365's "as low as £1–£5" is from UK matched-betting forums. Ontario-specific numbers are scarce.
- **Effectiveness of mug bets in 2026.** Genuinely contested in the practitioner community; the truth is probably "modest signal that helps with the recreational classifier, not a sharp-bettor cover."
- **Behavioural biometric thresholds.** Vendors say mouse/typing patterns are tracked; no source quantifies how much they weight against bet patterns.

---

## Final probability framing

Bans are probabilistic, not deterministic. With the rulebook as updated 2026-04-26 + the scorer running on every bet:

| Horizon | Per-book "still unlimited" probability (rough) |
|---|---|
| 6 months | ~70% |
| 12 months | ~30–50% |
| 24 months | ~10–20% |

Across 5 books, expect 2–3 to be functional at month 18, with rotation in/out as some get limited.

This is **much better than no defenses** (where most accounts get limited in 1–6 months) but is **not "years" across the board.** "Years" is the long tail, not the expected case.

**The single biggest residual risk that gets you caught even with perfect compliance:** Closing Line Value. Arbitrage *requires* taking whichever side has the highest odds before the line moves to true price — that is mathematically the same fingerprint as a sharp bettor, and there's no defense, because if you wait until the line settles, the arb is gone. Mug bets, round stakes, varied timing, and account aging all reduce the *probability* of being flagged on any one bet, but they don't reduce the underlying CLV signal accumulated across many bets. The strategy works because you're spreading that pattern across 5+ books, not because any single book can't see it. What you're buying is *time*, not invisibility.

**Secondary residual risk:** ROGA / shared infrastructure cross-correlation. If LexisNexis or GeoComply expands what they cross-reference, or ROGA's RG-scoped clearinghouse expands de facto to include "high-risk" players, the 5-book parallelism collapses. This is the structural risk you can't engineer around — only watch for and exit.

---

## Sources

Detection vendors and practitioner blogs:
- [Sumsub: Arbitrage in Sports Betting](https://sumsub.com/blog/arbitrage-gambling/)
- [Ondato: Arbitrage Sports Betting](https://ondato.com/blog/arbitrage-sports-betting/)
- [iDenfy: Detecting Arbitrage in Sports Betting](https://idenfy.com/blog/arbitrage-sports-betting/)
- [ShuftiPro: How Businesses Detect Arbitrage Sports Betting](https://shuftipro.com/blog/how-can-businesses-detect-arbitrage-sports-betting/)
- [TrustDecision: Arbitrage Betting](https://trustdecision.com/riskopedia/arbitrage-betting)
- [XCLSV: How Sportsbooks Detect Arbitrage Bettors](https://xclsvmedia.com/how-sportsbooks-detect-arbitrage-bettors-and-how-to-stay-under-the-radar/)
- [Gosubetting: How Bookmakers Track You](https://www.gosubetting.com/blog/betting-guides/how-bookmakers-track-you/)
- [Caan Berry: How Bookies Catch Winning Bettors](https://caanberry.com/detecting-professional-gambling/)
- [TheSportsGeek: How to Arbitrage Bet Without Getting Caught](https://www.thesportsgeek.com/blog/how-to-arbitrage-bet-without-getting-caught/)

GeoComply / location intelligence:
- [ACGCS: Geolocation Fraud and Proxy Betting](https://www.acgcs.org/articles/geolocation-fraud-and-proxy-betting-challenges-for-sportsbooks)
- [WSN: GeoComply Explained](https://www.wsn.com/betting-guide/location-validators/)
- [Computronix: Online Gambling Regulators and Location Intelligence](https://www.computronix.com/online-gambling-regulators-all-in-on-location-intelligence/)

Sportsbook limiting / banning practices:
- [BettingUSA: Do Sportsbooks Ban Smart Customers?](https://www.bettingusa.com/sportsbooks-ban-smart-customers/)
- [ESPN: Sportsbooks defend limiting sharp customers](https://www.espn.com/sports-betting/story/_/id/41231266/espn-sports-betting-news-sportsbooks-defend-practice-limiting-sharp-customers)
- [Elitepickz: Do Sportsbooks Ban Winners and Sharp Bettors?](https://www.elitepickz.com/blog/do-sportsbooks-ban-winners-and-sharp-bettors)
- [BoydsBets: What is a Sharp Bettor](https://www.boydsbets.com/what-is-a-sharp-or-wiseguy-in-sports-betting/)
- [BoydsBets: Why Sportsbooks Limit Winners](https://www.boydsbets.com/why-sportsbooks-limit-winning-bettors/)
- [The Credit People: Why Did Bet365 Close My Account?](https://www.thecreditpeople.com/credit/bet365-account-closure-reasons-nature-business)
- [SportsBettingDime: Avoiding Sportsbook Restrictions](https://www.sportsbettingdime.com/guides/strategy/avoiding-sportsbook-restrictions-arbitrage-betting/)

Ontario / AGCO regulator:
- [AGCO Standard 7: Player Account Management (iGaming)](https://www.agco.ca/en/lottery-and-gaming/responsibilities-and-resources/7-player-account-management-igaming)
- [AGCO Standard 8: Funds Management (iGaming)](https://www.agco.ca/en/lottery-and-gaming/responsibilities-and-resources/8-funds-management-igaming)
- [AGCO: Sport and Event Betting in Ontario — Player Information](https://www.agco.ca/en/lottery-and-gaming/sport-and-event-betting-ontario-player-information)
- [Canadian Gaming Business: Ontario BetGuard CSE 2026](https://www.canadiangamingbusiness.com/2026/04/15/igaming-ontario-betguard-cse)

Cross-book data sharing (ROGA):
- [ROGA: Mission and About](https://www.responsibleonlinegaming.org/mission)
- [ROGA Members](https://www.responsibleonlinegaming.org/members)
- [ROGA Press Release: LexisNexis Risk Solutions selected](https://www.responsibleonlinegaming.org/press-releases/responsible-online-gaming-association-roga-selects-lexisnexis-risk-solutions-as-data-clearinghouse-technology-provider)
- [CNBC via NBC Chicago: Largest U.S. sportsbooks join forces](https://www.nbcchicago.com/news/business/money-report/largest-u-s-sportsbooks-join-forces-to-tackle-problem-gambling/3394637/)
- [ESPN: Online gaming operators launch ROGA](https://www.espn.com/sports-betting/story/_/id/39820905/online-gaming-operators-launch-responsible-gaming-organization)
- [Gambling911: Are Sportsbooks Putting Together a Player Blacklist?](https://www.gambling911.com/sportsbook-player-blacklist.html)

Practitioner forums and matched-betting:
- [Sportsbook Review Forum: How to prolong account lifespan on soft books](https://www.sportsbookreview.com/forum/sportsbooks-industry/1946999-how-to-prolong-account-lifespan-on-soft-books)
- [Arbusers: Soft bookmakers restrict new accounts in days](https://arbusers.com/soft-bookmakers-restrict-new-accounts-in-days-t10596/)
- [RebelBetting: How to Avoid Bookmaker Limitations](https://www.rebelbetting.com/blog/how-to-avoid-bookmaker-limitations)
- [ProfitDuel: Avoid Sportsbook Account Limited](https://www.profitduel.com/blog/avoid-sportsbook-account-limited)
- [ProfitDuel Canada: Arbitrage Betting](https://www.profitduel.com/en-ca/arbitrage-betting)
- [Matched Betting Blog: How to Avoid Being Gubbed](https://matchedbettingblog.com/article/how-to-avoid-being-gubbed/)
- [Outplayed: Top Tips to Avoid Being Gubbed](https://outplayed.com/blog/top-tips-to-avoid-being-gubbed)
- [Bonusbank: What are mug bets](https://help.bonusbank.com.au/article/18-what-are-mug-bets-and-how-often-should-i-place-them)
- [Mike Cruickshank: Mug Betting is a Waste of Time](https://mikecruickshank.com/mug-betting/)

Canada-specific payments and arbitrage:
- [Ballislife: Interac Betting Sites in Ontario](https://ballislife.com/betting/ontario/sports-betting/payment-methods/interac/)
- [R2S Brokers: Payment Reversals & Arbitrage Betting Basics for Canadian Players](https://www.r2sbrokers.com/payment-reversals-arbitrage-betting-basics-for-canadian-players/)
- [SteakAndStein: Canadian Sports Betting Arbitrage Profit Guide](https://steakandstein.ca/2025/07/arbitrage-opportunities-in-canadian-sports-betting-markets/)
