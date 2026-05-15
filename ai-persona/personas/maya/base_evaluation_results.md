# Base Evaluation Results — Maya v3

Filled in as the base-eval session runs. See `base_evaluation_prompts.md` for the prompts being tested. See `V3_PLANNING.md` for the framework + decision criteria.

**Session date:** 2026-05-10
**Bases tested:** gonzalomoXLFluxPony_v40, Juggernaut XL v9, RealVisXL v4, Lustify, miamodel

---

## Scoring rubric (per scenario, per base)

- **5** — Pass cleanly, no notes. Production-ready as-is.
- **4** — Pass with minor caveats (e.g., slightly off lighting, one image of six had a hand glitch).
- **3** — Mixed — some images pass, some fail. Workable with prompt tuning.
- **2** — Mostly fails. Requires significant prompt fighting to get usable output.
- **1** — Hard fail. Base does not honor the prompt at all, or anatomy is consistently broken.

A score of **2 or below in scenario 1 (modesty) or scenario 2 (full-body framing) is a hard rule-out** — those are the user's identified pain points and Maya's production needs them solved, not patched.

---

## Results table

Fill in score + one-line note per cell. Note format: `<score> — <observation>`.

| Scenario | gonzalomoXLFluxPony_v40 | Juggernaut XL v9 | RealVisXL v4 | Lustify | miamodel |
|---|---|---|---|---|---|
| **1. Modest IG selfie** | 4 — 6/6 hoodie present + IG-selfie framing; 1/6 hoodie unzipped showing cleavage (no nipple) | 2 — modesty good (0/6 cleavage) BUT only 1/6 was actually a selfie (5/6 defaulted to 3rd person) and the selfie had broken anatomy (missing arm, deformed face) | 4 — 6/6 hoodie + modest, 4/6 clean selfies, 1/6 ambiguous (could be either), 1/6 not-selfie | 5 — rubric pass on all criteria (6/6 hoodie + modest + selfie framing); aesthetic concerns flagged separately (face/background quality — see per-scenario notes) | 2 — 1/6 full topless despite enhanced negative (hard modesty fail), 1/6 broken hand/hoodie, baseline output blurry/grainy. Caveat: may be a settings-tuning issue not a model issue (user has good past experience with this model) |
| **2. Full-body framing** | 3 — 2/6 full body, 3/6 toes cut, 1/6 cut at ankles (worst case); 6/6 correct 3rd-person framing; aesthetic reads AI-generated but quality is fine; camera distance failed (subject fills frame) but this is ecosystem-wide | 3 — 6/6 fully complete full body (best framing of any base); blurred background hides background gen issues (clever unintentional workaround); faces look fake / doll-like — a problem on a face-strength base | 3 — 5/6 full body, 1/6 cut at knees; faces equally fake/doll-like as Juggernaut; backgrounds + bodies slightly better than Juggernaut; gonzalomo still has best aesthetic quality despite worst framing | 2 — 5/6 full body framing (1/6 toe cut); melted faces 6/6 (hard fail on anatomy criterion); surreal melting backgrounds (Dali-style buildings); rubric framing pass but anatomy / aesthetic fail dominates | 3 — 5/6 full body, 1/6 knees-up; structure / pose well-done; faces bad — overall aesthetic reads as "detailed clay modeling, not real image" |
| **3. Mirror selfie composition** | 3 — 2/6 recursive-mirror artifact (phantom second mirror with second person); 0/6 full body but most hit upper-thigh (borderline rubric pass); 1/6 production-quality, others "decent" | 3 — faces improved (too-much-makeup, not fake-AI); 3/6 wrong bottoms (shorts vs sweatpants); 0/6 full body; 2/6 recursive-mirror (1 cleverly leaned against the phantom mirror); broken hands + duplicate phones across multiple; mixed across rubric criteria (some pass, some fail) | 4 — passes most rubric items with minor caveats; rubric leader for this scenario |  |  |
| **4. Tier-3 lingerie / NSFW** |  |  |  |  |  |
| **5. Outdoor full body, golden hour** |  |  |  |  |  |
| **Aggregate** (sum) |  |  |  |  |  |

