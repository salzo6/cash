# AI Persona — Rollout Plan

Each phase has an **exit criterion**. Don't advance until it's met — premature scaling burns money on a workflow that doesn't actually produce sellable content yet.

---

## Phase 1 — Local prototype (free, current Mac)

**Goal:** decide if the creative process clicks before spending anything.

- Install Draw Things (App Store, free, Apple Silicon native)
- Download 1–2 uncensored SDXL bases from Civitai (see `SETUP.md`)
- Generate 100+ exploratory images, varying prompts/seeds, until a face/aesthetic emerges that you'd actually want to run with
- Lock in a seed + prompt formula that reliably produces "the same person" within Draw Things' constraints (consistency will be imperfect — Phase 2 fixes this)
- Copy `personas/_template/` → `personas/<name>/`, fill out `persona.md` (identity card) and `prompts.md` (locked tokens)
- Save the best 30–50 base shots to `personas/<name>/reference/`

**Exit criterion:** one filled-out persona folder with 30+ reference shots and a written identity card. You either feel "yeah, I'd post this" or "this isn't for me" — both are valid outcomes.

**Cost:** $0. **Time:** a few evenings.

### Phase 1 status (as of 2026-05-04)

**Working:**
- Draw Things installed on M1 Pro 16GB Mac
- Base model: **Juggernaut XL v9 (8-bit)** loaded — ~30–60 sec/image
- LoRA: **GonzaLomo_Amateur (SDXL Base, 217 MB)** loaded at 60–70% weight
- Generation pipeline functional end-to-end

**Stuck on:** output quality. Generated images still read as "AI-like" despite multiple prompt iterations + LoRA. Specific failure modes seen: (1) too-polished "Instagram model" baseline that prompt engineering only partially overcomes; (2) when pushed harder toward amateur ("ugly", "average", "lowres" tokens), faces become asymmetric/distorted ("looks disabled") and skin gets painted-on; (3) trigger tokens like `lowres` and `webcam photo` literally degrade output rather than stylize it.

**Highest-leverage next moves to try (in order):**
1. **Different base model** — RealVisXL v4 (also in Draw Things catalog) has less "polished AI" bias than Juggernaut. Same workflow, just swap the model.
2. **img2img from a real reference photo** — feed the model an actual Pinterest/scraped phone selfie at low denoise strength (0.4–0.5). Forces the model toward the source's amateur quality instead of generating from scratch.
3. **ControlNet (pose/face reference)** — lock the composition to a real reference, let the model fill in the persona. Requires installing a ControlNet model in Draw Things.
4. **Different LoRA** — try one trained specifically on Instagram selfies or OnlyFans-style shots (search Civitai SDXL LoRAs filtered to "selfie" or "amateur" with example outputs that match target aesthetic).
5. **Resolve Civitai NSFW gate** — open a support ticket re: missing "Show Mature Content" toggle in account settings; unlock access to Lustify-tier models which have a much less "AI-pretty" baseline.
6. **Skip ahead to Phase 2** — accept that local SDXL on M1 Pro has a quality ceiling, and that RunPod + Flux + custom LoRA will solve this anyway.

**Open question for next session:** which of those six to attempt first.

---

## Phase 2 — Cloud LoRA training (RunPod)

**Goal:** consistent face across any new prompt.

- Spin up a RunPod ComfyUI template on an RTX 4090 (~$0.40/hr)
- Train a Flux LoRA on the reference shots from Phase 1 (Kohya / AI-Toolkit, ~1–3 hr training)
- Save the `.safetensors` to `personas/<name>/lora/`
- Validate: generate 20 new images with the LoRA active. Face should be unmistakably the same person across angles/lighting/outfits.

**Exit criterion:** the LoRA passes a "blind test" — show the 20 outputs alongside the reference shots, the face is recognizably one person.

**Cost:** ~$5–15. **Time:** a weekend.

---

## Phase 3 — Video pipeline

**Goal:** turn still images into 5–10 second clips for Reels / TikTok.

