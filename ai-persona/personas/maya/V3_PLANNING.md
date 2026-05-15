# LoRA v3 Planning — `maya`

Pre-work for the v3 retrain. v2 validation (2026-05-09) confirmed a base-mismatch issue: v2 captures Maya's identity well on its training base (SDXL 1.0) but loses fidelity on production bases. The fix is straightforward — train v3 with the production base as the training base — but the production base itself is now an open question.

For the why behind this, see `ai-persona/PLAN.md` Phase 2.5 status section, "v2 validation findings."

---

## Status (2026-05-15) — v3 trained + validated; v3 @ 10% LCM locked as bridge; v4a planned

- ✅ v3 LoRA trained on RunPod RTX 4090, full v2 dataset, gonzalomo base, 2750 steps (per Option C plan)
- ✅ **v3 validation complete (2026-05-13 → 2026-05-15)** — see "v3 validation findings" section below
- ✅ **Production setting locked:** v3 LoRA @ 10% weight, LCM 16 steps, CFG 2, gonzalomo base, over-generation strategy (20-30 per shot type → 2-6 specific-Maya keepers)
- ✅ Phase 4 IG launch NOT blocked — bridge production works for daily IG cadence
- 🚧 **v4a planned (deferred):** single-variable retrain from v3 yaml: `train_text_encoder: true → false`. Hypothesis: text encoder training is what binds Maya's identity to gonzalomo's aesthetic at the cross-attention. Dropping it should produce identity firing without the over-bake/gloss, lifting keeper rate from 10-20% to materially higher.

---

## v3 validation findings (2026-05-13 → 2026-05-15)

### Method

Tested v3 LoRA on Mac/Draw Things across 12+ inference configurations:

| Round | Configs | Variable swept |
|---|---|---|
| 1 | A-G (7 configs) | Sampler + weight matrix: LCM at 60/80/100%, DPM++ 2M Karras at 80/95/100%, Euler A AYS at 80% |
| 2 | H-K (4 configs) | Prompt fix re-baseline + alternative samplers: LCM 16/24 steps at 80%, DPM++ at 50% (low weight), UniPC at 80% |
| 3 | L-O (4 configs) | CFG sweep: LCM at CFG 1.5/2 + DPM++ at CFG 7 |
| 4 | Step 2000 checkpoint | Training-duration test |
| 5 | v1 + v2 side-by-side | Drift disambiguation |

All on gonzalomo base, same engineered prompt structure (Tier-3 NSFW lingerie lying on bed, 832×1216), same negative.

### Findings

**Identity + aesthetic are entangled in the v3 LoRA.** The glossy/AI-rendered artifact scales WITH the LoRA's influence at inference. Lower weight = less artifact AND less identity. There's no inference setting that decouples them. Confirmed across all of: sampler family, sampler steps, CFG, LoRA weight.

