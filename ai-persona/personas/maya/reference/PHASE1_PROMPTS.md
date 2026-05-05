# Phase 1 — Original Generation Prompts

Reference log of the SDXL prompts used to generate each Phase 1 image. Preserved for:
- **Reproducibility** — combined with seed + base model, any image can be regenerated
- **Phase 2 troubleshooting** — knowing intent helps debug if LoRA outputs drift
- **Future persona templates** — the variation pattern is reusable for spinning up Maya v2 or other personas

---

## Generation context

| | |
|---|---|
| **Seed (locked, all 33 images)** | `1784676583` |
| **Base model** | SDXL base only (not Juggernaut/RealVis-specific — fill in exact checkpoint when known) |
| **LoRA used** | None — the `gonzalomo-amateur` token in prompts was inert text, ignored by the model |
| **Resolution** | 832 × 1216 (4:5 vertical, IG feed standard) |
| **Sampler / Steps / CFG** | DPM++ 2M Karras / 28 / 5 (best guess from session — confirm before regenerating) |

## Notable patterns

The model rendered scenes with these tendencies:

- **More provocative than prompted.** Several prompts asked for clothed/casual setups but the model gravitated toward partial nudity or more revealing framings. This is a model bias, not a prompt error.
- **Iterative breast size adjustments.** Some prompts have `medium-large`, `medium-big`, or `big breasts` instead of plain `medium breasts` — these were edits to match the visual size the model was already producing on earlier seeds, for consistency.
- **Approximate clothing.** Specific clothing items (e.g. "summer sundress", "white linen top") sometimes rendered loosely — colors/cuts matched intent without being literal.
- **Loose pose interpretation.** A few prompts say `looking at camera` but rendered with the gaze off-camera (e.g. 003), or specified settings (e.g. `bathtub with bubbles` in 005, `frosted glass shower` in 023) that didn't appear in the final image.

## Locked identity / style block

Most prompts share this base structure:

```
amateur photo, photorealism, photorealistic, 1girl, solo, fair skin, detailed skin texture, 
skin fuzz, skin pores, black hair, parted on the side hair, black eyes, eyeliner, 
medium breasts, fit body, [VARIATION SECTION], gonzalomo-amateur
```

A handful of prompts (002, 014, 030, 031) use a slightly shorter identity block — see individual entries.

---

## Prompts by image

### Core (5)

**001_selfie_indoor_blacktank.png**
```
amateur photo, photorealism, photorealistic, 1girl, solo, fair skin, detailed skin texture, skin fuzz, skin pores, standing, selfie, 24mm lens, upper body, black hair, parted on the side hair, black eyes, looking at viewer, eyeliner, closed mouth smirk, black tank top, cleavage, medium breasts, fit body, bare shoulders, indoors, living room, white walls, natural lighting, gonzalomo-amateur
```

**002_closeup_indoor_neutral.png**
```
amateur photo, photorealism, 1girl, solo, face shot, fair skin, black hair, parted on the side, black eyes, heavy eyeliner, looking directly at camera, soft natural light, neutral expression, gonzalomo-amateur
```

**003_closeup_indoor_freckles.png**
```
amateur photo, photorealism, photorealistic, 1girl, solo, fair skin, detailed skin texture, skin fuzz, skin pores, black hair, parted on the side hair, black eyes, eyeliner, medium breasts, fit body, close-up portrait, looking at camera, sunlight hitting one side of face, strands of hair over forehead, neutral expression, soft natural lighting, gonzalomo-amateur
```
*Note: rendered with gaze off-camera despite prompt asking for "looking at camera".*

**004_selfie_indoor_blacktank_smile.png**
```
amateur photo, photorealism, photorealistic, 1girl, solo, fair skin, detailed skin texture, skin fuzz, skin pores, standing, selfie, 24mm lens, upper body, black hair, parted on the side hair, black eyes, looking at viewer, eyeliner, closed mouth smirk, black tank top, cleavage, medium breasts, fit body, bare shoulders, indoors, living room, white walls, natural lighting, gonzalomo-amateur
```
*Note: identical prompt to 001, different aspect ratio.*

