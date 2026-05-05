# Setup — Production Stack

The stack runs in two stages. Stage 1 is your current Mac (free, prototyping). Stage 2 is cloud (paid by the hour, where the real workflow lives).

---

## Hardware reality check

| | Your machine (M1 Pro 16GB) | Stage 2 target (RunPod 4090 24GB) |
|---|---|---|
| SDXL image (1024px) | 30–90 sec | ~3 sec |
| Flux.1-dev image | 3–5 min if it fits | ~10 sec |
| Train a Flux LoRA | not viable | 1–3 hours |
| Wan / Hunyuan video | no Mac support | 2–5 min per clip |

The Mac is **fine for SDXL prototyping** (Phase 1 in `PLAN.md`) and nothing beyond.

---

## Stage 1 — Local Mac (Phase 1)

### Install

1. **Draw Things** — App Store, free, native Apple Silicon. (Alternatives: DiffusionBee is simpler but more limited; ComfyUI on Mac is more powerful but a Python setup that will fight you. Start with Draw Things.)
2. Open it once so it creates `~/Library/Containers/com.liuliu.draw-things/Data/Documents/Models/` (or wherever it tells you on first run).

### Models to download from Civitai

You want **uncensored photorealistic SDXL bases**. Civitai requires a free login to download. Pick **one or two** to start — don't hoard, each is 6–7 GB.

- **Lustify SDXL** — current go-to for photoreal NSFW-capable. Strong on faces.
- **RealVisXL V4** — extremely photoreal, more SFW-leaning, great for "natural daylight portrait" looks.
- **BigASP v2** — known for amateur-photography aesthetic.
- **Pony Realism** — Pony-derivative with strong prompt-following; useful if you find the others ignore your prompt.

Drop the `.safetensors` file into Draw Things' models folder, restart the app. Model appears in the model dropdown.

### First-image walkthrough

1. Pick the model. Set resolution **1024×1024** (SDXL native — anything else degrades fast).
2. Sampler: **DPM++ 2M Karras**. Steps: **25–30**. CFG: **5–7**.
3. Start with a simple prompt, e.g. *"photo of a 24-year-old woman, brown hair, hazel eyes, soft natural light, shallow depth of field, 35mm photography"*. Negative prompt: *"cartoon, illustration, painting, low quality, deformed, extra fingers, watermark, text"*.
4. **Lock the seed** (set a number like `1234567`) once you get a face you like. From there, tweak the prompt — clothing, pose, location — while keeping the seed and core identity tokens fixed. This is poor-man's character consistency until you train a LoRA in Stage 2.

### What "good enough" looks like

You're done with Phase 1 when you have:
- 30–50 reference shots that all look like the **same person** (same face, same vibe), saved to `personas/<name>/reference/`
- A locked prompt formula written into `personas/<name>/prompts.md`
- A filled-out `personas/<name>/persona.md` identity card

Consistency on Mac will be ~70–80% — some shots drift. That's fine; the point is the LoRA in Stage 2 fixes it permanently.

---

## Stage 2 — Cloud (Phase 2 onward)

*Stub — fill in when Phase 1 exits.*

### Provider: RunPod

- Pay-as-you-go, no commitment. Spin up → batch produce → spin down.
- Use a **Community Cloud RTX 4090** (~$0.34–0.44/hr) over Secure Cloud unless you need persistence between sessions.
- Use a **Network Volume** (~$0.07/GB/mo) so models, LoRAs, and outputs persist across pod restarts. Otherwise every spin-up re-downloads ~30 GB of models.

### Template