---

## Per-scenario cross-model observations

Filled in after running all 5 bases for a given scenario. Capture patterns that only show up when you compare bases side-by-side: which base "felt" best for this scenario, which base had a surprising aesthetic fingerprint, which failed in an unexpected way, etc.

### Scenario 1 — Modest IG selfie

- **gonzalomo:** Better than expected based on prior production experience. The enhanced negative (`nude, naked, topless, cleavage, exposed breasts...`) plus explicit "fully clothed, modest, no skin showing below neck" got 5/6 fully compliant. The 1/6 cleavage case is a minor compliance failure but not the blowout failure mode we feared. Worth flagging: prior gonzalomo "over-renders nudity" pain may have been partly LoRA-induced (LoRA training set has lingerie/bikini reference shots → biases output toward more skin). Without the LoRA loaded, gonzalomo's modesty handling is much closer to acceptable.
- **Juggernaut:** Modesty handling is excellent (0/6 cleavage, hoodie zipped per prompt). BUT framing failed badly — only 1/6 was actually a selfie despite explicit `selfie, 24mm lens` in the prompt; 5/6 defaulted to 3rd-person photos. The single selfie had broken anatomy (missing arm, deformed face). This matches the v1 LoRA-era observation that Juggernaut's "polished AI portrait" fingerprint dominates — its training distribution leans glamour/3rd-person/professional, fighting the amateur-selfie framing. **Possible implication for production:** Juggernaut may not be viable for tier-2 IG-selfie content even if it wins on full-body / lifestyle scenarios. Hold final disposition until scenarios 2 + 5 are run.
- **RealVisXL:** Best balance so far on this scenario — modesty handled cleanly across all 6 (no cleavage anywhere) and 4/6 were proper selfies. The 1/6 ambiguous + 1/6 not-selfie suggest its prompt-following is mostly compliant but not bulletproof on the selfie-vs-3rd-person framing. Notably better than Juggernaut on selfie framing (4/6 vs 1/6).
- **Lustify:** Rubric-perfect (6/6 hoodie, modest, selfie framing, no anatomy malformations) BUT aesthetic is off — subject's face reads "low-key autistic" / awkward across most images, and backgrounds don't cohere (objects/scene logic break down). Classic case of "passes the test but you wouldn't post it." This is exactly why scenario-by-scenario comparison matters — rubric scores alone would have ranked Lustify top of scenario 1, but visual inspection puts it last. Aesthetic concerns logged here, will feed into final per-base aesthetic summary.
- **miamodel:** With default settings (DPM++ 2M Karras / 28 / CFG 5), output came out blurry/grainy. User did multiple settings re-tests — quality improved but still landed at "too obviously AI." 1/6 went fully topless despite the enhanced negative (hard modesty fail). 1/6 had broken hand + warped hoodie. Past user experience with this model has been good, but couldn't get there in this session. **Verdict: settings-fightability ≠ production-viability.** Tied with Lustify for last on this scenario.

**Final user ranking for scenario 1 (best → worst):**

1. **RealVisXL** — looks great, no complaints; 40-60% hit rate considered acceptable; ranked above gonzalomo *specifically* because this scenario is no-NSFW and gonzalomo had 1/6 cleavage slip
2. **gonzalomo** — quality tied with RealVisXL, just edged out by the one revealing image
3. **Juggernaut** — too AI-like aesthetic; user noted "maybe just needs settings tuning"
4. **Lustify** — backgrounds look "off" (often inexplicably), faces read severely-autistic — visually unposted-able even though rubric-perfect
5. **miamodel** — looks too obviously AI; conceptually present but image quality fails the smell test; hard modesty fail compounds it