**005_closeup_bath_freckles.png**
```
amateur photo, photorealism, photorealistic, 1girl, solo, fair skin, detailed skin texture, skin fuzz, skin pores, black hair, parted on the side hair, black eyes, eyeliner, medium breasts, fit body, nude, full body, sitting on edge of bathtub, bubbles in tub, looking at camera, bathroom tiles, soft overhead light, gonzalomo-amateur
```
*Note: rendered as nude upper body with plain background; bathtub/bubbles/tile elements not visible in final.*

### Standard (21)

**006_mirror_bedroom_tshirt.png**
```
amateur photo, photorealism, photorealistic, 1girl, solo, fair skin, detailed skin texture, skin fuzz, skin pores, black hair, parted on the side hair, black eyes, eyeliner, medium breasts, fit body, full body mirror selfie, holding phone in front of face, standing, white tshirt and denim shorts, bedroom interior, unmade bed visible behind, soft morning light from window, slight smile, gonzalomo-amateur
```

**007_mirror_bathroom_greyhoodie_upperbody.png**
```
amateur photo, photorealism, photorealistic, 1girl, solo, fair skin, detailed skin texture, skin fuzz, skin pores, black hair, parted on the side hair, black eyes, eyeliner, medium breasts, fit body, mirror selfie, waist up, holding iphone, oversized grey hoodie, no makeup look, bathroom interior, white tile, harsh overhead vanity lighting, neutral expression, gonzalomo-amateur
```

**008_mirror_bathroom_greyhoodie_fullbody.png**
```
amateur photo, photorealism, photorealistic, 1girl, solo, fair skin, detailed skin texture, skin fuzz, skin pores, black hair, parted on the side hair, black eyes, eyeliner, medium breasts, fit body, mirror selfie, waist up, holding iphone, oversized grey hoodie, no makeup look, bathroom interior, white tile, harsh overhead vanity lighting, neutral expression, gonzalomo-amateur, no pants
```

**009_selfie_car_whitetshirt.png**
```
amateur photo, photorealism, photorealistic, 1girl, solo, fair skin, detailed skin texture, skin fuzz, skin pores, black hair, parted on the side hair, black eyes, eyeliner, medium breasts, fit body, selfie, 24mm lens, sitting in driver seat of car, white t-shirt, cleavage, soft natural daylight from windshield, looking at camera, slight smirk, gonzalomo-amateur
```

**010_mirror_gym_blackset.png**
```
amateur photo, photorealism, photorealistic, 1girl, solo, fair skin, detailed skin texture, skin fuzz, skin pores, black hair, parted on the side hair, black eyes, eyeliner, medium breasts, fit body, mirror selfie at gym, full body, holding phone, black sports bra and high-waist leggings, post-workout, slightly flushed face, harsh overhead gym lighting, weight rack visible behind, focused expression, gonzalomo-amateur
```

**011_selfie_outdoor_park_whitetank.png**
```
amateur photo, photorealism, photorealistic, 1girl, solo, fair skin, detailed skin texture, in fuzz, skin pores, black hair, parted on the side hair, black eyes, eyeliner, medium-large breasts, fit body, outdoor selfie, 24mm lens, upper body, white linen top, golden hour sunlight on face, soft warm backlight, blurred park background, soft smile with white teeth, gonzalomo-amateur
```

**012_selfie_bedroom_lacelingerie.png**
```
amateur photo, photorealism, photorealistic, 1girl, solo, fair skin, detailed skin texture, skin fuzz, skin pores, black hair, parted on the side hair, black eyes, eyeliner, big breasts, fit body, mirror selfie, full body, holding phone, black lace lingerie set, standing in bedroom, soft evening lamp light, intimate atmosphere, slight smirk, gonzalomo-amateur
```

**014_candid_kitchen_whiteshirt.png**
```
amateur photo, photorealism, 1girl, solo, fair skin, detailed skin texture, skin pores, black hair, parted on the side, black eyes, eyeliner, medium breasts, fit body, upper body, oversized white button-down shirt, unbuttoned at top, holding a white ceramic mug, standing in kitchen, soft morning light, messy hair look, neutral expression, gonzalomo-amateur
```

