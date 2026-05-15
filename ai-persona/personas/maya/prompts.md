# Prompts — `maya`

The locked prompt formula for Maya Cole. Update as you iterate; this file is the source of truth for what gets generated.

---

## Identity tokens (Phase 2 — mostly redundant now)

The Maya LoRA encodes identity. These tokens are no longer required, but including them as anchors doesn't hurt and can help on bases that need extra steering.

```
1girl, solo, fair skin, detailed skin texture, skin fuzz, skin pores, black hair, parted on the side hair, black eyes, eyeliner, fit body
```

Note: dropped `medium breasts` from the locked block — chest size is steerable per-shot (see body steering below).

---

## Style tokens

The aesthetic / camera / lighting fingerprint. Goes in every prompt, before the variation tokens.

```
amateur photo, photorealism, photorealistic
```

---

## Trigger words

Two triggers, both useful. Lead the prompt with both.

- **`mayacole_persona`** — the Maya LoRA's identity trigger. **Required** in every prompt for the LoRA to express her face.
- **`gonzalomo-amateur`** — the trigger for the **gonzalomo SDXL checkpoint** (NOT a LoRA, despite earlier confusion). Activates gonzalomo's amateur-photo aesthetic when that's the base model. Drop this token if base is Juggernaut/RealVisXL/Lustify.

---

## Body steering (chest size)

**Rule with v3 LoRA loaded:** do NOT add `large breasts, busty, huge breasts, fit body` or other body-shape tokens. They weren't in v2/v3 training captions, so they fight the LoRA's encoded body shape and produce chubby/distorted outputs. Confirmed during 2026-05-13 v3 sampler sweep (Round 1) — the entire first round was confounded by this exact bug.

**For chest emphasis with v3 LoRA:** use `cleavage` via outfit description. It IS in training captions ("wearing a black tank top with cleavage and bare shoulders" appears repeatedly). Examples:
- `wearing black lace lingerie with cleavage`
- `wearing a fitted dark tank top with cleavage and bare shoulders`

