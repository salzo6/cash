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

## Phase 2.5 — LoRA v2 retrain (deferred, triggered)

**Goal:** cross-base face fidelity. v1 transfers Maya's body across bases but face is locked to gonzalomo aesthetic. v2 unlocks tier-3 NSFW (where Lustify/Pony Realism would produce more competitive paid content) and any future base swaps.

**Trigger conditions** (do v2 when one fires):
- Phase 5 paid-platform launch where gonzalomo NSFW quality is insufficient for converting paying customers
- Audience signal during Phase 4 that single-base output is "too one-note"
- Onboarding a 2nd persona — better to nail the v2 pipeline before scaling
- gonzalomo gets removed from Civitai (defensive: archive a copy of the gonzalomo checkpoint to mitigate this)
- **Image yield rate is unsustainable for production cadence** (e.g., 1 keeper per 20–40 generations) — v1 LoRA's face fidelity floor caps throughput too low to feed Phase 4

### Phase 2.5 status (Maya, as of 2026-05-15) 🟢 v3 trained + validated → over-bake artifact identified → **v3 @ 10% LCM locked as bridge production setting; v4a (drop `train_text_encoder`) planned to lift keeper rate; Phase 4 IG launch not blocked**

**v3 validation session findings (2026-05-13 → 2026-05-15, Mac/Draw Things, no pod cost):**

- Tested 12+ inference configs across LCM (steps 8/16/24, CFG 1.5/2/5, weights 10/40/50/60/70/80/95/100%), DPM++ 2M Karras (CFG 5/7, weights 50/80/95/100%), UniPC (weight 80%), Euler A AYS (weight 80%). Also tested v3 step 2000 checkpoint, v2 LoRA, v1 LoRA with the same engineered prompts.
- **Headline finding: v3 LoRA is over-baked.** Identity signal and a glossy/AI-rendered aesthetic artifact are *entangled in the LoRA weights* — they scale together at inference. No combination of sampler / CFG / steps / weight decouples them.
- **Step count is not the lever.** v3 step 2000 checkpoint produces the same glossy as step 2750 with same identity firing. Training duration ruled out as the over-bake cause.
- **v1 and v2 produce a drifted Maya on gonzalomo** — rounder face, younger, "different person who looks like Maya's family." This is the base-mismatch loss: SDXL-1.0-trained LoRAs lose face fidelity when loaded on gonzalomo. Confirmed by testing v1 and v2 with the same engineered prompts that v3 was tested on — both produce the same drifted person. Bootstraps aren't the source (v1 has no bootstraps).
- **v3 @ 10% weight is the production setting.** At 10% the gloss is minimal AND specific-Maya fires intermittently (~1-2 in 10 with crisp quality). Over-generation strategy (20-30 per shot type, keep the 2-6 specific-Maya hits) is the production cadence. This beats v1/v2 which produce drifted-Maya at any rate, never real Maya.
- **DPM++ 2M Karras incompatible with v3 LoRA.** Produces color shift to pale ("goth chick aesthetic") regardless of CFG. v1-era production sampler is obsolete for v3 production. LCM is the v3 production sampler.
- **Body tokens (`large breasts, busty, fit body`) fight the v3 LoRA.** These weren't in v2/v3 training captions; adding them at inference pushes against the LoRA's encoded body shape, producing chubby/distorted outputs. For chest emphasis, use `cleavage` (which *is* in training captions) via outfit description. Caveat: the no-LoRA gonzalomo prompt-engineering envelope in `prompt_library.md` allows `large breasts, busty` — those rules apply only when LoRA is NOT loaded.
- **Freckle compounding observed.** The preamble's `freckles across nose` + the LoRA's visually-encoded freckles compound into freckle overdose. Worth a future test: drop `freckles across nose` from preamble while keeping the rest. Could be a v4a-era prompt refinement.
- **CFG 5 → 2 on LCM made no visible difference.** CFG isn't the lever either (still recommend LCM textbook 1.5-2 for cleanliness, but it's not the glossy fix).
- **Locked v3 production settings** (see `prompts.md` for full): LCM / 16 steps / CFG 2 / v3 LoRA at 10% weight / gonzalomoXLFluxPony_v40 base / v2 preamble in every prompt / engineered production prompts from `prompt_library.md`.

