# gonzalomo Prompt Engineering — pre-v3

After the 2026-05-10 base evaluation locked gonzalomoXLFluxPony_v40 as the v3 production base, three known limitations need prompt-engineering workarounds before training v3:

1. Full-body framing weak (2/6 strict pass on scenario 2)
2. Tier-3 NSFW production capability untested
3. Mirror physics flaky (2/6 recursive-mirror artifact on scenario 3)

This file holds the prompt-engineering experiments. Once a variant lands, the locked prompt strategy gets extracted into `prompt_library.md` for production use.

**No LoRA loaded for these experiments** — same baseline as base eval. The goal is to confirm gonzalomo can be coaxed to acceptable output via prompt alone before we layer the v3 LoRA on top.

---

## Settings (consistent across experiments)

- **Sampler:** LCM
- **Steps:** 16
- **CFG:** 2
- **Resolution:** as specified per experiment (varies)

*Doc corrected 2026-05-15 — original header incorrectly stated DPM++ 2M Karras / 28 / CFG 5 (legacy v1-era defaults). v3 validation session confirmed LCM was actually used across all these experiments. Findings, results, and prompt rules are unaffected — they're sampler-agnostic.*

---

## Experiment 1 — Full-body framing

**Baseline (scenario 2):** 2/6 strict full-body pass; most cropped at toes or ankles.

**Hypothesis:** the failure is a combination of (a) `24mm lens` token implying selfie focal length, (b) weak emphasis on full-body tokens being absorbed by stronger setting/scene tokens, (c) negative not pushing against crops. Combine all three fixes in one variant.

**Resolution:** 832 × 1472 (taller than baseline 768×1344 — gives gonzalomo more vertical room to render legs/feet)

**Prompt:**
```
gonzalomo-amateur, amateur photo, photorealistic, full body shot from head to toe, complete body visible from feet to head, full length portrait, standing pose with shoes visible, 35mm lens wide shot, young woman, jet black hair, fair skin, brown eyes, wearing fitted black turtleneck and blue jeans, standing on sidewalk, casual stance, candid, looking ahead not at camera, overcast lighting, urban background
```

**Negative:**
```
cartoon, illustration, anime, painting, 3d render, low quality, blurry, deformed, asymmetric eyes, distorted face, plastic skin, watermark, text, signature, extra fingers, malformed fingers, bad hands, cropped, close-up, headshot, upper body only, cropped at knees, cropped at ankles, cropped at thighs, partial body, feet not visible
```

**What changed from baseline:**
- `24mm lens` → `35mm lens wide shot` (longer focal length renders less close)
- Stacked full-body emphasis: "full body shot from head to toe, complete body visible from feet to head, full length portrait, standing pose with shoes visible"
- Explicit `gonzalomo-amateur` lead token (was missing in base-eval prompts since LoRA was off; needed here since this is gonzalomo-specific tuning)
- Resolution 768×1344 → 832×1472 (more vertical room)
- Negative bulked up against cropping

**Pass criteria** (6 images, random seeds):

*Headline (the test):*
- ✅ Full body visible — head, torso, legs, AND feet all in frame
- ❌ Cropped at any point (thighs / knees / ankles / toes)

*Pass also confirmed if:*
- Outfit honored (fitted black turtleneck + blue jeans)
- 3rd person framing (NOT a selfie)
- Anatomy normal

**Target:** 5/6 strict full-body pass (vs baseline 2/6). If we hit that, the prompt strategy is locked. If 3-4/6, partial win — try a second variant. If still 2/6 or worse, framing may not be prompt-engineerable on gonzalomo and we accept the rejection-rate trade-off.

**Results (2026-05-10):** ✅ **6/6 full body** — beat target. Combined-fix variant solved gonzalomo's framing weakness completely. The (a) `35mm lens` swap, (b) stacked head-to-toe emphasis, (c) anti-crop negative, and (d) taller 832×1472 aspect together pushed gonzalomo from 2/6 → 6/6. **Prompt strategy locked** — extract to `prompt_library.md` under full-body shots when wrapping up.

---

## Experiment 2 — Tier-3 NSFW (gonzalomo's first NSFW test)

**Baseline:** none — gonzalomo's lingerie/NSFW output was never tested in the base evaluation. This is the gating test for Phase 5 monetization viability.

