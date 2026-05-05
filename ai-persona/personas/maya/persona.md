# Persona — `maya`

Identity card. The persona drives the look, not the other way around.

---

## Public identity

- **Display name:** Maya Cole
- **Handle:** *(check availability before committing — try `@mayacole`, `@maya.cole`, `@itsmayacole`, `@mayacole_` on IG, TikTok, Fanvue)*
- **Bio (one-liner):** *(fill in)*
- **Disclosure:** *(decide — disclosed AI / undisclosed; see PLAN.md Phase 4 tradeoff)*

---

## Visual identity

Locked tokens that go into every prompt and ultimately get baked into the LoRA.

- **Apparent age:** ~22
- **Ethnicity / heritage cues:** ambiguous Mediterranean / mixed European
- **Hair:** very dark / black, long, wavy, naturally parted on the side
- **Eyes:** dark brown
- **Build:** slim-fit athletic. Chest is steerable in production — the LoRA learned a range from medium to full because the training set spans both. Default output skews medium; explicit prompt tokens (`large breasts`, `busty`) + higher LoRA weight (75–80%) reliably produce fuller. Treat chest size as a prompt-time dial, not a fixed identity trait.
- **Distinguishing features:** light freckles across nose and upper cheeks, full lips, soft eyeliner
- **Style aesthetic:** girl-next-door who knows she's hot — natural, candid, slight alt edge but not aggressive. Think "phone selfies in good light," not "studio glamour."

---

## Niche & voice

- **Niche:** *(pick one — recommended: cozy lifestyle / "soft alt" / casual fitness. Avoid generic "model" — needs a lane that drives content)*
- **Personality:** *(3–5 adjectives + 1 sentence — fill in)*
- **Voice / caption tone:** *(playful / dry / earnest — write 2 sample captions before launch)*
- **Hometown / setting:** *(grounds the lore — recommend a real city that explains the indoor-mostly aesthetic, e.g. Toronto, Austin, Brooklyn — consistency matters more than realism)*

---

## Audience & monetization

- **Target audience:** *(fill in — who's the buyer? age range, what they want)*
- **Free funnel platforms:** IG primary; consider TikTok + Reddit secondaries
- **Paid platform:** Fanvue *(re-evaluate at Phase 5 — landscape shifts)*
- **Monetization tiers:** *(fill in once Phase 5 is in sight)*

---

## Posting plan

- **IG cadence:** *(target — e.g. 1 feed post + 2 stories daily, 3 reels/wk)*
- **Cross-post:** *(which content gets repurposed where)*
- **Schedule tool:** *(manual / Later / Buffer / Metricool)*

---

## Risk notes

- **Bans / pivots:** *(fill in — if this account dies, relaunch plan?)*
- **Content limits:** *(define before launch — what will you NOT post?)*

---

## Status

| | |
|---|---|
| Phase 1 (reference shots) | ✅ 31 keepers (5 core / 19 standard / 7 variation), 3 culled (1 face drift, 2 anatomy bug — mirror selfie / arm-reaching hybrid) |
| Phase 2 (LoRA trained) | ✅ `maya_lora_v1.safetensors` (rank 16, 2000 steps, SDXL 1.0 base). Validated cross-base: identity holds on Juggernaut XL v9, RealVisXL v4, and gonzalomoXLFluxPony_v40. **Production stack: gonzalomo + LoRA at 60–78%** (best photorealism, matches Phase 1 aesthetic). LoRA stored at `personas/maya/lora/maya_lora_v1.safetensors`. Training config archived at `personas/maya/maya.yaml`. |
| Phase 3 (video pipeline) | 🟡 next |
| Phase 4 (live on IG) | ⏳ |
| Phase 5 (paid platform) | ⏳ |
| Created | 2026-05-04 |
| Last updated | 2026-05-05 |
