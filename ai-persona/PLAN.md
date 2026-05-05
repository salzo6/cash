# AI Persona — Rollout Plan

Each phase has an **exit criterion**. Don't advance until it's met — premature scaling burns money on a workflow that doesn't actually produce sellable content yet.

---

## Content priority order (universal across all personas)

This priority order is **locked and applies to every persona** — Maya, and all future personas. Architecture and tooling choices flow from it.

1. **Videos** — non-negotiable. If a pipeline can't produce videos, it's a dealbreaker. Forms wanted: image-to-video clips, character replacement in existing videos (e.g., a TikTok dance with the persona as the dancer), generated-from-scratch motion. Video drives engagement way more than images.
2. **Semi-provocative content** — promotes the persona on IG/TikTok. Drives free reach. Both videos and images, slight preference for videos for IG/TikTok engagement.
3. **Full NSFW** — primary revenue on Fanvue/premium platforms. Both videos and images.
4. **Vlog/everyday videos** — for sponsorship deals down the road. Lower priority initially.

**Core funnel:** social media attention → conversion to paid premium content.

---

## Architecture decision: SDXL primary (not Flux)

Driven by the priority order above. Reasoning:

- **NSFW ecosystem maturity** — SDXL has Lustify, BigASP, Pony Realism, and dozens of NSFW LoRAs. Flux NSFW exists but is younger and less varied.
- **Dual-base flexibility** — same SDXL persona LoRA stacks with multiple bases. **Juggernaut XL or RealVisXL** for tier-2 semi-provocative (these obey "be modest" prompts). **Lustify or Pony Realism** for tier-3 full NSFW. Flux can't do this dual-base trick.
- **Video doesn't care** — image-to-video models (HunyuanVideo, Wan 2.2) work the same regardless of whether the input frame came from SDXL or Flux. Flux's image quality edge doesn't translate to a video edge.
- **License** — SDXL bases are permissively licensed (commercial OK). Flux.1-dev is non-commercial only by license terms; commercial use is technically restricted.
- **Cost & speed** — SDXL training is ~3× faster and ~3× cheaper than Flux. SDXL inference is ~3× faster, which matters for daily content batches.

**A Flux LoRA can be added later** for the same persona using the same reference images and captions. Reference data is architecture-agnostic. But SDXL is Day 1.

---

## Phase 1 — Local prototype (free, current Mac)

**Goal:** decide if the creative process clicks before spending anything.

- Install Draw Things on Mac (App Store, free, Apple Silicon native)
- Use the built-in catalog (skip Civitai gates) — Juggernaut XL v9 8-bit is the working baseline
- Generate 100+ exploratory images, varying prompts/seeds, until a face/aesthetic emerges that's worth running with
- Lock in a seed + identity-token prompt formula that produces "the same person" across variations (consistency will be ~70-85% on locked seed alone — Phase 2 fixes this permanently)
- Copy `personas/_template/` → `personas/<name>/`, fill out `persona.md` (identity card) and `prompts.md` (locked tokens)
- Save the best 30+ keepers to `personas/<name>/reference/`, sorted into `core/`, `standard/`, `variation/` subfolders

**Exit criterion:** one filled-out persona folder with 30+ ruthlessly-consistent reference shots. You either feel "yeah, I'd post this" or "this isn't for me" — both are valid outcomes.

**Cost:** $0. **Time:** a few evenings.

### Phase 1 status (Maya, as of 2026-05-05) ✅

- 33 keepers organized: 5 core / 21 standard / 7 variation / 1 culled
- Identity locked: `mayacole_persona` trigger word, seed `1784676583`, identity tokens captured in `personas/maya/prompts.md`
- All 33 caption sidecars (`.txt`) written for Phase 2 LoRA training
- Original SDXL generation prompts archived in `personas/maya/reference/PHASE1_PROMPTS.md`

**Lessons learned (apply to future personas):**
- Don't bother fighting Civitai's NSFW gate for checkpoints — Draw Things' built-in catalog is faster
- LoRA weights above 70% with stacked trigger tokens cause melted faces — keep weight at 50-60%
- `(token:1.2)` attention syntax doesn't parse cleanly in Draw Things — use plain tokens
- "Lowres", "webcam photo", "grainy" tokens degrade output rather than stylize it — avoid
- Img2img source must match canvas aspect ratio or output is bizarre superimposition — keep aspect locked
- Captions for LoRA training should describe what *varies* (clothing, setting, pose, lighting), not constants (hair, eye color, freckles) — the model learns constants from the trigger word + visual data