**Legacy (v1, deprecated, only relevant if you're testing v1 or a no-LoRA workflow):**
- v1 LoRA averaged toward medium chest. Bigger required `large breasts, busty` + weight bump to 75-80%. v1 is deprecated for production (drifted face on gonzalomo).
- No-LoRA gonzalomo + `large breasts, busty` works (per `prompt_library.md` production envelope) — those rules apply only when LoRA is NOT loaded.

---

## Negative prompt (always include)

```
cartoon, illustration, anime, painting, 3d render, cgi, low quality, blurry, deformed, asymmetric eyes, lazy eye, distorted face, deformed face, airbrushed skin, plastic skin, extra fingers, extra limbs, bad hands, malformed fingers, watermark, text, signature, logo, username
```

---

## Locked production settings (Phase 2.5 — v3 @ 10% bridge, as of 2026-05-15)

**Production combo:**

- **LoRA:** `maya_lora_v3.safetensors` at **10% weight**
- **Base:** `gonzalomoXLFluxPony_v40`
- **Sampler:** **LCM**
- **Steps:** **16**
- **CFG:** **2**
- **Resolution:** per shot type — see `prompt_library.md` Engineered production prompts section
- **Strategy:** over-generate 20-30 per shot type → keep the 2-6 specific-Maya hits → discard the family-level drifted hits

**Why low weight:** v3 LoRA is over-baked. At weights ≥ 60% identity fires reliably but a glossy/AI-rendered aesthetic artifact dominates (entangled with identity in the LoRA weights — no inference setting decouples them). At 10% the LoRA's influence is subtle enough to avoid the gloss while still firing specific-Maya intermittently (~1-2 in 10 with crisp quality). This is a bridge — **v4a retrain planned** (drop `train_text_encoder: true → false`) to fix the over-bake and lift keeper rate. See `V3_PLANNING.md` for v4a plan.

**Identity preamble is mandatory.** Lead every prompt with the v2 preamble (carried into v3 because v3 trained on the v2 dataset with the preamble in every caption):

```
mayacole_persona, jet black hair, deep dark brown eyes, freckles across nose, full lips, soft eyeliner, defined jawline, gonzalomo-amateur,
```

Drop `gonzalomo-amateur` if testing on a non-gonzalomo base. (Not applicable for current production — gonzalomo is the only validated base for v3.)

**Body tokens to AVOID with v3 LoRA loaded:** `large breasts`, `busty`, `huge breasts`, `fit body`, etc. See "Body steering" section above for the full rule.

**Open finding to test on v4a:** the preamble's `freckles across nose` compounds with the LoRA's visually-encoded freckles into overdose. Defer testing freckle-drop until v4a so we test on a cleaner LoRA.

### Deprecated bases / LoRAs / samplers

**v1 LoRA** (`maya_lora_v1.safetensors`) — produces a drifted Maya on gonzalomo (rounder face, younger, slightly different person). Base-mismatch artifact: trained on SDXL 1.0, identity gets pulled by gonzalomo's face prior at inference. Confirmed 2026-05-15. Don't use for production.

**v2 LoRA** (`maya_lora_v2.safetensors`) — same drift as v1 on gonzalomo (bootstraps weren't the source of drift; base-mismatch is). Confirmed 2026-05-15. Don't use for production. Backup checkpoints at steps 2250 and 2500 retained locally but not useful since the issue is base-coupling, not training duration.

**DPM++ 2M Karras + v3 LoRA** — incompatible. Produces color shift to pale ("goth chick aesthetic"), doesn't fire identity at any tested weight. v1-era locked sampler is obsolete for v3 production. LCM is the v3 sampler.

**Juggernaut XL / RealVisXL / Lustify with v3 LoRA** — not currently tested for v3. gonzalomo is the only validated v3 production base because v3 was trained on gonzalomo. Cross-base validation deferred (likely deferred to v4a or beyond — the base-coupling lesson means we'd expect v3 to drift on non-gonzalomo bases the same way v1/v2 drift on gonzalomo).

---

## Full prompt template

### v3 LoRA (current production, 2026-05-15)

```
mayacole_persona, jet black hair, deep dark brown eyes, freckles across nose, full lips, soft eyeliner, defined jawline, gonzalomo-amateur, amateur photo, photorealistic, [VARIATION TOKENS HERE]
```

Preamble is **mandatory** — v3 trained on v2 dataset with this preamble in every caption (50× reinforcement). Inference without it under-fires identity.

**Settings:** v3 LoRA @ 10% weight, LCM 16 steps, CFG 2, gonzalomo base. See "Locked production settings" above.

**Do not add** body-shape tokens (`large breasts`, `busty`, `fit body`, etc.) — they fight the LoRA. For chest emphasis use `cleavage` via outfit description. See "Body steering" section.

**Open finding (defer to v4a):** `freckles across nose` in preamble + LoRA-encoded freckles compound into freckle overdose. Acceptable for current bridge production; will be tested on v4a.

### v2 LoRA (deprecated — drifted face on gonzalomo)

```
mayacole_persona, jet black hair, deep dark brown eyes, freckles across nose, full lips, soft eyeliner, defined jawline, gonzalomo-amateur, [optional: large breasts, busty], amateur photo, photorealism, photorealistic, [VARIATION TOKENS HERE]
```

Same preamble as v3. v2 produces crisp output but identity is the drifted-Maya (rounder, younger, slightly different person) due to base-mismatch (trained on SDXL 1.0). Don't use for production. Kept for reference / future re-test if a new alternative base emerges.

### v1 LoRA (legacy, deprecated)

```
mayacole_persona, gonzalomo-amateur, [optional: large breasts, busty], amateur photo, photorealism, photorealistic, [VARIATION TOKENS HERE]
```

No preamble (v1 trained pre-preamble strategy). Produces the same drifted-Maya as v2 on gonzalomo. Don't use for production.

---

## Shot variations

A library of prompt fragments to combine with the locked block. Add to this as you discover what works.

### Selfies (LoRA's strongest domain)

- *selfie, 24mm lens, upper body, [setting], [outfit], [lighting], [expression]*
- *mirror selfie, full body, holding phone, [setting], [outfit], [lighting]*
- *bathroom mirror selfie, waist up, holding iphone, [outfit], harsh overhead vanity lighting*
- *car selfie, sitting in driver seat, seatbelt visible, [outfit], soft natural daylight*

### Candid / non-selfie (drop `selfie`, `24mm lens`, `looking at viewer`)

- *full body shot, walking down [setting], candid photo from across the street, [outfit], looking ahead not at camera*
- *sitting at coffee shop table, candid photo, holding coffee cup, [outfit], looking out window*
- *standing at kitchen counter, [activity], candid photo, [outfit], soft morning light*
- *side profile, standing by window, looking outside, [outfit], soft window light*
- *full body shot, photographed from straight on, against textured wall, hand on hip, [outfit]*

### Settings to rotate

bedroom · bathroom · kitchen · living room · coffee shop · gym · car · pool · beach · outdoor street · park trail · forest

### Outfits to rotate

black tank top · oversized white t-shirt · grey hoodie · cream sweater · fitted black turtleneck · sports bra and leggings · white linen sundress · black bikini · black lace lingerie · oversized button-up

### Lighting to rotate

soft morning light through window · golden hour warm backlight · harsh overhead lighting · dim evening lamp light · bright midday sun · warm indoor café lighting · dappled sunlight through trees

### Expressions to rotate

closed mouth smirk · soft smile · slight smile with teeth · neutral · contemplative · biting lip · laughing

---

## Things this persona does NOT post

Define before you start. Edits are fine; mid-stream pivots into content you weren't comfortable with isn't.

- *(fill in)*
- *(fill in)*

---

## Iteration log

Notes on what's worked / failed. Append-only — keeps you from re-trying dead ends.

| Date | Change tested | Result |
|---|---|---|
| 2026-05-04 | LoRA at 70%+ with stacked Civitai trigger tokens | Melted faces — dropped to 60% selfies / 50% non-selfies |
| 2026-05-04 | `(selfie:1.2)` attention syntax | Draw Things parsing issue, contributes to artifacts — use `selfie` plain |
| 2026-05-04 | `lowres`, `webcam photo`, `grainy` tokens | Degrades output instead of stylizing — avoid |
| 2026-05-04 | Image-to-image with mismatched aspect ratio | Source superimposes on generated background, no blending — keep canvas at source aspect |
| 2026-05-05 | Maya LoRA (rank 16, 2000 steps) on Juggernaut XL v9 at 80–95% | Identity locked, but Juggernaut's "polished AI portrait" fingerprint dominates — looks AI-generated even with anti-glamour negatives. Salvageable for tier-2 with prompt heavy on `amateur photo, raw photo, no makeup` tokens, but not the daily-driver. |
| 2026-05-05 | Maya LoRA on RealVisXL v4 at 91% | More photoreal skin texture than Juggernaut, but lighting skews harsh and aesthetic feels "candid in a bad way." Backup option, not preferred. |
| 2026-05-05 | Maya LoRA on gonzalomoXLFluxPony_v40 at 60% | Photorealism matches Phase 1 quality, identity holds, freckles visible. **This is the production base.** Caveat: gonzalomo doesn't follow complex prompts well — use terse prompts. |
| 2026-05-05 | Default Maya output skews medium chest across seeds | LoRA averaged toward dataset majority. Fix: bump weight to 75–80% AND add `large breasts, busty` tokens — calls up the bigger-chest training shots (lingerie / bikini / lying-down framings). |
| 2026-05-05 | LoRA weight calibration is base-dependent | Same LoRA wants different weights on different bases. gonzalomo: 60–78%. Juggernaut: 80–95%. RealVisXL: ~91%. Re-calibrate when swapping bases. |
| 2026-05-05 | Phase 2 sample images (during training) on plain SDXL 1.0 base | Looked AI-generated and 2/5 didn't even show Maya. Misleading — plain SDXL 1.0 has poor photorealism baseline. Don't judge a LoRA by its training-step samples; judge it on production bases. |
| 2026-05-08 | **`maya_lora_v2.safetensors` trained** — rank 32, `train_text_encoder: true`, EMA, 2750 steps. Saved at `personas/maya/lora/maya_lora_v2.safetensors`. Backup checkpoints from steps 2250 and 2500 also held locally for fallback. | Loss trajectory healthy (briefly dipped to 0.0019 at step 2500, bounced back to 0.05 at 2749 — memorization didn't stick). |
| 2026-05-08 | Quick v2 vs v1 same-prompt comparison on 2-3 production bases (no formal matrix — time pressured by hourly billing) | v2 "definitely better" per eye-test BUT — see 2026-05-09 deeper testing for what this actually meant. |
| 2026-05-09 | v2 prompt without preamble vs WITH v2 preamble (`mayacole_persona, jet black hair, deep dark brown eyes, freckles across nose, full lips, soft eyeliner, defined jawline,`) — same scene, gonzalomo, 5 of each | **Preamble is mandatory.** Without preamble: 0% recognizable identity. With preamble: ~100% recognizable as same-person family, ~5% true "that's her" specificity. v2 LoRA was trained with this preamble in every caption (50× reinforcement); inference without it under-fires. **Update prompts below to include preamble — current template still uses v1 format.** |
| 2026-05-09 | v2 LoRA weight sweep at 50% / 65% / 80% / 95% / 100%, same scene, multiple seeds, gonzalomo | Weight produces no material identity-fidelity change across the range. v1's 60-78% sweet spot does NOT carry to v2. Higher weight just modulates expression strength of the same face family — does not push past family-level into specific. v2's identity ceiling is hit at any reasonable weight. |
| 2026-05-09 | v2 + sample-config prompt verbatim from `maya_v2.yaml` on **SDXL 1.0** (the LoRA's training base), 16 random seeds, 100% LoRA | **Best result yet.** ~25% true-hit rate (3-4 / 16 "really well done"), most others recognizably-her family. Aesthetic was poor (SDXL 1.0 looks AI), but face fidelity meaningfully exceeded gonzalomo output. Confirms: v2 LoRA captures identity well, but only on its training base. Base-mismatch loss is the real problem on production output. |
| 2026-05-09 | Translated tier-3 prompts (lying nude, mirror selfie lingerie) on SDXL 1.0 with v2 LoRA at 100% | Bodies / hands / composition broken (multiple phones in mirror selfies, missing limbs, deformed hands, faces obscured by composition choices). These are SDXL 1.0's documented weaknesses, NOT LoRA failures. Use SDXL 1.0 only for face-fidelity diagnostics, never for production. |
| 2026-05-09 | v2 still uses v1's prompt template (preamble missing) | Update prompt template before v2 production use — see "Full prompt template" section below; should now include preamble. **OR wait for v3** since base-mismatch issue remains regardless. |
| 2026-05-13 | v3 LoRA loaded for first time, sampler/weight sweep (configs A-G, 7 configs × 4 seeds each, LCM and DPM++ family) | Identity fires at LCM 16 / CFG 5 / 80% weight (config B): 2.5/4 face accuracy including 1 "looked identical" image — first time any LoRA produced specific-Maya on gonzalomo. BUT glossy/AI-rendered artifact on every config across all weights, samplers. Round 1 prompt also had `large breasts, busty` bug from carryover of no-LoRA gonzalomo envelope — produced chubby bodies. |
| 2026-05-13 | Round 2 — re-baseline with prompt fix (drop `busty`, add `fit body`), 4 configs H-K | Body still drifted because `fit body` is also out-of-training (0/56 captions contain it). Rule established: **with LoRA loaded, body-shape tokens must be in training captions OR not used at all.** For chest, use `cleavage` (in training). |
| 2026-05-14 | Round 3 — CFG sweep on LCM at 1.5/2 + DPM++ at 7 (configs L-O) | CFG isn't the lever — LCM @ CFG 2 indistinguishable from LCM @ CFG 5 on the glossy front. DPM++ @ CFG 7 made paleness worse. Settled CFG 2 for LCM (cleaner default) but it's not a quality fix. |
| 2026-05-14 | Weight sweep below 80% on LCM (10/40/50/60/70%) — user-driven hypothesis test | The lower the weight, the better quality the image. At 10% quality is production-grade. AT 10% specific-Maya fires ~1-2 in 10. Other 8-9 of 10 are family-level. **v3 @ 10% with over-generation strategy is the production setting.** |
| 2026-05-15 | Step 2000 checkpoint downloaded from RunPod volume, tested at same LCM 16 / CFG 2 / 80% (config L equivalent) | Equally glossy, equally inconsistent face. Step count is NOT the lever — over-bake hypothesis-by-training-duration ruled out. Insight: `max_step_saves_to_keep: 4` retains intermediate checkpoints on the volume — free experiments worth checking before planning retrains. |
| 2026-05-15 | v2 retested on gonzalomo with engineered prompt + LCM 16 / CFG 2 / 80% (same as v3 testing) | Crisp images, face is "rounder, younger, slightly less attractive than reference — workable but would prefer not." This is the drifted Maya. Same finding as 2026-05-09 but at higher confidence due to clean prompt/settings. |
| 2026-05-15 | v1 retested on gonzalomo, same setup | **Produces the same drifted Maya as v2.** Bootstraps weren't the source of drift — v1 has none and produces the same drift. Drift is **base-mismatch** (SDXL-1.0-trained LoRA on gonzalomo). |
| 2026-05-15 | v3 @ 10% disambiguation test — does v3 capture real Maya or just add gloss to drifted Maya? | 1-2 in 10 are specific-Maya at v3 @ 10% with crisp quality. Real Maya IS captured by v3 (the gloss was obscuring it). **v3 @ 10% locked as bridge production**: LoRA `maya_lora_v3.safetensors`, weight 10%, LCM 16 steps, CFG 2, gonzalomo base, over-generation strategy. |
| 2026-05-15 | DPM++ 2M Karras compatibility with v3 LoRA | Incompatible — color shifts to pale across CFG 5-7 and all tested weights. v1-era locked sampler is obsolete for v3. LCM is the v3 production sampler. |