**v4a plan (next pod session, deferred):**

- **Single-variable change from v3 yaml: `train_text_encoder: true → false`.** Hypothesis: text encoder training is what binds `mayacole_persona` to "gonzalomo aesthetic" at the cross-attention layer. Dropping it lets unet learn visual identity without text-level aesthetic absorption. As a bonus, drops the freckle-overdose since preamble stops being load-bearing.
- Same dataset (v2/v3 56-image set), same base (gonzalomo), same rank 32 + EMA + 2750 steps. Pure isolation.
- Expected: v4a fires identity at moderate weight (40-60%) with much less gloss → higher keeper rate per batch than v3 @ 10%.
- If v4a still glossy → next single-variable: drop EMA (v4b). If still glossy → rank 32 → 16 (v4c). If still glossy → conclude that training a LoRA on a glossy base inherently absorbs gloss and consider IP-Adapter or alternative inference architectures.
- Cost: ~$5 + ~1hr pod. Same checklist as v3.

**Lessons learned (apply to all future LoRA training, in addition to those from v2):**

- **Inference-time tokens MUST be in training captions, OR be aesthetically neutral.** Adding identity/body tokens at inference that weren't in training fights the LoRA. Safe categories: setting, outfit, lighting, lens, pose. Unsafe with LoRA loaded: body shape, identity-related features.
- **Training on a "glossy" base produces a glossy LoRA.** The LoRA's identity adjustments inherit the base's aesthetic at the cross-attention layer. v3's gonzalomo training reproduced gonzalomo's polished-AI tendency at high weights. Fix is upstream (train settings) not downstream (inference).
- **Production weight may be radically different from training-time intuitions.** v1/v2 calibration suggested 50-100% weight ranges. v3's over-bake means production weight is 10% — an order of magnitude lower. Validate weight regimes per LoRA, don't assume.
- **Over-generation is a valid production strategy.** If identity fires intermittently with good quality, over-generation absorbs the noise. 1-2 keepers per 10 is workable for daily IG cadence at $0 marginal generation cost.
- **`max_step_saves_to_keep` is a free experiment.** Intermediate checkpoints retained during training let you test step-count hypotheses without retraining. Verify the volume retains them before terminating the pod (v3 had steps 2000/2250/2500/2750 retained).
- **Drift can come from base-mismatch, not just dataset.** v1 (no bootstraps) and v2 (with bootstraps) both produce the same drifted Maya on gonzalomo. Drift was from training base, not training data. Future personas: match training base to production base from Day 1 (already a v2/v3 lesson — re-emphasized here).
- **A LoRA's "identity captured" reading is confounded by aesthetic artifacts.** If the LoRA has a strong aesthetic side-effect (gloss, color shift), don't claim "identity fires" or "identity drifts" from output evaluation alone. Either test at low weight (where aesthetic is suppressed) or do a side-by-side with another LoRA at low weight to disambiguate.

### Phase 2.5 status (Maya, as of 2026-05-11) 🟡 v2 trained + thoroughly validated → base-mismatch identified → **production base locked (gonzalomo), v3 training ready to run as minimal-change experiment**