---

## Phase 2 — Cloud LoRA training (RunPod, SDXL)

**Goal:** consistent face across any new prompt, on any compatible SDXL base.

- Spin up a RunPod **Community Cloud RTX 4090** (~$0.34-0.44/hr — spot pricing sometimes $0.20/hr)
- Use the **AI-Toolkit** template (preferred over Kohya — simpler UI, modern defaults)
- Use a **Network Volume** (~$0.07/GB/mo) so base models persist between sessions
- Train an **SDXL LoRA** on the Phase 1 reference shots (~30-60 min on a 4090, captions already prepared from Phase 1)
- Save the `.safetensors` to `personas/<name>/lora/`
- **Validation matrix:** generate 20 new images with the LoRA active across **three different SDXL bases**:
  - **Juggernaut XL** → confirms tier-2 semi-provocative + SFW work
  - **Lustify** (or Pony Realism if Lustify gated) → confirms tier-3 full NSFW works
  - **RealVisXL** → backup option for SFW

**Exit criterion:** the LoRA passes a "blind test" — across all three bases, the face is recognizably one person.

**Cost:** ~$5-15. **Time:** a Saturday afternoon (4-6 hours including learning curve on first persona; ~2 hours for subsequent ones).

### Phase 2 status (Maya, as of 2026-05-05) ✅

- **`maya_lora_v1.safetensors`** trained on RunPod RTX 4090 (US-TX-3, Secure Cloud at $0.69/hr). Rank 16, 2000 steps, 35 min wall time. Saved to `personas/maya/lora/`.
- **Cross-base validation passed:** identity holds on Juggernaut XL v9, RealVisXL v4, and gonzalomoXLFluxPony_v40. Same recognizable face across all three.
- **Production stack locked:** gonzalomo + Maya LoRA at 60–78% weight (matches Phase 1 photorealism). Juggernaut as scene-control alternative (LoRA at 80–95% there). See `personas/maya/prompts.md` for full settings per base.
- **Total spend:** ~$2 of pod time + $0.12 of network volume. Well under the $5–15 budget.
- **Network Volume (50 GB, US-TX-3):** kept active so bases (~25 GB downloaded once: SDXL 1.0, Juggernaut, RealVisXL) and AI-Toolkit install persist for future training of next persona. ~$3.50/mo standing cost.
- **Training config archived:** `personas/maya/maya.yaml` — clone for future personas, swap trigger word + dataset path.

**Lessons learned (apply to future personas):**

*Tooling / setup:*
- AI-Toolkit dropped its SDXL example yaml in current versions but the trainer still supports SDXL — write the config from scratch using the Flux-24gb example as structural template, swap `is_flux: true` for `is_xl: true` and use `model.name_or_path: "stabilityai/stable-diffusion-xl-base-1.0"`.
- Dependency dance for SDXL training on RunPod (as of mid-2026): torch **2.6.0+cu124** + torchvision 0.21.0 + torchaudio 2.6.0 + numpy <2.0. Default `pip install torch` grabs torch 2.11+cu13 which mismatches RunPod's CUDA 12.4 driver; `--force-reinstall` to the cu124 wheels.
- HuggingFace cache MUST be redirected to the network volume before any model downloads: `export HF_HOME=/workspace/hf_cache` (also append to `~/.bashrc`). The 20 GB container disk fills up otherwise on the SDXL 1.0 base download.
- Network Volume region locks where pods can run. US-TX-3 has both 4090 + H100 SXM available — pick a region with both for one-volume-covers-Phase-2-and-Phase-3b.
- Don't use Crypto.com Pay for RunPod top-ups — it's app-only and traps you in their ecosystem. Use Stripe Link (card or bank) — there's even a $5 first-time-Link-user discount.