**Hypothesis:** gonzalomo is Pony-derived and historically handles NSFW well — should produce sellable lingerie content out of the gate without much engineering. Anatomy + body-type compliance are the things to watch.

**Resolution:** 832 × 1216

**Prompt:**
```
gonzalomo-amateur, amateur photo, photorealistic, young woman, jet black hair, fair skin, brown eyes, large breasts, busty, wearing black lace lingerie, lying on bed, full body visible, soft warm lamp light, looking at camera, slight smirk, hand on hip, bedroom setting
```

**Negative:** default
```
cartoon, illustration, anime, painting, 3d render, low quality, blurry, deformed, asymmetric eyes, distorted face, plastic skin, watermark, text, signature, extra fingers, malformed fingers, bad hands
```

**Pass criteria** (6 images, random seeds):

*NSFW handling:*
- ✅ Lingerie produced (not refused, not output-clothed)
- ✅ Black lace lingerie specifically (the prompted style)

*Anatomy (gating for paid-platform content):*
- ✅ Hands anatomically correct (5 fingers each, plausible articulation)
- ✅ All limbs present, no spurious extras
- ✅ Body proportions realistic

*Body type:*
- ✅ Larger chest (the `large breasts, busty` tokens are honored)

*Framing:*
- ✅ Full body visible (head to feet ideally)

*Pose & expression:*
- ✅ Lying on bed, hand on hip, looking at camera, slight smirk

*Aesthetic (qualitative):*
- Does it look sellable / postable for Fanvue, or "obviously AI"?

**Target:** 4+/6 production-ready (anatomy clean, NSFW handled, body type honored). If hit, gonzalomo is confirmed for tier-3 and v3 training proceeds. If 2-3/6, viable with prompt tuning. If 0-1/6, real problem for Phase 5 — opens conversation about whether to revisit Lustify (despite scenario 1+2 fails) specifically for tier-3.

**Results (2026-05-10):** ✅ **Gating Phase 5 question answered: YES, gonzalomo produces sellable tier-3 NSFW.**

- **NSFW handling:** 6/6 black lace lingerie produced as prompted ✅
- **Anatomy:** 4/6 clean; 2/6 had 4-finger hands but at side angles (barely noticeable) — close to target
- **Body type:** `large breasts, busty` tokens clearly honored across the batch ✅
- **Sellability:** user judged "sellable, would post" — passes the smell test for paid-platform content ✅
- **Framing:** 0/6 full body — most cut at knees, some slightly more, none full. **Solvable** with the experiment 1 fix pattern (35mm lens swap, stacked head-to-toe tokens, anti-crop negative, taller resolution) — needs an experiment 2.5 iteration before production use, but doesn't block the v3 training decision.

**Net verdict:** gonzalomo + v3 LoRA is the right path for Phase 5. Tier-3 NSFW production capability confirmed. **Prompt strategy partially locked** — body/anatomy/lingerie portion of the prompt is good as-is; framing portion needs the experiment 1 fixes layered on top before production lock-in. Track that as experiment 2.5 in a follow-up.

---

## Experiment 3 — Mirror physics

**Baseline (scenario 3):** 2/6 recursive-mirror artifact (phantom second mirror with second person reflected).

**Hypothesis:** gonzalomo defaults to "more mirror = more visually interesting" without negative pressure. Add explicit negatives against multiple mirrors + clarify in positive that there's only one.

**Resolution:** 832 × 1216

**Prompt:**
```
gonzalomo-amateur, amateur photo, photorealistic, mirror selfie in front of single bathroom mirror, no other mirrors visible, holding iphone in hand, full body visible in mirror reflection, young woman, jet black hair, fair skin, brown eyes, wearing white tank top and grey sweatpants, harsh overhead vanity lighting, neutral expression, casual pose, only one person in scene
```

**Negative:**
```
cartoon, illustration, anime, painting, 3d render, low quality, blurry, deformed, asymmetric eyes, distorted face, plastic skin, watermark, text, signature, extra fingers, malformed fingers, bad hands, multiple mirrors, second mirror, reflection of a reflection, two people, two women, duplicate person, mirror within mirror, double exposure
```

**What changed from baseline:**
- Positive: "in front of single bathroom mirror, no other mirrors visible" + "only one person in scene" (anti-recursive emphasis)
- Negative: explicit anti-multiple-mirrors and anti-duplicate-person tokens