**Cross-model takeaway:** Aesthetic quality and rubric-passing are decoupled — Lustify proved that. The scenario-by-scenario methodology is paying off; we'd have miscategorized Lustify badly with model-by-model order. RealVisXL and gonzalomo are the two production-viable candidates after scenario 1; Juggernaut, Lustify, miamodel are conditional rule-outs pending recovery in later scenarios.

### Scenario 2 — Full-body framing

- **gonzalomo:** Headline test partially honored. Full-body framing got 2/6 strict pass; 3/6 had toes cut; 1/6 cut at ankles. No image cut higher than ankles, so degradation is mild — most of body visible across all 6. Camera distance failed completely though — all 6 showed subject "basically the full frame" instead of small-in-frame as the "across the street" prompt intended. 3rd-person framing was 6/6 correct (no selfie defaults). Aesthetic: looks AI-generated to a human eye but quality isn't poor — pose, scene, and outfit all coherent.
- **Juggernaut:** Won the headline framing test 6/6 (every image showed full body, no cropping at all) — best framing of any base so far on this scenario. But the aesthetic is a problem: faces read as fake / doll-like across all 6, which is especially notable since Juggernaut is supposed to be a face-strength base. Interesting unintentional advantage: Juggernaut applies aggressive shallow DOF (blurred background) which effectively hides whatever the base would have rendered in the background — most images had "mostly OK" backgrounds because they were too blurred to evaluate. This could be a real production strength for full-body work where background coherence is otherwise hard. Camera-distance failure same as gonzalomo (all 6 on same side of street despite "across the street" prompt) — suggests this may be a base-agnostic SDXL limitation, not a Juggernaut-specific weakness.
- **RealVisXL:** Very similar profile to Juggernaut on this scenario. Headline test: 5/6 full body, 1/6 cut at knees (slightly worse than Juggernaut's 6/6 but better than gonzalomo's 2/6). Face quality is equally bad as Juggernaut — fake/doll-like across all 6. Backgrounds and bodies slightly better than Juggernaut's. Net: roughly tied with Juggernaut on this scenario. **Aesthetic ranking on scenario 2 so far:** gonzalomo > RealVisXL ≈ Juggernaut. Gonzalomo's framing miss is real but its faces don't look fake — that's a meaningful trade-off.
- **Methodology note (logged for the rest of this scenario + scenario 5):** "Across the street" / "medium distance" prompt instruction is being ignored by all bases tested so far (0/3 honor it). This is an SDXL ecosystem limitation, not a base-selection differentiator. Dropping camera-distance from rubric scoring; keeping it as observational only. If we need small-subject-in-frame shots for production, the fix is going to be inference-side (img2img with composition source, or aspect-ratio + crop discipline), not base selection.
- **Lustify:** Framing test passed strongly (5/6 full body, only 1 toe-cut). But faces melted across all 6 — explicit hard fail on the anatomy criterion (`❌ Distorted face`). Backgrounds went surrealist — buildings melting "as if it was 400 degrees outside." This is the second consecutive scenario where Lustify's rubric numbers are decent but the actual images are unusable. **Pattern confirmed:** Lustify has a fundamental "looks weird" problem that's scene-independent. Likely a hard rule-out for production regardless of remaining scenarios.
- **miamodel:** 5/6 full body framing (1/6 knees-up). User noted overall structure of the images was well-done — pose, scene composition, body coherent. But faces bad and the overall material read of the image is "detailed clay modeling rather than real image" — texture/skin reads as sculpted material, not photographic. Aesthetically tied with Juggernaut and RealVisXL on this scenario (all three have the "looks fake / AI / non-photoreal" issue at full-body distance). Better than Lustify (which has actual melted faces, not just AI-looking ones).

**Final user ranking for scenario 2 (best → worst):**

