# Prompts — `<name>`

The locked prompt formula for this persona. Update as you iterate; this file is the source of truth for what gets generated.

---

## Identity tokens (always include)

These are the visual anchors that must appear in every positive prompt to keep the face consistent. Keep this list **short and specific** — long token lists dilute SDXL.

```
<paste identity tokens here, e.g.>
24 year old woman, brown wavy hair shoulder length, hazel eyes, light freckles across nose, slim athletic build
```

---

## Style tokens

The aesthetic / camera / lighting fingerprint. This is what makes "her photos" look like a coherent feed.

```
<paste style tokens here, e.g.>
shot on 35mm film, natural daylight, shallow depth of field, soft warm tones, candid composition
```

---

## Negative prompt (always include)

```
cartoon, illustration, anime, painting, 3d render, cgi, low quality, blurry, deformed, extra fingers, extra limbs, watermark, text, signature, logo
```

---

## Locked seed (Phase 1 only)

Until the LoRA exists, lock the seed for consistency.

- **Seed:** *(set after first good face is found, e.g. `1234567`)*
- **Sampler:** DPM++ 2M Karras
- **Steps:** 28
- **CFG:** 6
- **Resolution:** 1024×1024 (SDXL native)

Once the LoRA is trained (Phase 2), seed-locking is no longer needed — the LoRA enforces identity.

---

## Shot variations

A library of prompt fragments to combine with the identity + style tokens. Add to this as you discover what works.

### Setting
- *bedroom, soft afternoon light through window*
- *coffee shop, sitting by window with latte*
- *gym, post-workout, mirror selfie*
- *...*

### Outfit
- *oversized white t-shirt, no makeup*
- *black workout set, hair tied up*
- *summer sundress, outdoor*
- *...*

### Pose / expression
- *looking at camera, slight smile*
- *candid, looking away, laughing*
- *mirror selfie, phone visible*
- *...*

---

## Things this persona does NOT post

Define before you start. Edits are fine; mid-stream pivots into content you weren't comfortable with isn't.

- *e.g. no full nudity on IG (saved for paid platform)*
- *e.g. no real-location tags*
- *e.g. ...*

---

## Iteration log

Notes on what's worked / failed. Append-only — keeps you from re-trying dead ends.

| Date | Change tested | Result |
|---|---|---|
| | | |
