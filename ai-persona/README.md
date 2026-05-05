# AI Persona

Phase 4 of the cash project (see [`../ROADMAP.md`](../ROADMAP.md)): build AI-generated personas (consistent fictional faces) and run them as Instagram + paid-platform accounts. Income comes from the funnel — IG drives free reach, paid platforms (Fanvue and equivalents) monetize.

The strategy is structurally different from the trading-based phases: it's **content production**, not signal-spotting. The bottleneck is character consistency and posting cadence, not market opportunity.

---

## Three pillars

### `personas/` — the characters

One folder per persona. Designed for scale (target: 3–4 active accounts) by making each persona a self-contained unit with the same internal layout. `_template/` is copied to spin up a new one.

- [`personas/README.md`](./personas/README.md) — how to spin up a new persona
- [`personas/_template/`](./personas/_template) — the persona blueprint (identity card, prompt library, reference shots, LoRA, content, post log)

### `SETUP.md` — the production stack

How to actually generate the images and videos. Two stages: local Mac prototyping (free, SDXL via Draw Things) → cloud (RunPod, for Flux + LoRA training + video).

- [`SETUP.md`](./SETUP.md)

### `PLAN.md` — phased rollout

From "first prototype image" → "single live persona" → "scaled multi-account pipeline". Each phase has an exit criterion before money / time goes into the next.

- [`PLAN.md`](./PLAN.md)

---

## How it fits together

```
[SETUP.md stack]  →  generates images/videos using   →   [personas/<name>/prompts.md + LoRA]
                                                                          ↓
                                                          output saved to personas/<name>/content/
                                                                          ↓
                                                  [user posts to IG / Fanvue, logs to posts.jsonl]
```

Per-persona logs (`posts.jsonl`) mirror the `sportsbook-arb/tracker/events.jsonl` pattern — append-only, single source of truth for what was posted, where, when, and how it performed.

---

## Status

| Pillar | Status |
|---|---|
| SETUP (local Mac, Phase 1) | ✅ Complete — Draw Things + Juggernaut XL v9 8-bit baseline working |
| SETUP (cloud, Phase 2-3) | ⏳ Next — RunPod + AI-Toolkit + SDXL training; see `SETUP.md` Stage 2 |
| Architecture decision | ✅ SDXL primary (not Flux) — driven by content priority order; see `PLAN.md` |
| Personas | 🟡 Maya: Phase 1 ✅ (33 reference shots + captions ready), Phase 2 next |
| First IG launch | ⏳ Phase 4 (see `PLAN.md`) |