*Data prep:*
- **JupyterLab creates `.ipynb_checkpoints/` folders that get swept into training** if you preview reference images in Jupyter. AI-Toolkit reported "36 images" on Maya's run instead of 31. Delete `.ipynb_checkpoints/` from the training data folder before kicking off training. Use `find /workspace/training_data/<name>/ -type f` to verify.
- Flatten reference shots into one folder for training (`{core,standard,variation}/*.png` glob). The folder structure is for human organization; the trainer ignores it.
- The `_culled/` folder will get swept up by `*/*.png` globs — use explicit brace expansion `{core,standard,variation}` to exclude it.

*Validation:*
- **Don't judge a LoRA by its training-step sample images.** AI-Toolkit samples on the *training* base (plain SDXL 1.0), which has poor photorealism. The real validation is loading the LoRA on production bases (Juggernaut/Lustify/RealVisXL/gonzalomo).
- **LoRA weight is base-dependent.** Same .safetensors wants very different strengths on different bases (gonzalomo wants 60%, Juggernaut wants 80%+). Re-calibrate per base, don't assume one weight works everywhere.
- **Match production base aesthetic to Phase 1's reference-image source.** If your Phase 1 references were generated with Checkpoint X, the LoRA inherits X's aesthetic. Production output looks closest to Phase 1 when you load the LoRA back on X. Mismatched bases lose photorealism (LoRA can encode identity but only weakly transfers style).

*Body / identity steering:*
- **LoRAs average toward dataset majority.** If the training set has body/style variation, default outputs lean toward whichever variant is most-represented. To call up minority variations, both (a) bump LoRA weight 15–20% above default sweet spot, and (b) add explicit prompt tokens that match the visual context where that variation appeared in training (e.g. lingerie/bikini framings for bigger-chest shots).
- For future personas where a specific body trait is critical — pre-bias the dataset rather than fighting it post-hoc. Or use weighted training: `num_repeats: 3` on the folder with the desired trait.

---

## Phase 3 — Video pipeline (RunPod)

**Goal:** produce all 4 content tiers as video, not just images. This is the unlock for the priority-order's #1 requirement.

Two parallel video tools, depending on use case:

### 3a — Image-to-video (general clips, dance replacement)

- Generate persona reference image using the SDXL LoRA + appropriate base
- Feed to **Wan 2.2 I2V** (best general consistency in 2026) or **HunyuanVideo-I2V** (especially good at face holding)
- Output: 2-10 second clips
- **For "replace person in TikTok dance" use case:** feed reference image + driving motion video → persona doing those moves
- **Hardware:** RunPod 4090 sufficient for Wan 2.2 / HunyuanVideo-1.5 (lightweight 8.3B variant)

### 3b — Avatar/talking-head video (vlogs, lip-synced content)

- **HunyuanVideo-Avatar** — specifically designed for character consistency from a reference image
- Pair with **ElevenLabs** voice → lip-synced talking head clips
- **Hardware:** needs RunPod **H100 (40GB+)** at ~$2-3/hr for production quality. H200 SXM5 for longer clips/higher resolution.

**Exit criterion:** can produce all 4 content tiers as video, end-to-end (image → video → cut → caption) in under 1 hour of human time per clip.

**Cost:** ~$15-30 for first session (more with H100 time). Per-clip cost ongoing: $5-10 for quality video.

**Reality check:** video AI in 2026 is meaningfully harder than images. Plan for ~50% reject rate on first 5-10 clips. By video #20, workflow is dialed in. Long-form videos (>10 sec) require stitching — accept slight consistency drift between stitched segments.

---

## Phase 4 — First IG launch (single persona)

**Goal:** prove the funnel before scaling.