**Session 2026-05-10/11 deliverables:**
- Base evaluation across 5 candidate bases (gonzalomo, Juggernaut, RealVisXL, Lustify, miamodel) × 5 scenarios → **gonzalomoXLFluxPony_v40 locked as v3 production base**. Full evaluation in `personas/maya/base_evaluation_results.md`.
- Prompt engineering complete: 3 experiments + 4 ceiling tests + corrective iterations. **Production envelope mapped** — full report in `personas/maya/gonzalomo_prompt_engineering.md`. Net: gonzalomo handles modest IG, full-body (with engineered framing), tier-3 NSFW (sellable), and awkward poses. Hard limits on gym settings (duplicate-subject prior). Production-engineerable on mirror physics + outdoor NSFW after iteration.
- **v3 dataset decision: full v2 dataset (56 images, no changes).** Selected Option C — minimal-change experiment isolating the training base swap as the only variable. Rationale: post-hoc diagnosis ("base mismatch") is plausible but not airtight; if v3 fails roughly the same as v2, we've cheaply falsified that hypothesis with one variable changed instead of two confounded.
- Cumulative lessons (prompt design rules) compiled in `gonzalomo_prompt_engineering.md` end-of-doc section.

**Triggered (2026-05-06):** v1 LoRA produces ~1 acceptable keeper per 20–40 generations, which compounds with Wan 5B Turbo's ~1/8 video keeper rate to make the funnel arithmetically unsustainable. v2 retrain is the upstream fix. Bundled with Wan 14B I2V upgrade in same session — same root cause (throughput ceiling), same hardware, parallelizable cloud time.