**Pass criteria** (6 images, random seeds):

*Mirror physics (the headline test):*
- ✅ Single mirror visible
- ✅ One person (subject) and one reflection
- ❌ Recursive-mirror artifact (phantom second mirror with another reflection)
- ❌ Two distinct people in the scene

*Pass also confirmed if:*
- Outfit honored (white tank + grey sweatpants)
- Bathroom setting
- Anatomy normal (hands holding phone, no melted fingers, no duplicate phones)

**Target:** 5/6+ single-mirror compliance (vs baseline 4/6). If hit, prompt strategy is locked. If still 4/6, the recursive-mirror failure mode may be a stochastic gonzalomo quirk that's not prompt-engineerable — accept and over-generate to produce keepers.

**Results (2026-05-10):** ⚠️ **No improvement — 4/6 well done, 2/6 still had two people.** Identical to baseline (4/6 single-mirror, 2/6 recursive artifact). The explicit "single bathroom mirror, no other mirrors visible" + "only one person in scene" positives and the anti-recursive negatives (`multiple mirrors, second mirror, reflection of a reflection, two people, duplicate person, mirror within mirror`) did not push past gonzalomo's stochastic recursive-mirror failure mode.

**Production strategy:** **Accept the rejection rate.** Recursive-mirror artifact is a ~33% failure mode on gonzalomo that prompt engineering can't fix. For mirror selfie production, over-generate by ~50% (generate 9 to keep 6). Alternative paths if higher hit rate is needed later: (a) img2img using a real mirror selfie as composition source, (b) hope the v3 LoRA's identity reinforcement reduces the artifact rate (untested hypothesis), (c) avoid the bathroom-mirror shot type and substitute other selfie compositions.

**Prompt strategy locked** — for mirror selfies use the experiment 3 prompt as the baseline (anti-recursive tokens are still helpful even if not curative) and budget for over-generation.

---

## After all three experiments

1. For each experiment that hit its target: extract the winning prompt strategy into `prompt_library.md` under the relevant section (full-body shots, NSFW, mirror selfies) and lock it as the production formula.
2. For experiments that didn't hit target: document what failed and what was tried, decide whether to accept-the-limitation or attempt a second iteration.
3. Once prompt strategy is locked, proceed to v3 LoRA training (see `V3_PLANNING.md` Step 2).

---

# Ceiling tests — push gonzalomo's production envelope

Goal: characterize what gonzalomo can and can't do across high-value production scenarios BEFORE v3 training. Find any remaining failure modes so we don't discover them post-training. Apply the locked framing fixes from experiments 1+2 where applicable.

**Same settings as experiments 1-3.** No LoRA loaded. 6 images per scenario, random seeds.

---

## Scenario 4 — NSFW full body, lingerie standing (tier-3)

**Why:** experiment 2 confirmed gonzalomo handles lingerie sellably but framing was 0/6 full body. This applies experiment 1's framing fix to a tier-3 NSFW prompt — confirms whether the framing fix transfers to NSFW context.

**Resolution:** 832 × 1472

**Prompt:**
```
gonzalomo-amateur, amateur photo, photorealistic, full body shot from head to toe, complete body visible from feet to head, full length portrait, standing pose with feet visible, 35mm lens wide shot, young woman, jet black hair, fair skin, brown eyes, large breasts, busty, wearing black lace lingerie, standing in bedroom, hand on hip, looking at camera, slight smirk, soft warm lamp light, casual pose
```

**Negative:**
```
cartoon, illustration, anime, painting, 3d render, low quality, blurry, deformed, asymmetric eyes, distorted face, plastic skin, watermark, text, signature, extra fingers, malformed fingers, bad hands, cropped, close-up, headshot, upper body only, cropped at knees, cropped at ankles, cropped at thighs, partial body, feet not visible
```

**Pass criteria:**
- *Framing:* full body visible, head to feet
- *NSFW handling:* black lace lingerie produced (not refused, not clothed)
- *Body type:* `large breasts, busty` honored
- *Anatomy:* hands clean, no spurious limbs, face normal
- *Pose:* standing, hand on hip, looking at camera
- *Aesthetic:* sellable for paid platform