**Step count is not the lever.** Step 2000 checkpoint produces identical glossy at identical identity firing as step 2750. Over-bake-by-training-duration hypothesis is dead. (Volume's `max_step_saves_to_keep: 4` retained steps 2000/2250/2500/2750 — free experiment, no retrain needed.)

**DPM++ 2M Karras is incompatible with v3.** Across CFG 5 and CFG 7, all weights, DPM++ produces a pale/washed-out color shift AND fails to fire identity. v1-era locked production sampler is obsolete. LCM is the v3 production sampler.

**Body tokens fight the v3 LoRA.** Initial test prompt had `large breasts, busty` (lifted from `prompt_library.md`'s no-LoRA gonzalomo envelope). Result: chubby distorted body + face. These tokens weren't in v2/v3 training captions; adding them at inference pushes against the LoRA's encoded body shape. Removed → body normalizes. **For chest emphasis use `cleavage` (in training captions) via outfit description**, e.g., `wearing a black tank top with cleavage`.

**v1 and v2 produce the same drifted Maya on gonzalomo.** Tested v2 with the same engineered prompt that v3 was tested on → crisp images but face is "rounder, younger, slightly less attractive than reference — a different person who could pass for Maya's family." Tested v1 with same → indistinguishable from v2. **The drift is base-mismatch (SDXL-1.0 trained LoRA + gonzalomo inference base), not dataset.** v3 was the only LoRA that fired specific-Maya, because v3 trained on gonzalomo.

**Disambiguation: v3 at 10% is the production setting.** At 10% weight the gloss is minimal, image quality is production-grade, and specific-Maya fires ~1-2 in 10 with crisp quality. Other 8-9 of 10 are family-level (drifted-ish) but acceptable as discards. Over-generation strategy: 20-30 per shot type, keep the 2-6 specific-Maya hits.

**v3 @ 10% beats v1/v2.** v1/v2 produce drifted-Maya 100% of the time at any weight — wrong person, just consistently the same wrong person. v3 @ 10% produces real Maya 10-20% of the time. Real Maya at lower rate > drifted Maya at higher rate, for Phase 4 IG / Phase 5 paid.

**Freckle compounding (open finding).** The v2 preamble's `freckles across nose` token + the LoRA's visually-encoded freckles produce freckle overdose. Worth a future test: drop `freckles across nose` from preamble while keeping the rest of the preamble. Defer until v4a so we test on a cleaner LoRA.

### Locked v3 production settings

- **LoRA:** `maya_lora_v3.safetensors` @ **10% weight**
- **Base:** gonzalomoXLFluxPony_v40
- **Sampler:** LCM
- **Steps:** 16
- **CFG:** 2
- **Resolution:** per shot type — see `prompt_library.md`
- **Prompt:** v2 preamble (`mayacole_persona, jet black hair, deep dark brown eyes, freckles across nose, full lips, soft eyeliner, defined jawline, gonzalomo-amateur, ...`) + engineered production prompts from `prompt_library.md`
- **Strategy:** over-generate 20-30 per shot type → discard drifted hits, keep 2-6 specific-Maya
- **DO NOT use** with v3 LoRA loaded: `large breasts, busty, fit body`, or other body-shape tokens not present in training captions

### Decision tree updated

Original brief's tree:
- Identity holds clearly across seeds + samplers → ship → **partial match**: v3 fires identity but only stochastically at low weight
- Identity better than v2 but not great → ship as bridge → **MATCH** — this is the chosen branch
- Identity comparable to v2 (~5%) → base-mismatch was wrong → not the case (base-mismatch fix did work, just brought a side-effect)

Result: v3 ships as the bridge production LoRA at 10% weight. v4a planned to upgrade.

### v4a plan

**Single-variable change from `maya_v3.yaml`:**

```yaml
network:
  train_text_encoder: false  # was: true
```

Everything else identical to v3 (same 56-image dataset, same gonzalomo base, same rank 32 + EMA + 2750 steps + caption preamble in every training caption).

**Hypothesis:** text encoder training is the mechanism that bound Maya's identity to gonzalomo's aesthetic at the cross-attention layer. With text encoder frozen, the unet still learns visual identity from the images, but `mayacole_persona` doesn't get aesthetically loaded with "gonzalomo-style." Result should be: identity fires at moderate weight (40-60%) WITHOUT the gloss. Keeper rate jumps materially above v3 @ 10%'s 10-20%.

**Bonus expected:** the freckle-overdose stops, because the preamble is no longer load-bearing (the LoRA learns identity purely visually). Preamble may become optional or even reductive for v4a.

**Cost:** ~$5 + ~1hr pod. Container setup per Phase 2.5 lessons (torch 2.6.0+cu124, HF_HOME redirect, ai-toolkit reinstall).

**Fallback ladder if v4a still glossy:**
1. v4b — drop EMA (single variable from v4a)
2. v4c — rank 32 → 16 (single variable from v4b)
3. v4d — re-examine dataset (drop bootstraps, see if pure-original dataset on gonzalomo produces clean LoRA)
4. v4e+ — conclude that training-on-glossy-base inherently produces glossy-LoRA and explore IP-Adapter or alternative architectures

### What we keep (no changes needed)

- v3 dataset is fine — drift wasn't from data
- v2 preamble strategy is fine — preamble is mandatory for v3, expected to be optional/neutral for v4a
- Engineered production prompts (5 shot types) in `prompt_library.md` are validated for the no-LoRA + v3 LoRA cases
- gonzalomo as production base is confirmed

---

## Status (2026-05-11)

- ✅ v2 LoRA exists, validated, base-mismatch root cause identified
- ✅ v2 dataset (56 images, captions with preamble) is on the RunPod volume at `/workspace/training_data/maya_v2/` — **reuse as-is for v3 (no rebuild — see dataset decision below)**
- ✅ Trainer config `maya_v2.yaml` works — clone + change `model.name_or_path` for v3
- ✅ **Production base locked: gonzalomoXLFluxPony_v40** (base evaluation completed 2026-05-10; full evaluation results in `base_evaluation_results.md`)
- ✅ **Dataset decision: full v2 dataset (Option C — minimal-change experiment)** — see "Dataset decision" section below
- ✅ Prompt engineering complete (3 experiments + 4 ceiling tests; full report in `gonzalomo_prompt_engineering.md`)
- 🚧 **v3 training: ready to start** — blocked only on getting gonzalomo checkpoint onto the RunPod volume

---

## Dataset decision (2026-05-11)

After completing base evaluation and locking gonzalomo, considered three dataset options:

| Option | Dataset | Risk profile |
|---|---|---|
| A | v1 originals only, drop bootstraps (32-38 images) | Highest — two confounded variables (base + dataset), approaches SDXL LoRA dataset floor |
| B | Drop Juggernaut/Lustify/Mia bootstraps, keep RealVisXL (~41 images) | Mid — partial cleanup, partial isolation |
| **C (selected)** | **Full v2 dataset (56 images, bootstraps included)** | **Lowest — only one variable changes (the training base)** |

**Why Option C:** v2's failure was diagnosed as base-mismatch but the diagnosis is post-hoc and not airtight. If v3 changes both training base AND dataset, we can't distinguish which fix did the work (or which broke things). Option C isolates the base swap as the only variable. If v3 succeeds, we know base-mismatch was the load-bearing problem. If v3 fails roughly the same way, we've cheaply falsified the base-mismatch hypothesis and can look at the next suspects (dataset diversity, hyperparameters, SDXL architectural ceiling for face fidelity).

**Cost of being wrong is small** — training is ~1 hour and $3-5. Worth the experimental rigor over a guess.

---

## Step 1 — Base evaluation session (next session)

**Goal:** pick the production base before committing to v3 training.

**Why this matters:** v3's identity-fidelity ceiling is set by what base it's trained against. If we pick gonzalomo and gonzalomo turns out to have unfixable production limits (e.g., over-rendering nudity, bad full-body framing), we're stuck. Better to spend a session evaluating bases now than retraining a v4 because v3 was trained on the wrong base.

### Bases to evaluate

Test each on a fixed scenario set (below). Note these are baseline tests — Maya LoRA NOT loaded. We're evaluating the bases' raw production capability.

| Base | Why it's a candidate | Known concerns |
|---|---|---|
| **gonzalomoXLFluxPony_v40** | Currently-locked v1 production base, photorealism matches Phase 1 references | Over-renders nudity (tits show in supposedly-modest prompts); struggles with full-body framing; weak prompt-following on complex scenes |
| **Lustify** | Original tier-3 NSFW pick in PLAN.md; never validated for Maya v1 | Untested for Maya, but Pony-derived → similar prompt-following limits as gonzalomo |
| **Juggernaut XL v9** | Strong prompt-following, polished aesthetic, validated for v1 at 80-95% weight | "AI portrait" fingerprint — tends to look glamour-glossy even with anti-glamour negatives |
| **RealVisXL v4** | Best photoreal aesthetic, validated for v1 at ~91% | Lighting skews harsh, can feel "candid in a bad way" |
| **(other Pony-derived NSFW bases)** | If gonzalomo doesn't work, room to try alternatives | TBD via Civitai/HuggingFace browse |
| **(SDXL fine-tunes for full-body)** | If Juggernaut/RealVisXL don't handle full body well, look for fine-tunes specifically marketed for full-body framing | TBD |

### Test scenarios (run each base against all)

Pick scenarios that stress the user's specific gonzalomo pain points + production must-haves:

1. **"Modest IG selfie, fully clothed"** — explicit "wearing oversized hoodie, no skin showing" prompt. Tests: does the base honor modest-clothing requests, or does it over-render skin?
2. **"Full body shot, standing, casual"** — explicit "full body shot from across the street, head to toe visible." Tests: does the base actually frame full-body or zoom into upper body / cut off limbs?
3. **"Tier-2 mirror selfie"** — modest clothing, complex composition. Tests: hands holding phone, mirror reflection, casual pose. Composition quality.
4. **"Tier-3 lingerie shot"** — explicit pose + outfit + body framing. Tests: NSFW handling, anatomy, hands, no spurious phones / extra limbs.
5. **"Outdoor full body, golden hour"** — outdoor lighting + full body + scene context. Tests: lighting variety + framing.

### Methodology

- Same prompt structure across all bases (with base-specific tokens dropped/added — e.g., `gonzalomo-amateur` only for gonzalomo)
- Random seeds, **5–8 images per base per scenario** (so 25–40 images per base, 5 bases × 5 scenarios × 5–8 = 125-200 images)
- **No LoRA active** — testing base capability, not LoRA + base interaction
- Mac/Draw Things — free, no pod needed
- Score qualitatively per scenario per base (1–5 scale or just notes), record in a comparison table

### Decision criteria

Pick the base that:
1. Has the highest aggregate quality across the 5 scenarios (no glaring failures)
2. Specifically does NOT have the gonzalomo pain points the user called out (over-rendering nudity, full-body framing failures)
3. Has photorealism that's plausibly matchable to Maya's existing reference images (so the v3 LoRA's identity adjustments will produce visually-consistent outputs)
4. Has reasonable Civitai/HF availability + license clarity (commercial use OK if Phase 5 is on the horizon)

If no single base wins all 5 scenarios, consider **two production bases for different content tiers** — e.g., one for tier-2 IG-safe (Juggernaut?), one for tier-3 NSFW (Lustify or gonzalomo). This means training **two v3 LoRAs**, one per base. More cost, more discipline, but bypasses the "one base must do everything" trap.

---

## Step 2 — v3 training (next session)

Production base locked (gonzalomo), dataset locked (full v2), only the trainer config needs the one-line change.

**Pre-training checklist:**
1. **Get gonzalomo onto the RunPod volume.** It's not there yet — the volume currently has SDXL 1.0, Juggernaut, RealVisXL. gonzalomo lives in Draw Things on the Mac. Two paths:
   - Download fresh from Civitai once the pod is running (easiest if Civitai allows; may need login)
   - Upload from Mac via pod storage interface (guaranteed but slower for a ~6GB file)
2. **Verify v2 dataset is intact at `/workspace/training_data/maya_v2/`** — quick `find /workspace/training_data/maya_v2 -name "*.png" | wc -l` should return 56.

**Training steps:**
1. Clone `maya_v2.yaml` → `maya_v3.yaml`, change one line:
   ```yaml
   model:
     name_or_path: "/workspace/hf_cache/gonzalomoXLFluxPony_v40.safetensors"  # was: "stabilityai/stable-diffusion-xl-base-1.0"
   ```
2. **Everything else stays identical to v2:** same 56-image dataset, same `mayacole_persona` trigger, same caption preamble strategy, same rank 32 + `train_text_encoder: true` + EMA, same 2750 steps.
3. **Container setup:** redo the torch 2.6.0+cu124 dance per Phase 2.5 lessons (`pip install --force-reinstall torch==2.6.0 torchvision==0.21.0 torchaudio==2.6.0 --index-url https://download.pytorch.org/whl/cu124` + `pip install "numpy<2.0"`). Re-export `HF_HOME=/workspace/hf_cache`. Reinstall ai-toolkit deps (`cd /workspace/ai-toolkit && pip install -r requirements.txt`).
4. **Run training.** Expect ~1 hr wall time on RTX 4090.
5. **Download `.safetensors` to local `personas/maya/lora/maya_lora_v3.safetensors`.**

**Validation order after training:**
1. **Trainer's exact sample-config prompt on gonzalomo WITH v3 LoRA, 16 seeds** — this is the "did the LoRA capture identity on its native base" test. Compare to v2's ~25% true-hit rate on SDXL 1.0. If v3 hits similar or higher on gonzalomo, base-mismatch hypothesis confirmed.
2. **Re-run the 3 prompt engineering experiments** (full-body framing, NSFW lingerie standing, mirror physics) WITH v3 LoRA loaded — confirm the engineered prompts still work with LoRA active, calibrate LoRA weight per scenario.
3. **Re-run select ceiling tests** (scenario 4 NSFW full body, scenario 7 outdoor NSFW corrective) with v3 LoRA — see if LoRA improves or regresses the production envelope.

**Cost estimate:** ~$3-5 for training + ~$0.50-2 for the gonzalomo download (Civitai or upload time).

---

## Step 3 — Update production prompts

Once v3 LoRA is validated:

1. **Update `prompts.md`** with v3-specific weight calibration (per-base sweet spot — likely different from v1 and v2)
2. **Lock the v3 preamble in the prompt template** (same identity tokens as v2 unless we change caption strategy for v3)
3. **Test tier-3 NSFW production capability** — the gating question for Phase 5 is whether v3 produces sellable paid-platform content reliably

---

## Open questions to resolve during base evaluation

- Does any base consistently honor "modest, fully clothed" prompts when explicitly asked? (If no base does, we have a deeper SDXL ecosystem problem — might need IP-Adapter or face-restore at inference instead of/in addition to LoRA.)
- Is Lustify worth the extra setup for tier-3, or does gonzalomo + careful prompting cover both tiers well enough?
- Should we test **IP-Adapter** as a no-train alternative? Adds face conditioning at inference time. Could potentially close the v2 base-mismatch gap without retraining. ~30 min test in Draw Things.

---

## What we keep from v2 (do NOT re-derive)

- The 56-image dataset at `personas/maya/reference_v2/` (and on the volume at `/workspace/training_data/maya_v2/`)
- Caption preamble strategy (`mayacole_persona, jet black hair, deep dark brown eyes, freckles across nose, full lips, soft eyeliner, defined jawline,`) in every caption
- Rank 32 + `train_text_encoder: true` + EMA + 2750 steps as starting hyperparameters
- The `maya_v2.yaml` template (clone for v3)

## What changes for v3

- **Only `model.name_or_path`** in the trainer yaml — points to a local copy of the chosen production base instead of `stabilityai/stable-diffusion-xl-base-1.0`
- Possibly: per-base step count tuning (2750 → 3500 if a more complex base needs more iterations)
- Possibly: two LoRAs trained in parallel if we go dual-base