**Trained (2026-05-08):** `maya_lora_v2.safetensors` (rank 32, 218 MB) saved at `personas/maya/lora/`. Trained on RunPod RTX 4090 (US-TX-3), 2750 steps with `train_text_encoder: true` + EMA, 1:06:08 wall time. Loss trajectory healthy: hovered 0.05–0.25 mid-run, dipped to 0.0019 at step 2500 (brief memorization), bounced to 0.05 at step 2749 (memorization didn't stick). Backup checkpoints from steps 2250 and 2500 also archived locally for fallback.

### v2 validation findings (Maya, 2026-05-09 — multi-experiment session)

The validation became a hypothesis-testing exercise after v2 quick-check on production bases produced disappointing face fidelity despite the training samples (rendered on SDXL 1.0 by ai-toolkit) looking notably better than v1's. Full diagnostic chain ran across one session, ~50-100 test images, no pod cost (all Mac/Draw Things). Findings:

**Confirmed:**

- **Caption preamble (`mayacole_persona, jet black hair, deep dark brown eyes, freckles across nose, full lips, soft eyeliner, defined jawline,`) is mandatory in production prompts.** Without preamble: 0% recognizable identity on gonzalomo. With preamble: ~100% recognizable as same-person family. The v2 LoRA trained with this preamble in every caption (50× reinforcement); inference without it under-fires the identity tokens. **The current `prompts.md` template doesn't include this preamble — it's still the v1 template. Update before v2 production use.**
- **LoRA weight 50%–100% produces no material change in identity hit rate** on either gonzalomo or SDXL 1.0. v1's "60–78% sweet spot" calibration doesn't apply to v2 (different rank + text encoder training = different curve). **At v2's identity ceiling, weight just modulates expression strength of the same face family — it does not push past family-level into specific-Maya.**
- **Base mismatch is real and significant.** v2 LoRA + SDXL 1.0 base + the trainer's exact sample prompt: ~25% true-hit rate (3-4 of 16 images "really well done") plus most others recognizably-her. v2 LoRA + gonzalomo + same-style prompts: ~5% true-hit rate. (Sample sizes too small to claim precise ratios, but the qualitative gap is consistent.) The training samples on RunPod looked great because they were rendered on SDXL 1.0 — the LoRA's training base. On any other base, identity adjustments get partly absorbed by the new base's face prior.
- **SDXL 1.0 is unusable for production** — bodies look AI-generated, NSFW prompts produce broken anatomy (multiple phones in mirror selfies, missing limbs, deformed hands). It's the LoRA's training partner, not its production partner.

**Implications:**

- v2 LoRA *did* capture Maya's identity meaningfully — it just lives on SDXL 1.0's manifold, not gonzalomo's.
- The v3 retrain must use **the production base as the training base** (not vanilla SDXL 1.0). The LoRA's identity adjustments will then be calibrated for the production base's prior, and the home-base identity fidelity (~25% true hit) should transfer to production output instead of being lost to base mismatch.
- Production base for v3 is **TBD pending base evaluation** — the user has reservations about gonzalomo (over-renders nudity, struggles with full-body framing requests) and wants to test alternatives before committing. See `personas/maya/V3_PLANNING.md` for the base evaluation framework.

**Status of v2 LoRA:**

- v2 + gonzalomo is **acceptable for tier-2 IG-safe content** where face inconsistency matters less in candid casuals (preamble in prompt + 80–100% weight). Use as bridge until v3.
- v2 + gonzalomo is **insufficient for tier-3 NSFW** where face is the focus. Wait for v3.
- v2 backup checkpoints (steps 2250, 2500) archived locally as fallbacks but unlikely to be revisited — the issue is base coupling, not over/undertraining.

**Lessons learned (apply to all future LoRA training, not just personas):**

- **The training base IS the production base.** Don't train on SDXL 1.0 thinking the LoRA will transfer cleanly to a fine-tuned base — it won't. Identity transfer cost is real and significant. ai-toolkit's example yamls default to SDXL 1.0; that default is wrong for any persona destined for a non-SDXL-1.0 production base.
- **Caption-preamble strategy works but is conditional.** If you train with identity tokens in every caption, you must use those same tokens at inference. Drop them in production prompts and the LoRA under-fires. Trade-off: prompts get longer but identity holds; without preamble, identity collapses on out-of-training-distribution bases.
- **Don't trust ai-toolkit's training-step sample images as a proxy for production output.** Samples render on the training base under controlled conditions (matching prompts, fixed seed) — they're best-case scenario. Production output on a different base under varied prompts will be worse, often a lot worse. The "wow these samples look amazing" experience is misleading.
- **Validate identity on the actual training base before declaring a LoRA broken.** If we'd run the SDXL 1.0 + sample-config-prompt test first, we'd have known v2 captured identity in ~2 minutes instead of going through hypothesis A/B/C tests for hours. Default validation protocol going forward: render the trainer's exact sample prompt on the training base FIRST, then test on production bases.
- **Small-N hit-rate percentages are noisy.** "1 of 8" and "5 of 30" have huge confidence intervals; don't use them to make precise claims. Use qualitative pattern descriptions ("LoRA produces a face family but rarely the specific face") and let large-effect signals (0% → 100% recognizable) be the trustworthy ones.

**Dataset built (2026-05-08):** v2 training set assembled at `personas/maya/reference_v2/`. Final composition:

```
core/           9 images   (5 v1 close-ups + 4 cross-base bootstraps from 001)   num_repeats: 2
standard/      35 images   (19 v1 + 16 cross-base bootstraps from 011/012/015/022)
variation/      6 images   (untouched from v1, after culling 023 for face quality)
real_obscured/  6 images   (face-obscured real photos for camera-character regularization)   caption_dropout: 0.10
TOTAL:         56 images / 56 captions
```

- **Cross-base bootstraps:** 5 v1 source images (001 close-up indoor / 011 outdoor park / 012 mirror lingerie / 015 indoor white tank / 022 balcony sunset bikini) × 4 non-original bases (Juggernaut, RealVisXL, Lustify, Mia Model) = 20 outputs. Generated via img2img at per-base calibrated strengths (Juggernaut 45%, RealVisXL 40%, Lustify 30%, Mia 25%) — input pixels carry face identity, new base supplies aesthetic.
- **File naming convention:** bootstraps named `<source_basename>_seed<XXX>.png` to preserve seed-level provenance and group bootstraps next to their source in directory listings.
- **Caption preamble applied:** all 56 `.txt` files lead with `mayacole_persona, jet black hair, deep dark brown eyes, freckles across nose, full lips, soft eyeliner, defined jawline,` — the 50× face-token reinforcement that's the load-bearing third lever of v2's design (alongside rank 32 + `train_text_encoder: true`).
- **Cull:** `023_closeup_indoor_wethair` moved from `variation/` to `reference/_culled/` for face-quality issue. v1 keeper count: 33 → 32.

**Next session:** systematic v2 vs v1 validation across all 3 production bases (Juggernaut, RealVisXL, Lustify). Calibrate per-base v2 LoRA weights (likely differ from v1's calibration since v2 has higher capacity + text encoder training). Update `personas/maya/prompts.md` with v2 settings.

**Pod session 2 surprises (apply to future personas):**

- **Container disk wipes between pod sessions** — ai-toolkit's pip deps must be reinstalled (~3 min): `cd /workspace/ai-toolkit && pip install -r requirements.txt`. The Phase 2 runbook didn't include this.
- **Torch 2.4.1 → 2.6.0+cu124 dance is still mandatory.** The default container ships torch 2.4.1+cu124 which fails on diffusers' newer `attention_dispatch.py` (PEP 604 union annotations not supported by torch 2.4's `_library/infer_schema`). Run the same `pip install --force-reinstall torch==2.6.0 torchvision==0.21.0 torchaudio==2.6.0 --index-url https://download.pytorch.org/whl/cu124` + `pip install "numpy<2.0"` from Phase 2.
- **`ai-toolkit/venv` is dead weight (15 GB).** A venv created in some prior session that's not used by `python run.py` (which resolves to system python). Delete with `rm -rf /workspace/ai-toolkit/venv` to reclaim space. Verify it's not active first via `ps aux | grep python`.
- **`num_repeats` expansion shows in dataset count line** — e.g., trainer reports "Found 18 images" for `core/` even though only 9 unique PNGs exist (because `num_repeats: 2`). Not a bug, expected behavior. The verification command should be `find <folder> -name "*.png" | wc -l` for unique counts.
- **Single-step loss can briefly hit very low values (0.0019)** mid-training without indicating a problem. Look at the rolling pattern, not individual steps.
- **`max_step_saves_to_keep` retains a rolling window** of recent step checkpoints. The final save lands without a step suffix as `<name>.safetensors`. Both formats are usable; use the un-suffixed final unless validation prefers an earlier step.

**Lessons learned (apply to future personas' v2 retrains):**

*Cross-base bootstrap technique:*
- **img2img at low denoise > text2img with LoRA.** Original runbook called for text2img with v1 LoRA across 3 bases. In practice that fights itself — the LoRA pulls outputs back toward source-base aesthetic, defeating the cross-base goal. Better: img2img from existing v1 keepers at 0.25–0.55 strength with NO LoRA. The keeper carries face identity (input pixels), the new base supplies the aesthetic distribution.
- **Per-base strength calibration matters.** Juggernaut tolerates 45% (face-stable), RealVisXL 40%, Lustify 30% (strong default-face prior pulls face away if higher), Mia Model 25%. Calibrate per base; don't apply one strength globally.
- **Drop the Phase 1 `detailed skin texture, skin fuzz, skin pores` tokens for production-base img2img.** Those were tuned for gonzalomo's interpretation. On Juggernaut/Lustify they over-render texture as visible grain artifacts.
- **Same source × different base = same prompt × different base.** For each source image, run the same cleaned prompt across all 4 bases. That's a controlled-variable experiment (same scenario × different aesthetic = the cross-base regularization signal). Varying scenario between bases muddies that signal.
- **Skip same-base bootstraps.** If you bootstrap from a v1 keeper using the same base that produced it, the output adds negligible signal (already covered by the original v1 dataset). Drop those.

*Dataset organization:*
- **Distribute bootstraps by source's existing folder, not by re-classifying image content.** Source-in-`core/` → bootstraps-in-`core/` (gets `num_repeats: 2`). Simpler, preserves training intent.
- **Bootstrap file naming with seed preserves provenance.** `<source_basename>_seed<XXX>.png` lets you re-roll the exact seed if a specific output ever needs investigation, and groups bootstraps with their source in `ls` output.
- **`real_obscured/` captions get the identity preamble too.** Even though faces aren't visible, the preamble ties the image to Maya's identity so the visual signal (real-camera character) gets associated with the trigger word. `caption_dropout_rate: 0.10` (vs 0.05 elsewhere) handles the partial decoupling — 10% of training steps drop the caption entirely, letting raw real-camera character train without trigger contamination.

*Sourcing real_obscured:*
- **Face-obscured ≠ "face partially hidden."** Sunglasses, hand-over-eyes, phone-over-eyes-only all leave the lower face (lips, jawline) visible. Lower face = identity-relevant tokens in your preamble = identity contamination. Hard rule: face must be fully not-readable. Strongest hides: back-of-head, full-side-profile-with-hair, motion blur, phone-fully-covering-whole-face.
- **AI-generated photos defeat the entire purpose.** real_obscured/ exists to dilute synthetic-image character; AI photos add more of it. Test for AI: very plain backgrounds, ideal body proportions, generic "polished IG" feel, perfect bokeh from "real" phones. When in doubt, drop.

**v2 spec changes from v1** (face-transfer focus):

- **Rank 16 → rank 32** — 2× cross-attention capacity, mostly for fine face detail
- **`train_text_encoder: false → true`** — tighter binding between `mayacole_persona` trigger and face features specifically
- **Caption discipline reversal:** v1 followed Phase 1 advice ("describe what varies, not constants"). v2 explicitly **includes identity face tokens in every caption** — `jet black hair, deep dark brown eyes, freckles across nose, full lips, soft eyeliner, defined jawline`. Reinforces face features ~50× through captions, not just visuals.
- **Multi-source training data** — keep all 31 originals + add 10–15 v1-bootstrapped generations on Lustify, Juggernaut, RealVisXL (use v1 LoRA + corrective prompts to produce these, hand-pick keepers) + 5–10 real photos with face cropped/obscured. Total ~50–55 images.
- **Weight close-up shots heavier** — `num_repeats: 2` on `core/` folder so face-detail shots get 2× training signal
- **Steps 2000 → 2500–3000** — more iterations on the larger dataset

**Cost:** ~$5 + ~5 hours human time (most of it in regenerating multi-base references and re-captioning, not the actual training).

**Exit criterion:** generate Maya on Lustify, Juggernaut, RealVisXL with the same prompt and seed family — face is recognizably the same person across all three, indistinguishable from gonzalomo's rendering.

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

### Phase 3a status (Maya, as of 2026-05-08) 🚧 v1 (5B Turbo) working; v2 (14B I2V) blocked on workflow compatibility

**Wan 14B I2V attempt (2026-05-08, second attempt 2026-05-11):** HIGH + LOW bf16 weights + Wan 2.1 VAE + LightX2V LoRA all downloaded to volume (~57 GB combined). Loaded `wanvideo_2_2_I2V_A14B_example_WIP.json` example workflow. After hours of fixing version-skew issues (LoRA path, model loaders, samplers, CFG schedule, VAE swap), generation fails at the patch_embedding layer: model expects 36 input channels but encoder produces 68.

**Initial hypothesis (2026-05-08, NOW DISPROVEN):** the example workflow needs fp8 KJ-quantized model files (`*_fp8_e4m3fn_scaled_KJ.safetensors`), not bf16. Bf16 produces wrong conditioning shape.

**Second attempt (2026-05-11) findings — corrected diagnosis:**
- The `*_fp8_e4m3fn_scaled_KJ` files don't actually exist in `Kijai/WanVideo_comfy` for Wan 2.2 14B I2V — only bf16 versions ship there
- Runtime fp8 quantization (via `quantization: fp8_e4m3fn` setting on Model Loader nodes — without the `_scaled` suffix) works correctly on bf16 source files. Models load and quantize successfully
- Tested with Wan 2.2 VAE (instead of 2.1) AND Wan 2.2-matched LightX2V LoRAs (`Wan_2_2_I2V_A14B_HIGH/LOW_lightx2v_4step_lora_260412_rank_64_fp16.safetensors`) — channel mismatch persists
- Tested with both LoRA Select nodes bypassed entirely — channel mismatch persists, conclusively ruling out LoRA as the cause
- Pipeline successfully completes T5 encoding + VAE encoding (21 latent frames) before failing at the first sampler iteration

**Real root cause:** version-mismatch bug between WanVideoWrapper code (current main branch) and workflow JSON. The `original_patch_embedding` naming in `wanvideo/modules/model.py:2527` hints there's an I2V-specific replacement embedding that should accept the 68-channel I2V-conditioned input, but the wrapper code is calling the original (T2V?) patch_embedding instead. Not solvable from the ComfyUI UI — needs either a wrapper code fix, an older wrapper commit that matches the workflow, or a different workflow that matches the current wrapper.

**Status:** Wan 14B I2V remains blocked. **Wan 2.2 5B Turbo was deleted from the volume during the 2026-05-11 cleanup at user request** ("don't like 5B, never use in production"). **Wan video pipeline is currently non-functional for production.** Phase 4 IG launch can proceed with image content; video unblocked only when Wan 14B is solved or Wan 2.1 14B is set up as fallback.

**Path forward for next Wan session (see `feedback_wan_14b_workflow.md` for full diagnostic):**
1. Search WanVideoWrapper GitHub issues for the specific 36-vs-68 channel mismatch
2. Try checking out an older WanVideoWrapper commit pinned to the workflow's last-modified date
3. Try `wanvideo_2_1_14B_I2V_example_03.json` workflow + Wan 2.1 14B fp8 files as fallback (older but functional, fp8 variants exist for 2.1 unlike 2.2)
4. Check if Kijai has uploaded actual fp8 KJ files for Wan 2.2 14B since 2026-05-11

### Phase 3a v1 status (Maya, as of 2026-05-06) 🚧 v1 pipeline working, quality tuning ongoing

- **ComfyUI + Wan 2.2 5B Turbo I2V pipeline installed on the existing US-TX-3 network volume.** Custom nodes: WanVideoWrapper (kijai), VideoHelperSuite, KJNodes. Models: Wan 2.2 5B Turbo fp16 (10 GB), umt5-xxl text encoder fp8 (6.3 GB), Wan2_2 VAE bf16 (1.4 GB) — all from `Kijai/WanVideo_comfy` on HF.
- **First end-to-end clip generated.** Image → video → MP4 saved to `/workspace/ComfyUI/output/`. Pipeline works, but first clip showed classic over-CFG failure mode (overcooked / uncanny smile). Recalibrated settings (CFG=5→1, base_precision fp16_fast→fp16, attention_mode sageattn→sdpa, steps 30→6) improved output substantially.
- **Operational doc written:** `personas/maya/PHASE3a_SETUP.md` — captures spin-up commands, all known-good workflow settings, OOM mitigations, and gotchas. Read this before next session to skip the rediscovery cost.
- **Pod terminated** at session end. Volume + models persist (~$3.50/mo). Container-side pip + ffmpeg get reinstalled in ~5 min next session.
- **Total spend:** ~$3–5 on GPU pod time. Well under the $15–30 budget.
- **Outstanding:** save the tuned workflow JSON to repo (skip per-session fix-all-settings), generate 5–10 validation clips, test tier-3 NSFW path. Phase 3b (HunyuanVideo-Avatar / talking head) deferred until tier-2/3 pipeline is reliably producing.

**Lessons learned (apply to future personas):**

*Tooling / setup:*
- **Set both `8888,8188` as exposed HTTP ports at pod creation** — editing post-deploy forces a container reset, which wipes all pip-installed packages and means redoing the install. Painful gotcha; cost us a 5-min redo in this session.
- **CPU pods aren't deployed in every region.** US-TX-3 specifically has none, so the "cheap CPU pod for downloads" optimization doesn't apply when network volume is locked to that region. Just use the cheapest GPU pod available — the cost difference (~$0.06 vs $0.17/hr) is trivial for a 20-min download.
- **`huggingface-cli` is deprecated;** newer HF library uses `hf download ...`. Same flags otherwise.
- **HF_HOME redirect is still mandatory** to avoid filling the container disk during model downloads. Same gotcha as Phase 2.
- **Never paste tokens into URLs that touch a filesystem.** A fat-fingered `git clone https://<TOKEN>@github.com/...` created a folder named after the entire URL string in this session. Token had to be revoked. Use env vars (`export GH_TOKEN=...`) or SSH keys.

*Model selection:*
- **Kijai's `WanVideo_comfy` HF repo doesn't have the canonical base 5B model** — only finetuned variants (`Wan22-Turbo`, `FastWan`). Turbo is a fine starting point because it's calibrated for 4–8 step generation, which means cheaper per-clip GPU time. But its settings differ from the example workflow's defaults — see PHASE3a_SETUP.md.
- **Use fp8-quantized text encoder** (`umt5-xxl-enc-fp8_e4m3fn`, ~6 GB) instead of bf16 (~10 GB) — saves 5 GB on the volume with negligible quality loss. Same approach worth applying to other models if storage gets tight.

*Workflow gotchas:*
- **Example workflow defaults assume torch 2.7+ nightly.** `base_precision: fp16_fast` errors on torch 2.4.1 stable. Change to `fp16`. Will need re-checking when ComfyUI base images bump torch versions.
- **Example workflow defaults to `attention_mode: sageattn`** but the `sageattention` package isn't installed by default. Change to `sdpa` (PyTorch built-in). Sage installation is an optional speed boost worth doing later.
- **Example workflow's hardcoded model filenames don't match Kijai's repo paths.** ComfyUI shows "missing models" errors on first load. The in-UI "Use from Library" dropdowns let you remap without editing JSON.
- **The `Resize Image v2` node is hardcoded to 1024×1024** — output is square unless you change it. For IG/TikTok reels, set `720×1280`. For matching SDXL stills natively, `832×1216`.

*Quality tuning:*
- **CFG=1 is critical for Turbo distilled models.** CFG > 1 produces overcooked, plastic, "creepy AI" output — the model's distillation already bakes the CFG behavior into a single forward pass, so adding more on top is double-applying. Single biggest quality fix.
- **Avoid facial expression changes in motion prompts.** "Slight smile" → uncanny morphs. Postural motion (breathing, hair, head turn) animates cleanly; expression changes don't.
- **Identity drift scales with clip length** — 3 sec drifts noticeably less than 5 sec. Stitching short clips beats one long clip for posts >10 sec.
- **End-frame trick:** generate with motion *away from* the pose, then reverse the MP4 (`ffmpeg -vf reverse -af areverse`). Reads as motion converging on the pose.

*Memory:*
- **24 GB VRAM (4090) is at the edge for Wan 2.2 5B at 720p × 121 frames.** OOM warnings appeared during this session. Lower `num_frames` to 81 (3.4 sec instead of 5) or drop resolution to 624×1104 if recurring. GGUF quantized version of the main model would also halve diffusion-model VRAM (~5 GB instead of 10 GB).
- **The `total RAM 515792 MB` line in ComfyUI startup logs is misleading** — that's the *host machine's* total, not the pod's allocation. Don't infer the pod has 500+ GB RAM.

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