**Target:** 4+/6 with full body AND sellable anatomy. This is the unified Phase 5 production prompt.

**Results (2026-05-10):** ⚠️ **3/6 strict full body** (5/6 had most-of-body, 1/6 cut above ankles). Below the 4+/6 target on framing. Everything else checks: anatomy clean, lingerie produced as prompted, body type honored, sellable.

**Finding:** the framing fix from experiment 1 is **partial in NSFW context** — same engineering that hit 6/6 on standing-casual only hits 3/6 on standing-lingerie. Hypothesis: chest-emphasis tokens (`large breasts, busty`) bias the model toward upper-body crops, which fights the head-to-toe emphasis. The lingerie/bedroom context probably has a strong learned association with "boudoir close-up" framings too.

**Production strategy:** for tier-3 standing-lingerie, accept the 50% framing rejection rate — generate ~12 to keep 6 with strict full body. Acceptable for production but worse than tier-2 framing yield. **Possible v3 LoRA fix:** if the v2 dataset is weighted toward sitting/lying lingerie shots, adding standing-lingerie reference shots to v3 training could shift this. Worth examining the dataset composition before training.

---

## Scenario 5 — Activity shot, gym workout (tier-2)

**Why:** activity shots drive lifestyle / vlog content (priority 4 in PLAN.md). Tests gonzalomo on action poses, equipment rendering, sweat/atmosphere, dynamic settings.

**Resolution:** 832 × 1216

**Prompt:**
```
gonzalomo-amateur, amateur photo, photorealistic, candid photo, young woman, jet black hair pulled into ponytail, fair skin, brown eyes, wearing black sports bra and grey leggings, doing dumbbell curls in gym, holding dumbbell in each hand, mid-workout, slight sweat on skin, focused expression looking at mirror, fluorescent overhead gym lighting, gym equipment in background
```

**Negative:** default
```
cartoon, illustration, anime, painting, 3d render, low quality, blurry, deformed, asymmetric eyes, distorted face, plastic skin, watermark, text, signature, extra fingers, malformed fingers, bad hands
```

**Pass criteria:**
- *Activity:* visibly mid-workout, dumbbells visible in hands
- *Outfit:* black sports bra + grey leggings (both items)
- *Setting:* gym (equipment visible in background)
- *Anatomy:* hands gripping dumbbells correctly (no melted fingers, no floating dumbbells)
- *Pose:* dumbbell curl pose readable
- *Aesthetic:* candid gym photo feel, not glamour

**Target:** 4+/6 readable as a real gym workout candid.

**Results (2026-05-11):** ⚠️ **6/6 passed written rubric criteria** (activity, outfit, setting, anatomy, pose all clean) BUT **5/6 had duplicate of the same subject in scene** — initially diagnosed as mirror-reflection artifact, user confirmed there was no obvious mirror in most images and the duplicates didn't read as reflections, they read as a literal second person (twin/clone).

**Finding (corrected):** this is a **distinct failure mode from the mirror recursive artifact** in scenario 3 / experiment 3. That one was reflection-rendered-as-extra-person within an explicit mirror context. This one is "second instance of subject" appearing in scene without mirror context. Likely triggers:
- Gym setting has strong "workout partner / group activity / group class" prior in training data → model defaults to multi-person scenes
- `candid photo` token may imply "photographer is present" → model renders the photographer as a duplicate subject
- Combination of both is enough to flip the model from solo-subject to multi-subject mode at 5/6 frequency

**Production strategy (revised):** for gym / social-activity scenarios, add explicit anti-duplicate measures to positive AND negative:
- *Positive add:* `alone, solo, only one person in scene, single subject`
- *Negative add:* `multiple people, two women, duplicate person, twin, clone, workout partner, group class, second person, two of the same person`
- *Setting alternative:* try `home gym` / `garage gym` instead of public gym — more solo-coded in training data

**Rubric expansion:** added criterion to all future scenarios — `✅ Single subject, no duplicate / no second person in scene`. Original rubric missed this because it wasn't anticipated; now confirmed as a recurring gonzalomo issue across two distinct trigger types (mirror context AND social-setting context).

**Untested:** would the anti-duplicate prompt additions fix this? Worth a quick re-test (6 images with positive+negative additions and either same gym setting or home gym substitution) before locking gym prompt for production.

