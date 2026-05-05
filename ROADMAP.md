# Trading Plan
*Last updated: May 4, 2026*

---

## Phase 1 — Start Now: Arbitrage Sports Betting

### How it works
When two sportsbooks price the same game differently, you bet both sides with calculated amounts that guarantee profit regardless of outcome. Example: FanDuel has Jets +150, Bet365 has Jets -130 — the math locks in a return either way.

### Setup
- Open accounts on FanDuel and Bet365 (both available in Ontario)
- Add more books over time to increase the number of opportunities available

### How Claude helps
A locally-installed Chrome extension reads odds directly from sportsbook tabs you have open in a separate browser profile, computes arbs across books, and notifies you with the exact stake per leg. Free, runs on your machine, sidesteps bot detection because the scanner lives inside your real browser session. Implementation details: `sportsbook-arb/extension/`. The discipline layer (rulebook + bet/transaction log) lives in `sportsbook-arb/tracker/`.

### Realistic returns
The 10–30% monthly figure shows up in arber-community reports, but 30% is unsustainable — high return rates accelerate account limiting. Plan for **5–15% steady-state** once accounts mature, with a higher early ramp before books catch on. On $1,000 that's $50–150/month, growing as the bankroll compounds across surviving accounts. Detailed evidence in `sportsbook-arb/tracker/DETECTION_RESEARCH.md`.

### Key risk
Account limiting is when, not if. Arbitrage *structurally* generates Closing Line Value (CLV) — the strongest signal sportsbooks use — and there is no defense against that signal beyond spreading bets across multiple books. Per-book "still unlimited" rates roughly: ~70% at 6 months, ~30–50% at 12 months, ~10–20% at 24 months. Across 5+ books, expect 2–3 functional at month 18, with rotation in/out as some get limited. The strategy buys time, not invisibility. Full detection-mechanics analysis: `sportsbook-arb/tracker/DETECTION_RESEARCH.md`.

---

## Phase 2 — Expand & Add New Strategies

### 2A. Expand Arbitrage to Prediction Markets

Take the same arbitrage logic from sports betting and apply it to platforms like Polymarket and other prediction markets. Look for:

- **Mispriced markets** — where the implied probability doesn't match reality (e.g. a 97% certain outcome paying out like it's 70%)
- **Cross-platform arbitrage** — same event priced differently across multiple prediction markets
- Claude Code can scan Polymarket's public API for these opportunities the same way it scans sportsbook odds

### 2B. Politician Stock Trade Monitoring

Politicians in the US are required by law (STOCK Act) to publicly disclose their trades within 45 days. This data is public and has a strong track record of being well-timed.

**The strategy:**
- Monitor politician trades via tools like InsiderWave or free API alternatives (Capitol Trades, house.gov/senate.gov public disclosure data)
- Claude Code scans for recent trades and filters for high-conviction patterns — multiple politicians buying the same stock, trades ahead of major legislation, unusual volume, etc.
- You review the signal and decide whether to follow the trade on a regulated Canadian platform (Kraken, Coinbase, Wealthsimple, NDAX, or Newton)

**Why this works:**
- Completely legal — the data is public by law
- Politicians have a historically suspicious win rate on trades
- Edge comes from spotting signals before they become mainstream news

**Canadian note:** You'd be trading US stocks/ETFs through a Canadian broker. Wealthsimple and most Canadian brokers support this. CRA tax rules apply.

---

## Phase 3 — Automate & Scale

Once you have real results and understand why each strategy works:

- **Automated alerts** — politician trade scanner, odds scanner, and wallet tracker all running in the background, pinging you when something actionable appears
- **Crypto trading bot** — use Kraken or Coinbase API (both Ontario-legal) with a Claude Code-built bot. Coinrule is a no-code alternative that sits on top of either exchange
- **Scale arbitrage** — open more sportsbook and prediction market accounts to capture more opportunities before account limits kick in
- **On-chain wallet copy trading** — identify wallets with a track record of early meme coin entries via DEXScreener and Cielo Finance, build an alert bot that pings when they move

---

## Phase 4 — AI Persona Income (Content, not Trading)

### How it works
Generate fictional people with diffusion models, run them as Instagram + paid-platform accounts (Fanvue and equivalents). IG drives free reach, paid platforms convert. Structurally different from Phases 1–3: this is **content production**, not signal-spotting. The bottleneck is character consistency and posting cadence, not market opportunity.

### Setup
- Local prototype on the M1 Pro using Draw Things + uncensored SDXL bases from Civitai (free)
- Cloud (RunPod, ~$0.40/hr RTX 4090) for Flux LoRA training and video generation once the persona concept locks in
- Per-persona folder structure designed to scale to 3–4 active accounts without proportional time cost — see `ai-persona/personas/`

### How Claude helps
Scaffolds the workflow and writes the per-persona prompt libraries / posting calendars / `posts.jsonl` performance logs. Claude doesn't generate images directly; it orchestrates the local + cloud diffusion stack and tracks results across personas. Implementation details: `ai-persona/`. Phased rollout: `ai-persona/PLAN.md`.

### Realistic returns
Single AI persona case studies on Fanvue cluster around **$500–3,000/mo** after a 2–4 month ramp; top operators with multi-persona pipelines clear $10k+/mo but those are full-time operations. Plan for $0 in months 1–3 (building), $500 break-even target in month 4 (single persona), then 3–4× that if scaling to multiple personas executes. Highly variable — niche, posting consistency, and disclosure choices dominate outcome.

### Key risk
Platform bans. Meta has been mass-banning low-effort AI accounts in 2025–2026. Disclosure ("AI Model" in bio) lowers ban risk but tanks engagement; undisclosed is more lucrative but accept account churn. Saturation is also real — thousands of these exist; the differentiator is niche + lore + cadence, not the generation tech. Full risk breakdown in `ai-persona/PLAN.md`.

---

## General Notes

- **CRA tax rules:** Frequent trading is taxed as business income in Canada, not capital gains. Keep records of every trade from day one.
- **Max loss principle:** Stick to cash accounts with no leverage or margin. Maximum loss is always what you put in.
- **Ontario-legal exchanges:** Kraken, Coinbase, Wealthsimple Crypto, NDAX, Newton, Shakepay. Avoid Binance, KuCoin, OKX, Bybit — all banned in Ontario.
- **Ontario sportsbooks:** FanDuel, Bet365. Add more books over time to increase arbitrage opportunities.

---

*This is a living document — update it as strategies evolve, new tools are discovered, or phases are completed.*