- On the same RunPod box, install Wan 2.1 or HunyuanVideo (image-to-video)
- Confirm the LoRA carries into the video model (or train an equivalent)
- Optional: add LivePortrait for talking-head clips, ElevenLabs for voice
- Produce 5–10 test clips of the persona

**Exit criterion:** a 30-second IG Reel is producible end-to-end (image → video → cut → caption) in under 1 hour of human time.

**Cost:** ~$10–30. **Time:** a weekend.

---

## Phase 4 — First IG launch (single persona)

**Goal:** prove the funnel before scaling.

- Create the IG account (matches `persona.md`'s declared handle)
- Post daily for 30 days; log every post to `personas/<name>/posts.jsonl` (timestamp, platform, caption, asset path, performance snapshot at +24h and +7d)
- Disclosure decision: explicit "AI Model" in bio is safer (lower ban risk) but tanks engagement; undisclosed is more lucrative but accept burner-account churn. Document the choice in `persona.md`.
- Track: follower growth rate, engagement rate, DM volume, click-through to bio link

**Exit criterion:** 30 days of consistent posting + a defensible answer to "is this growing?" (e.g., 500+ followers and >3% engagement, or a clear reason to pivot the persona).

**Cost:** $20–50 (compute for content). **Time:** ~4 hr/week of human time once the pipeline is set.

---

## Phase 5 — Monetization funnel

**Goal:** convert IG attention into revenue.

- Set up Fanvue (or the current best AI-friendly paid platform — re-research at this stage; the landscape shifts)
- Add bio link / Linktree on IG → paid platform
- Define tiered content (free IG = teaser, paid = exclusive)
- First payouts within 60 days of funnel launch is realistic if Phase 4 cleared its exit criterion

**Exit criterion:** $500+ first month from a single persona. If no, problem is upstream (persona/niche/funnel) — fix before scaling.

---

## Phase 6 — Scale to 3–4 personas

**Goal:** parallelize without proportional time cost.

This is what the `personas/` folder structure is built for. Each persona is a self-contained unit; the pipeline runs once, content distributes to all.

- Differentiate personas by **niche**, not just face — same niche = same audience = cannibalization. Examples: fitness, gamer, alt/goth, "girl next door", cosplay.
- Batch production: one RunPod session generates a week of content for all active personas (~3–5 hr)
- Stagger launch dates by 2–4 weeks so each persona gets focused attention during its ramp
- Posting can be scheduled (Later, Buffer, Metricool) — not real-time

**Exit criterion:** 3–4 active personas, combined revenue ≥ 3× single-persona Phase 5 baseline, and the human time per week stays under ~10 hours.

**Cost:** ~$40–100/mo compute at this scale.

---

## Risks & realities

| Risk | Mitigation |
|---|---|
| **Platform bans** (IG mass-bans low-effort AI accounts) | Disclosure decision per persona; treat each account as eventually-disposable, keep all content + DMs backed up so a banned account can be relaunched fast |
| **Saturation** — thousands of these exist | Differentiator is niche + lore + posting cadence, not the tech; spend Phase 1 time on persona concept, not just the face |
| **Monetization timing** — first $ is 2–4 months out | Phase 4 exit criterion is the gate; don't sink into Phase 5 if growth signals aren't there |
| **Burnout** — daily posting is real work | Phase 6's batch pipeline is the only sustainable path; if Phase 4 feels grindy with one account, four will not be better |
| **Legal** — synthetic media + adult content | Stay clear of: real-person likeness (deepfake liability), anything resembling minors (criminal), undisclosed paid promo (FTC). Beyond that, AI personas + adult content is legal in Canada and on Fanvue. |

---

## What this plan does *not* commit to

- A specific persona concept — that's a Phase 1 output
- A specific paid platform — Fanvue is current best guess, re-evaluate at Phase 5
- Hardware purchase — Phase 1 is free, RunPod covers Phase 2–3, only buy a GPU if Phase 5 clears and monthly compute > GPU amortization