1. **gonzalomo** — only base with actually good faces; worst on framing (hardest time hitting full body) but best overall image quality. "Take more tries to get a great result" vs the others' "only need a couple tries but you only ever get a half-assed result."
2. **Juggernaut ≈ RealVisXL** (tied) — different individual flaws (Juggernaut: doll faces + shallow DOF crutch; RealVisXL: similar fake-faces + slightly better backgrounds) but they average out to the same middling quality
3. **miamodel** — clay-modeling aesthetic, structurally fine but visually unconvincing
4. **Lustify** — worst; melted faces + surrealist backgrounds despite rubric pass

**Cross-model takeaway:** Scenario 2 was the hardest for all 5 bases — none of them produced consistently great output, every base had a fundamental flaw. gonzalomo's flaw (framing) is the cheapest to work around: more generations per keeper, but the keepers are actually keepers. The other bases' flaws (fake faces, melted faces, clay aesthetic) are quality ceilings — you can run 100 generations and never get to "production-ready" because the base's aesthetic capability tops out below the bar.

**Production implication: rejection-rate vs quality-ceiling is the real choice.** gonzalomo: higher rejection rate per batch, higher ceiling on accepted output. Others: lower rejection rate, lower ceiling. For paid-platform / Phase 5 NSFW especially, ceiling matters more than yield — a customer paying $20/month doesn't accept "looks AI." This argument cuts in gonzalomo's favor for the v3 production base, even though its rubric scores would suggest otherwise.

Headline framing test rankings (Juggernaut > RealVisXL ≈ miamodel ≈ Lustify > gonzalomo) are nearly INVERSE to aesthetic ranking. The "fake / AI-looking face at full-body distance" is shared across Juggernaut, RealVisXL, and miamodel — likely an SDXL-architectural pattern that hits face quality whenever the face is small relative to frame. gonzalomo doesn't have it.

**Dual-base hypothesis weakening slightly:** earlier I framed this as "gonzalomo for aesthetic, RealVisXL for framing" → train two LoRAs. But user's framing suggests the trade-off is rejection-rate not quality, which means single-base (gonzalomo) + accepting more generations per keeper might beat dual-base + inference discipline. Need to see scenarios 3-5 before deciding.
- **Cross-model takeaway:** _TBD after all 5 bases tested for this scenario_

### Scenario 3 — Mirror selfie composition

- **gonzalomo:** Hardest scenario so far. 2/6 had a recursive-mirror artifact — a phantom second mirror behind the woman showing her also taking a mirror selfie (creates the appearance of two people in the scene). 4/6 had correct mirror physics (one person, one reflection). Framing fell short: 0/6 hit full body (head to feet); average was upper-thigh-up, worst was knees-up. This is borderline against the rubric (which says "head to feet/thighs" — upper-thigh barely passes). Quality-wise the user only counted 1/6 as actually production-real, the rest were "decent." This scenario is going to be a tough one for all bases — mirror physics is notoriously hard for diffusion models, expect low scores across the board.
- **Juggernaut:** Face quality improved meaningfully — read as "wearing too much makeup" rather than the fake-doll problem from scenario 2. That's a real upgrade since "too much makeup" is a natural-human failure mode (relatable, fixable with prompt tuning) vs "fake doll" being an AI failure mode (architectural). Outfit-following fail: 3/6 had wrong bottoms (shorts instead of prompted sweatpants — Juggernaut didn't have this on scenario 1's hoodie). Anatomy issues in some images (broken hands, duplicate phones). Mirror physics: 4/6 OK, 2/6 recursive-mirror artifact (one cleverly had reflection leaning against the phantom mirror — clever-but-still-wrong solve). 0/6 hit full body framing — same as gonzalomo. **Net rubric-only:** mixed across criteria, comparable to gonzalomo on rubric pass-rate even though specific failure modes differ.
- **RealVisXL:** Rubric leader for scenario 3 — score 4, passing most criteria with minor caveats. *Aesthetic concerns (qualitative, not scored):* none of the 6 are production-quality. The images that do pass the basic rubric criteria still look awkward — either awkward body positions or awkward backgrounds. So RealVisXL hits the highest rubric score on this scenario but doesn't translate that into more production-ready output than gonzalomo/Juggernaut. The "rubric pass but unposted-able" failure mode is becoming a pattern for the SDXL-derivative bases (RealVisXL here, Lustify in scenarios 1 and 2).
- **(Lustify, miamodel pending)**
- **Cross-model takeaway:** _TBD after all 5 bases tested for this scenario_