**015_selfie_indoor_whitetank.png**
```
amateur photo, photorealism, photorealistic, 1girl, solo, fair skin, detailed skin texture, skin fuzz, skin pores, standing, selfie, 24mm lens, upper body, black hair, parted on the side hair, black eyes, looking at viewer, eyeliner, closed mouth smirk, white tank top, cleavage, medium breasts, fit body, bare shoulders, indoors, living room, white walls, natural lighting, gonzalomo-amateur
```

**016_selfie_indoor_blacktank_sunlit.png**
```
amateur photo, photorealism, photorealistic, 1girl, solo, fair skin, detailed skin texture, skin fuzz, skin pores, standing, selfie, 24mm lens, upper body, black hair, parted on the side hair, black eyes, looking at viewer, eyeliner, closed mouth smirk, black tank top, cleavage, medium breasts, fit body, bare shoulders, outside, back yard, white walls, natural lighting, gonzalomo-amateur
```

**017_selfie_outdoor_sportstank.png**
```
amateur photo, photorealism, photorealistic, 1girl, solo, fair skin, detailed skin texture, skin fuzz, skin pores, standing, selfie, 24mm lens, upper body, black hair, parted on the side hair, black eyes, looking at viewer, eyeliner, closed mouth smirk, black tank top, cleavage, medium breasts, fit body, bare shoulders, outside, back yard, natural lighting, gonzalomo-amateur
```

**018_selfie_outdoor_blacktank.png**
```
amateur photo, photorealism, photorealistic, 1girl, solo, fair skin, detailed skin texture, skin fuzz, skin pores, standing, selfie, 24mm lens, upper body, black hair, parted on the side hair, black eyes, looking at viewer, eyeliner, closed mouth smirk, black tank top, cleavage, medium breasts, fit body, bare shoulders, outside, back yard, natural lighting, gonzalomo-amateur
```

**019_lying_bed_headshot.png**
```
amateur photo, photorealism, photorealistic, 1girl, solo, fair skin, detailed skin texture, skin fuzz, skin pores, black hair, parted on the side hair, black eyes, eyeliner, medium breasts, fit body, nude, full body, lying on white bedsheets, stomach down, looking over shoulder at camera, natural window light, messy hair, neutral expression, gonzalomo-amateur
```

**020_lying_bed_upperbody.png**
```
amateur photo, photorealism, photorealistic, 1girl, solo, fair skin, detailed skin texture, skin fuzz, skin pores, black hair, parted on the side hair, black eyes, eyeliner, medium breasts, fit body, nude, full body, lying on white bedsheets, stomach down, looking over shoulder at camera, natural window light, messy hair, neutral expression, gonzalomo-amateur
```

**021_lying_bed_fullbody.png**
```
amateur photo, photorealism, photorealistic, 1girl, solo, fair skin, detailed skin texture, skin fuzz, skin pores, black hair, parted on the side hair, black eyes, eyeliner, medium breasts, fit body, nude, full body, nice ass, lying on white bedsheets, stomach down, back arched, natural window light, messy hair, neutral expression, gonzalomo-amateur
```

**022_balcony_goldbikini_sunset.png**
```
amateur photo, photorealism, photorealistic, 1girl, solo, fair skin, detailed skin texture, skin fuzz, skin pores, black hair, parted on the side hair, black eyes, eyeliner, medium breasts, fit body, bikini, full body shot, standing on balcony, sunset golden hour, string bikini, hand behind head, ocean background, slight smile, gonzalomo-amateur
```

**024_mirror_outdoor_greenbikini.png**
```
amateur photo, photorealism, photorealistic, 1girl, solo, fair skin, detailed skin texture, skin fuzz, skin pores, black hair, parted on the side hair, black eyes, eyeliner, medium-big breasts, fit body, mirror selfie, full body, holding phone, micro bikini, backyard background visible in reflection, bright daylight, slight smirk, gonzalomo-amateur
```

**025_kitchen_whiteshirt_implied.png**
```
amateur photo, photorealism, photorealistic, 1girl, solo, fair skin, detailed skin texture, skin fuzz, skin pores, black hair, parted on the side hair, black eyes, eyeliner, medium-big breasts, fit body, full body shot, sitting on kitchen counter, white panties and cropped t-shirt, looking at camera, natural light from kitchen window, casual pose, gonzalomo-amateur
```