**Re-test results (2026-05-11):** ⚠️ **Partial fix — failure mode shifted but not eliminated, 0/6 production-worthy.** With added positives (`alone, solo, only one person in scene, single subject`), negatives (`multiple people, two women, duplicate person, twin, clone, workout partner, group class, second person, two of the same person`), `gym` → `home gym` swap, and `looking at mirror` → `looking ahead`:

The anti-duplicate prompts redirected gonzalomo from "literal twin in scene" to "trying to render a mirror reflection," but the reflection rendering itself failed in multiple distinct ways:
- Reflection facing the camera instead of being a true reflection (impossible physics)
- Reflection merging with the main subject (clipping artifact)
- Reflection not lining up correctly with the subject's pose

User judgment: none of the 6 are production-worthy. The duplicate-subject prior wasn't eliminated, just transformed into a different broken expression that compounds with gonzalomo's already-known mirror physics weakness from experiment 3.

**Verdict: gym is a hard category for gonzalomo.** The training-data prior toward "gym = multiple figures + mirror walls" is too strong to prompt-engineer away. Production strategies:
1. **Avoid public-gym settings** in production prompts. Substitute solo-coded activities: outdoor running, home yoga (scenario 6 worked cleanly), bodyweight exercise outdoors, hiking
2. If gym shots are required, expect >50% rejection rate AND broken reflection artifacts in many of the survivors
3. Possible img2img workaround: composition-source from a real solo gym selfie, then transfer to Maya via low-strength img2img
4. Hope v3 LoRA reduces this (untested — would only know after training)

**For v3 LoRA training implication:** if gym shots are wanted in the production set, the v2 dataset should be checked for gym reference images. If absent, v3 dataset should be augmented with solo-gym shots to bias gonzalomo toward solo-subject in that context.

---

## Scenario 6 — Awkward pose, yoga (tier-2)

**Why:** ceiling test for non-standard body positions. If gonzalomo can render her in a contorted but anatomically correct pose, that opens up a lot of production variety. If not, we know to stick to standing/sitting/lying defaults.

**Resolution:** 1216 × 832 (landscape — wider for horizontal poses)

**Prompt:**
```
gonzalomo-amateur, amateur photo, photorealistic, candid photo, young woman, jet black hair pulled into low bun, fair skin, brown eyes, wearing fitted purple sports bra and matching leggings, doing downward dog yoga pose on yoga mat, body forming an inverted V shape, hands and feet on mat, hips lifted high, side view, soft natural light from window, hardwood floor home setting, plants in background
```

**Negative:** default
```
cartoon, illustration, anime, painting, 3d render, low quality, blurry, deformed, asymmetric eyes, distorted face, plastic skin, watermark, text, signature, extra fingers, malformed fingers, bad hands, broken back, contorted spine, impossible pose
```

**Pass criteria:**
- *Pose:* recognizably downward dog (inverted V shape)
- *Anatomy:* limbs in correct positions, no impossible joint angles, no extra/missing limbs
- *Outfit:* purple sports bra + matching leggings
- *Setting:* home / yoga mat / hardwood floor with plants
- *Aesthetic:* readable as a real yoga photo, not surreal

**Target:** 3+/6 anatomically correct downward dog. If <2/6, gonzalomo has hard limits on non-standard poses — stick to standard positions in production. If 4+/6, opens awkward-pose content as a viable production category.