Pick a **ComfyUI** pre-built template (RunPod's community templates have several). Avoid Automatic1111 — ComfyUI is the modern standard and every tutorial assumes it.

### Workflow stages on cloud

1. **LoRA training** (Phase 2) — Kohya_ss or AI-Toolkit, both have RunPod templates. Inputs: 30–50 reference shots + captions. Output: one `.safetensors` file (~150–300 MB) → save to `personas/<name>/lora/`.
2. **Image generation** (Phase 2 ongoing) — ComfyUI with Flux.1-dev base + your LoRA + your prompts.md.
3. **Video** (Phase 3) — Wan 2.1 or HunyuanVideo, image-to-video. Feed in still images from step 2.
4. **Optional**: LivePortrait for face animation, ElevenLabs (SaaS) for voice.

### Cost estimate

- One full content batch (week of content for one persona): ~2 hr of GPU time = ~$0.80–1.50
- Initial LoRA training: ~$2–5
- Video generation eats more time: budget ~$5–10/wk per persona once Phase 3 is running

---

## What's intentionally not here

- ComfyUI workflow JSON files — those go in `personas/<name>/` once you've tuned one for that specific character, not as boilerplate
- Specific Civitai model versions — they update; just grab whatever's currently top-rated in the "SDXL base — photorealistic" category at the time you read this
- Detailed RunPod commands — the templates are GUI-driven; tutorials get stale fast, follow current docs at runpod.io

---

## Gotchas learned the hard way

Things that wasted time in the first session — write down so we don't repeat them.

### Civitai

- **The "Show Mature Content" toggle can be missing from `civitai.com/user/account`** for some accounts (Cmd+F for "mature" returns zero hits). Documented bug + possible regional gating. Workaround: skip Civitai for checkpoints, use Draw Things' built-in catalog. LoRAs can still be downloaded from Civitai without the toggle (NSFW LoRA browsing isn't gated the same way).
- **"Pony" base model ≠ "SDXL 1.0" base model.** Pony is an SDXL derivative with completely different prompt syntax (`score_9, score_8_up, ...`) and incompatible LoRA weights. When picking a LoRA, the **Base Model** field on its Civitai page must say literally **`SDXL 1.0`** to stack with Juggernaut/RealVis/etc. Don't pick Pony, Illustrious, SD 1.5, or Flux LoRAs.
- **Search results show Workflows + LoRAs alongside Checkpoints by default.** Use the funnel filter → Model Type = Checkpoint to find actual base models.
- **LoRA file size doesn't predict quality.** SDXL LoRAs run from ~5 MB (low-rank/LoCon) to ~600 MB (high-rank/full LyCORIS). All ranges work. The only check that matters is Base Model field.

### Draw Things on M1 Pro 16GB

- Built-in catalog is the easiest path — has Juggernaut XL, RealVisXL, DreamShaper XL etc. without Civitai's gates.
- Pick **8-bit variants** when offered — runs faster on 16GB unified memory with no perceptible quality loss.
- "Try recommended settings →" under Model section auto-configures sampler/steps/resolution for the loaded model. Use it any time you swap models.
- 8-bit Juggernaut XL v9 generates at ~30–60 sec/image at 1024×1024, 28 steps. That's the working baseline.

### Prompt engineering pitfalls

- **Trigger tokens are a menu, not a buffet.** A LoRA's docs may list 8 trigger words; using all of them stacks effects in destructive ways. Specifically, tokens like `lowres`, `webcam photo`, `grainy` literally tell the model to produce low-quality output — the LoRA may have been trained to interpret them as "make it look amateur" but they often degrade output instead. Use 2–3 tokens max, prefer the positively-framed ones (`amateur photo`, `photorealistic`, `film grain`).
- **"Ugly" / "average looking" / "no makeup" overcorrects.** Juggernaut has a strong "polished AI portrait" baseline; pushing too hard against it kills the attractiveness needed for monetization. The right level is "attractive but candid" not "amateur and plain".
- **Low CFG (≤3) distorts faces.** With a LoRA active, run CFG **4.5–5**. Lower CFG = looser prompt adherence = asymmetric eyes, weird features, "she looks disabled" outputs.
- **Add anti-distortion to the negative prompt** when faces look off: `asymmetric eyes, lazy eye, crossed eyes, distorted face, deformed face`.
- **The "AI look" has a quality ceiling on SDXL.** Even with the right prompt + LoRA + settings, Juggernaut/RealVis-class models retain a recognizable "AI portrait" fingerprint. The real fix is either (a) img2img from a real reference photo, (b) ControlNet for pose/composition, or (c) moving to Flux + a custom-trained LoRA on cloud GPUs (Phase 2).