**026_mirror_bedroom_robe.png**
```
amateur photo, photorealism, photorealistic, 1girl, solo, fair skin, detailed skin texture, skin fuzz, skin pores, black hair, parted on the side hair, black eyes, eyeliner, medium breasts, fit body, mirror selfie, full body, holding phone, black silk robe open, revealing lingerie, bedroom interior, messy bed, warm indoor light, gonzalomo-amateur
```

**028_mirror_gymlocker_implied_sweaty.png**
```
amateur photo, photorealism, photorealistic, 1girl, solo, fair skin, detailed skin texture, skin fuzz, skin pores, black hair, parted on the side hair, black eyes, eyeliner, medium-big breasts, fit body, mirror selfie, full body, holding phone, sports bra and thong, gym locker room background, harsh lighting, sweaty skin, gonzalomo-amateur
```

**032_selfie_indoor_olivetank.png**
```
amateur photo, photorealism, photorealistic, 1girl, solo, fair skin, detailed skin texture, skin fuzz, skin pores, standing, selfie, 24mm lens, upper body, black hair, parted on the side hair, black eyes, looking at viewer, eyeliner, closed mouth smirk, green tank top, cleavage, medium breasts, fit body, bare shoulders, indoors, living room, white walls, natural lighting, gonzalomo-amateur
```

### Variation (7)

**013_selfie_pool_blackbikini.png**
```
amateur photo, photorealism, photorealistic, 1girl, solo, fair skin, detailed skin texture, skin fuzz, skin pores, black hair, parted on the side hair, black eyes, eyeliner, big breasts, fit body, selfie, 24mm lens, upper body, black bikini top, wet hair from swimming, poolside, bright midday sun, shallow depth of field, slight smile with teeth, gonzalomo-amateur
```

**023_closeup_indoor_wethair.png**
```
amateur photo, photorealism, photorealistic, 1girl, solo, fair skin, detailed skin texture, skin fuzz, skin pores, black hair, parted on the side hair, black eyes, eyeliner, medium breasts, fit body, nude, full body, standing in shower, frosted glass, water running down body, wet hair, looking at camera, soft lighting, gonzalomo-amateur
```
*Note: rendered as upper body indoor with wet hair; shower/frosted glass elements unclear in final.*

**027_fullbody_outdoor_whitebikini.png**
```
amateur photo, photorealism, photorealistic, 1girl, solo, fair skin, detailed skin texture, skin fuzz, skin pores, black hair, parted on the side hair, black eyes, eyeliner, medium-big breasts, fit body, full body shot, standing in tall grass, white bikini, sun flare, looking at camera, outdoor nature setting, golden hour, gonzalomo-amateur
```

**029_beach_blacktank.png**
```
amateur photo, photorealism, photorealistic, 1girl, solo, fair skin, detailed skin texture, skin fuzz, skin pores, black hair, parted on the side hair, black eyes, eyeliner, medium breasts, fit body, full body shot, standing on beach, wet sand, black one-piece swimsuit, high cut, looking at camera, overcast lighting, windblown hair, gonzalomo-amateur
```

**030_mirror_indoor_fullbody_whitecrop.png**
```
amateur photo, photorealism, 1girl, solo, fair skin, detailed skin texture, skin pores, black hair, parted on the side, black eyes, mirror selfie, full body, holding phone, wearing high-waisted mom jeans and a tight white crop top, laundry basket in background, fluorescent lighting, slight smirk, gonzalomo-amateur
```

**031_upperbody_hallway_sundress.png**
```
amateur photo, photorealism, 1girl, solo, fair skin, skin pores, black hair, parted on the side, full body, standing in narrow hallway, wearing a summer sundress, natural light from open door, looking at camera, hands in pockets, gonzalomo-amateur
```

**033_lying_bed_hairfanned.png**
```
amateur photo, photorealism, photorealistic, 1girl, solo, fair skin, detailed skin texture, skin fuzz, skin pores, black hair, parted on the side hair, black eyes, eyeliner, medium breasts, fit body, selfie, 24mm lens, upper body, lying on back on bed, looking down at camera, cleavage, messy hair on pillow, soft morning light, slight smile, gonzalomo-amateur
```