### Scenario 4 — Tier-3 lingerie / NSFW

- **(pending)**
- **Cross-model takeaway:** _TBD_

### Scenario 5 — Outdoor full body, golden hour

- **(pending)**
- **Cross-model takeaway:** _TBD_

---

## Per-base aesthetic fingerprint summary

Filled in after all scenarios are done. One-paragraph "what does this base feel like" summary per base, derived from observations across all 5 scenarios.

### gonzalomoXLFluxPony_v40

_TBD_

### Juggernaut XL v9

_TBD_

### RealVisXL v4

_TBD_

### Lustify

_TBD_

### miamodel

_TBD_

---

## Decision

Filled in after all bases tested.

**Production base for v3 training:** **gonzalomoXLFluxPony_v40** (single-base path)

**Decision date:** 2026-05-10 (mid-scenario-3, before completing scenarios 4-5 — pattern was clear enough to call it early)

**Reasoning:**
- gonzalomo had the highest aesthetic ceiling across every scenario tested (1, 2, 3) — the only base whose passing images don't read as obviously AI / fake-doll / clay-modeling
- Other bases (Juggernaut, RealVisXL, miamodel) hit better rubric scores in some scenarios but consistently produced "rubric pass / not actually posted-able" output — a pattern that became unmistakable by scenario 3
- Lustify ruled out (melted faces + surreal backgrounds across every scenario despite rubric passes)
- Production trade-off favors gonzalomo: "more tries to get a great result" beats "fewer tries for a half-assed result," especially for paid-platform content where customer-perceived authenticity is what they're paying for
- Dual-base hypothesis weakened — the trade-off proved to be rejection-rate vs ceiling, not framing-vs-aesthetic across complementary domains. Single-base on the high-ceiling option is the right call.

**Known gonzalomo limitations to prompt-engineer around (next session focus):**
- Full-body framing weak (scenario 2: 2/6 strict pass; most images cropped at toes or ankles)
- Mirror physics flaky (scenario 3: 2/6 recursive-mirror artifact)
- Minor modesty slips (scenario 1: 1/6 unzipped showing cleavage despite enhanced negative)
- Camera distance ("across the street") doesn't honor — confirmed ecosystem-wide, not gonzalomo-specific

**Skipped scenarios:** 4 (tier-3 lingerie NSFW) and 5 (outdoor full body, golden hour) NOT tested across all 5 bases. Decision made on scenarios 1-3 alone. Should re-test scenario 4 on gonzalomo solo before v3 training to confirm it produces sellable NSFW for Phase 5 — that's the gating use case and we have no current data on it.

**If single-base:**
- v3 training plan: clone `maya_v2.yaml` → `maya_v3.yaml`, change `model.name_or_path` to `<chosen-base>`, run on RunPod 4090. ~1hr / $3-5.

**If dual-base (one for tier-2, one for tier-3):**
- Tier-2 base: _TBD_
- Tier-3 base: _TBD_
- v3 training plan: train two LoRAs (`maya_v3_<tier2>.yaml`, `maya_v3_<tier3>.yaml`). Same dataset, different `name_or_path` each. ~2hr / $6-10 total.
- Inference discipline: pick the LoRA that matches the content tier you're producing. Document in `prompts.md`.

**If no clear winner:**
- Consider IP-Adapter test (~30 min in Draw Things).
- Fallback: accept gonzalomo's compromises, document tier-3 as "not yet production-quality."

---

## Open questions raised by the testing

(Fill in as they come up — feeds back into `V3_PLANNING.md` open questions section.)

- 