- Create the IG account (matches `persona.md`'s declared handle)
- Post daily for 30 days; log every post to `personas/<name>/posts.jsonl` (timestamp, platform, caption, asset path, performance snapshot at +24h and +7d)
- **Per priority order, video > images for IG content** — favor reels/short clips over still posts where production allows
- Disclosure decision: explicit "AI Model" in bio is safer (lower ban risk) but tanks engagement; undisclosed is more lucrative but accept burner-account churn. Document the choice in `persona.md`.
- Track: follower growth rate, engagement rate, DM volume, click-through to bio link

**Exit criterion:** 30 days of consistent posting + a defensible answer to "is this growing?" (e.g., 500+ followers and >3% engagement, or a clear reason to pivot the persona).

**Cost:** $50-100 (compute for daily content, more if video-heavy). **Time:** ~4-6 hr/week of human time once the pipeline is set.

---

## Phase 5 — Monetization funnel

**Goal:** convert IG attention into revenue.

- Set up Fanvue (or current best AI-friendly paid platform — re-research at this stage; the landscape shifts)
- Add bio link / Linktree on IG → paid platform
- Define tiered content:
  - **Free IG/TikTok teaser:** tier-2 semi-provocative video + image
  - **Paid Fanvue subscription:** tier-3 full NSFW image + video, plus exclusive content
  - **Paid custom requests:** generate to fan specifications, charge per piece
- First payouts within 60 days of funnel launch is realistic if Phase 4 cleared its exit criterion

**Exit criterion:** $500+ first month from a single persona. If no, problem is upstream (persona/niche/funnel) — fix before scaling.

---

## Phase 6 — Scale to 3-4 personas

**Goal:** parallelize without proportional time cost.

This is what the `personas/` folder structure is built for. Each persona is a self-contained unit; the pipeline runs once, content distributes to all.

- **Differentiate personas by niche, not just face** — same niche = same audience = cannibalization. Examples: fitness, gamer, alt/goth, "girl next door", cosplay
- **Same priority order applies to every persona** (videos > semi-provocative > NSFW > vlogs)
- Each persona gets its own SDXL LoRA but uses the same shared base models (Juggernaut, Lustify) and video pipeline — efficient resource use
- Batch production: one RunPod session generates a week of content for all active personas (~3-5 hr)
- Stagger launch dates by 2-4 weeks so each persona gets focused attention during its ramp
- Posting can be scheduled (Later, Buffer, Metricool) — not real-time

**Exit criterion:** 3-4 active personas, combined revenue ≥ 3× single-persona Phase 5 baseline, and the human time per week stays under ~10 hours.

**Cost:** ~$80-200/mo compute at this scale (more than original estimate due to video being prioritized).

---

## Risks & realities

| Risk | Mitigation |
|---|---|
| **Platform bans** (IG mass-bans low-effort AI accounts) | Disclosure decision per persona; treat each account as eventually-disposable, keep all content + DMs backed up so a banned account can be relaunched fast |
| **Saturation** — thousands of these exist | Differentiator is niche + lore + posting cadence, not the tech; spend Phase 1 time on persona concept, not just the face |
| **Monetization timing** — first $ is 2-4 months out | Phase 4 exit criterion is the gate; don't sink into Phase 5 if growth signals aren't there |
| **Burnout** — daily posting is real work | Phase 6's batch pipeline is the only sustainable path; if Phase 4 feels grindy with one account, four will not be better |
| **Video quality ceiling** — 2026 video AI still produces obvious failures | Budget extra cloud time for retries; favor short clips (2-5 sec) over long; use HunyuanVideo-Avatar for face-critical work |
| **Legal** — synthetic media + adult content | Stay clear of: real-person likeness (deepfake liability), anything resembling minors (criminal), undisclosed paid promo (FTC). Beyond that, AI personas + adult content is legal in Canada and on Fanvue. |

---

## What this plan does *not* commit to

- A specific persona concept — that's a Phase 1 output (per-persona)
- A specific paid platform — Fanvue is current best guess, re-evaluate at Phase 5
- Hardware purchase — Phase 1 is free, RunPod covers Phase 2-3, only buy a GPU if Phase 5 clears and monthly compute > GPU amortization
- Flux as primary — SDXL is locked for Day 1; Flux can be added per-persona later as a quality upgrade for SFW premium content if revenue justifies

---

## Reference: model stack quick lookup

For when you forget which model does what:

| Need | Model | Where it runs |
|---|---|---|
| Train persona LoRA | AI-Toolkit (SDXL preset) | RunPod 4090 |
| Generate semi-provocative images | persona LoRA + **Juggernaut XL** or **RealVisXL** | RunPod 4090 |
| Generate full NSFW images | persona LoRA + **Lustify** or **Pony Realism** | RunPod 4090 |
| Image-to-video clips | **Wan 2.2 I2V** or **HunyuanVideo-I2V** | RunPod 4090 |
| Talking head / vlog video | **HunyuanVideo-Avatar** + ElevenLabs voice | RunPod H100 |
| Replace person in real video | **HunyuanVideo-Avatar** with motion-driving input | RunPod H100 |