**Results (2026-05-11):** ✅ **All criteria passed cleanly.** Pose recognizably downward dog, body anatomy looked correct, outfit honored, setting well-rendered (yoga mat + home setting + plants). Some images didn't show 100% full body but framing wasn't a criterion for this scenario (downward dog is a folded pose where strict head-to-feet framing isn't meaningful) — non-issue.

**Implication:** gonzalomo can handle non-standard / awkward poses without breaking anatomy. Yoga, contortion, unusual-position content is a viable production category. This is more permissive than the typical SDXL ecosystem expectation — gonzalomo's pose flexibility is a genuine strength. **No production prompt-engineering needed for awkward poses** — the standard prompt structure works.

---

## Scenario 7 — Outdoor tier-3, pool bikini (tier-3 variety)

**Why:** Phase 5 variety — paid platforms reward varied settings. Tests outdoor + lighting + NSFW + framing combined. If pool/beach NSFW work, that's a major production unlock beyond bedroom-only NSFW.

**Resolution:** 832 × 1472

**Prompt:**
```
gonzalomo-amateur, amateur photo, photorealistic, full body shot from head to toe, complete body visible from feet to head, 35mm lens wide shot, young woman, jet black hair wet, fair skin, brown eyes, large breasts, busty, wearing skimpy black string bikini, standing at edge of swimming pool, water dripping from hair and body, looking at camera, slight smirk, harsh midday sun overhead, palm trees and pool deck in background, vacation setting
```

**Negative:**
```
cartoon, illustration, anime, painting, 3d render, low quality, blurry, deformed, asymmetric eyes, distorted face, plastic skin, watermark, text, signature, extra fingers, malformed fingers, bad hands, cropped, close-up, headshot, upper body only, cropped at knees, cropped at ankles, cropped at thighs, partial body, feet not visible
```

**Pass criteria:**
- *Framing:* full body visible, head to feet (re-applies experiment 1 fix)
- *Setting:* outdoor pool, palm trees / pool deck readable
- *NSFW handling:* skimpy bikini produced as prompted
- *Body type:* `large breasts, busty` honored
- *Anatomy:* hands clean, no spurious limbs
- *Lighting:* harsh midday sun visible (highlights, sharp shadows)
- *Aesthetic:* sellable / readable as real vacation photo

**Target:** 4+/6 sellable outdoor tier-3. If hit, outdoor NSFW is locked for production. If 1-2/6, outdoor NSFW remains a "deliberate setup" rather than a routine production category.

**Initial run findings (2026-05-11):** Multiple unintended issues, all traceable to the prompt I wrote (not gonzalomo failures). Documented as learnings so the corrective prompt below can fix systematically:

1. **Body size overshoot** — boobs were "way too big, too unrealistic." Compound effect of stacking `large breasts` + `busty` + `skimpy black string bikini`. Scenario 4 (lingerie) used `large breasts, busty` without `skimpy` and produced acceptable bigger-chest. The `skimpy` token plus body-amplifying lingerie context overshot. **Lesson:** gonzalomo is Pony-derived → responds literally to size tokens. `large breasts` alone is ~ "noticeably larger than default." Adding `busty` doubles up. Adding outfit-revealing tokens like `skimpy` further amplifies. Use ONE size token max, drop revealing-outfit modifiers when size is already prompted.

2. **Partial nipple in 5/6** — `skimpy black string bikini` reads as "barely covers" → model interprets as partial reveal. Bikini context lacks default nipple-coverage protection that lingerie has (lingerie covers more by design; bikini can go to topless without much push). **Lesson:** for bikini prompts, explicit nipple-coverage in negative is mandatory if you want a bikini-not-topless result.

3. **6/6 selfie framing despite no `selfie` token** — pool + bikini + vacation has heavy selfie association in training data (probably the most common training-image combination for that setting). Defaulted to selfie even with `35mm lens wide shot` opposing. **Lesson:** anti-selfie has to be active, not assumed. For non-selfie outdoor NSFW, explicitly negate selfie tokens AND signal photographer-presence in the positive.

4. **0/6 full body** — same NSFW framing-resistance as scenario 4, compounded by selfie default. Phone selfies typically don't render full body unless arm is extended. **Lesson:** the experiment 1 framing fix needs anti-selfie support to work in NSFW outdoor contexts.

**Score deferred** — re-run with corrective prompt below before scoring. The original failures are prompt-design issues, not gonzalomo capability ceiling.

### Scenario 7 (corrective) — re-run with all four lessons applied

**Resolution:** 832 × 1472 (unchanged)

**Prompt:**
```
gonzalomo-amateur, amateur photo, photorealistic, third person photo, candid photograph from poolside, photographer standing on pool deck, hands at sides, full body shot from head to toe, complete body visible from feet to head, 35mm lens wide shot, young woman, jet black hair wet, fair skin, brown eyes, large breasts, wearing black string bikini with full coverage, nipples covered, standing at edge of swimming pool, water dripping from hair and body, looking at camera, slight smirk, harsh midday sun overhead, palm trees and pool deck in background, vacation setting
```

**Negative:**
```
cartoon, illustration, anime, painting, 3d render, low quality, blurry, deformed, asymmetric eyes, distorted face, plastic skin, watermark, text, signature, extra fingers, malformed fingers, bad hands, cropped, close-up, headshot, upper body only, cropped at knees, cropped at ankles, cropped at thighs, partial body, feet not visible, selfie, mirror selfie, holding phone, looking at phone, arm extended toward camera, exposed nipples, partial nudity, topless, areola visible, nipple slip, exaggerated breasts, unrealistic body proportions, photoshopped body
```

**Changes from initial:**
- Dropped `busty` and `skimpy` (size overshoot fix)
- Added `with full coverage, nipples covered` to outfit description (anti-nipple-slip)
- Added `third person photo, candid photograph from poolside, photographer standing on pool deck, hands at sides` (anti-selfie positive signals)
- Added `selfie, mirror selfie, holding phone, looking at phone, arm extended toward camera` to negative (anti-selfie negative)
- Added `exposed nipples, partial nudity, topless, areola visible, nipple slip, exaggerated breasts, unrealistic body proportions, photoshopped body` to negative (modesty + body-realism enforcement)

**Corrective re-run target:**
- Framing: 4+/6 full body
- Selfie default: 0/6 (must be 3rd person)
- Body type: noticeable but realistic (no overshoot)
- Nipple coverage: 6/6 (no slips)
- Anatomy + setting: maintained from initial run

**Corrective re-run results (2026-05-11):** Mixed.

- **Anti-selfie: ✅ fully fixed** — 0/6 selfies (was 6/6). The explicit positive (`third person photo, photographer standing on pool deck, hands at sides`) + negative (`selfie, holding phone, arm extended`) cleanly inverted the default
- **Framing: improved but not solved** — 1/6 ankles-up (best in batch), rest were knees-up. Better than initial run's "upper body only" but still no true full-body
- **Nipple coverage: REGRESSED** — 3/6 had nipples fully exposed (initial had 5/6 partial nipple slip; this iteration produced fewer partial slips but more full exposure)
- **Body size: not mentioned by user, presumed corrected** (dropping `busty` + `skimpy` worked)

**Diagnosis of regression:** adding `nipples covered, with full coverage` to the POSITIVE prompt likely boosted the nudity concept. Image models often paradoxically reinforce concepts they're trying to deny when nudity-related tokens appear positively — the model "sees" the concept and renders around it. **Lesson:** keep nudity/coverage language in NEGATIVE ONLY. Describe what the garment IS in the positive (its style, coverage type) instead of what it ISN'T (not exposing).

### Scenario 7 (iteration 2) — fix nipple regression + push framing further

**Resolution:** 832 × 1472

**Prompt:**
```
gonzalomo-amateur, amateur photo, photorealistic, third person photo, candid photograph from poolside, photographer standing on pool deck, full body shot from head to toe, complete body visible from feet to head, 35mm lens wide shot, young woman, jet black hair wet, fair skin, brown eyes, large breasts, wearing modest padded triangle bikini top and matching bikini bottoms, swimwear catalogue style photo, standing barefoot on pool deck next to swimming pool, water dripping from hair and body, looking at camera, slight smirk, harsh midday sun overhead, palm trees and pool deck in background, vacation setting
```

**Negative:**
```
cartoon, illustration, anime, painting, 3d render, low quality, blurry, deformed, asymmetric eyes, distorted face, plastic skin, watermark, text, signature, extra fingers, malformed fingers, bad hands, cropped, close-up, headshot, upper body only, cropped at knees, cropped at ankles, cropped at thighs, partial body, feet not visible, selfie, mirror selfie, holding phone, looking at phone, arm extended toward camera, topless, no top, exaggerated breasts, unrealistic body proportions, in water, swimming, submerged
```

**Changes from iteration 1:**
- Removed `nipples covered, with full coverage` from positive → replaced with descriptive garment: `modest padded triangle bikini top and matching bikini bottoms`
- Added `swimwear catalogue style photo` (signals tasteful framing)
- Changed `standing at edge of swimming pool` → `standing barefoot on pool deck next to swimming pool` (anti-water-crop, explicit feet visibility)
- Simplified negative nipple language to just `topless, no top` (too many similar negatives can dilute attention)
- Added `in water, swimming, submerged` to negative (force on-deck framing)

**Iteration 2 target:**
- Framing: 4+/6 ankles-or-better, ideally 2+/6 full body (head to feet)
- Selfie default: 0/6 (maintain)
- Nipple coverage: 6/6 (regression-fix)
- Body type: realistic (maintain)

**Iteration 2 results (2026-05-11):** ✅ **Rubric pass — score 4 (minor caveats).**

- All written rubric criteria pass: framing acceptable, selfie default still 0/6, nipple coverage fixed (no slips/exposure), body type realistic, anti-duplicate held
- *Aesthetic concern (qualitative, not scored):* backgrounds are weird, and 2/6 specifically had her standing on the water's surface (Jesus-walking-on-water effect)

**Diagnosis of background issue:** likely conflict between `water dripping from hair and body` (implies "just got out of water") and `standing barefoot on pool deck` (implies "on land"). gonzalomo split the difference into "standing on water surface" — physically wrong but technically satisfies both prompts. Confusion compounded by the negative push against `in water, swimming, submerged` (which works at the literal pool level but doesn't constrain "the surface of water as ground").

**Future iteration 3 (if needed):** drop `water dripping from hair and body` entirely. Replace with `dry skin, just arrived at pool, ready to swim` or simply remove the wet description. The wet-look isn't worth the surreal background risk.

**Decision: call scenario 7 complete at iteration 2.** Production-ready with 4/6 yield (toss the walk-on-water frames). Lessons learned applied; further iteration would polish but not unblock.

---

## Cumulative lessons across all 7 scenarios

Compiled for future production prompt design and v3 LoRA dataset planning:

**Prompt structure rules:**
1. *Use ONE size token max.* `large breasts` alone = "noticeably larger." Stacking with `busty` and revealing-outfit modifiers like `skimpy` overshoots into unrealistic.
2. *Nudity / coverage language goes in negative ONLY.* Positive descriptions of "nipples covered" or "full coverage" inadvertently boost the nudity concept. Describe what the garment IS, not what it isn't.
3. *Anti-selfie has to be active.* For non-selfie outdoor or vacation NSFW, explicitly negate `selfie, holding phone, arm extended` AND signal photographer presence in positive.
4. *Avoid wet+on-deck contradictions.* Mixing "water dripping" with "standing on deck" produces surreal backgrounds (walk-on-water effect).
5. *Don't mention mirrors unless mirror is the literal subject.* Triggers gonzalomo's recursive-mirror artifact at ~33% baseline.
6. *Avoid gym settings.* Strong "multi-person + mirror walls" prior — anti-duplicate prompts only redirect into broken mirror physics. Substitute home yoga, outdoor running, etc.
7. *NSFW context resists framing fix partially.* Experiment 1's framing fix (35mm + stacked tokens + anti-crop negative + 832×1472) gets 6/6 on standing-casual but only 3/6 on standing-lingerie. Production: budget over-generation for NSFW full body.

**Production envelope confirmed for gonzalomo:**
- ✅ Modest IG selfies (scenario 1)
- ✅ Full-body 3rd person standing (with experiment 1 fix)
- ✅ Tier-3 lingerie lying (scenario 4 / experiment 2)
- ✅ Awkward / yoga poses (scenario 6)
- ⚠️ Tier-3 outdoor pool/beach NSFW (works after multi-iteration, accept ~30% rejection)
- ⚠️ Mirror selfies (over-generate ~50% for recursive artifact)
- ❌ Gym workouts (hard limit — substitute alternative)

**For v3 LoRA training:**
- v2 dataset already on volume; reuse for v3
- Consider augmenting with: standing-lingerie reference shots (if underrepresented — would help NSFW framing fix), solo-gym shots if gym content is wanted (would shift gym duplicate-subject prior)
- Production prompts above all assume LoRA NOT loaded — need re-validation after v3 trained, weights likely re-calibrate

---

## After ceiling tests

1. For scenarios that hit target — production envelope confirmed for that category, prompt strategy locks in `prompt_library.md`.
2. For scenarios that miss — document gonzalomo's hard limits (where prompt engineering can't push past). These become "production constraints" that v3 LoRA may or may not relax.
3. Aggregate findings inform v3 training decisions: do we need to weight specific shot types in the dataset (e.g., add more outdoor / activity shots if those are weak)? Or proceed with the v2 dataset as-is?
