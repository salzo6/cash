# Setup — Production Stack

The stack runs in two stages. Stage 1 is your current Mac (free, prototyping). Stage 2 is cloud (paid by the hour, where the real workflow lives).

---

## Hardware reality check

| | Your Mac (M1 Pro 16GB) | RunPod 4090 24GB | RunPod H100 80GB |
|---|---|---|---|
| SDXL image (1024px) | 30–90 sec | ~3 sec | ~2 sec |
| Flux.1-dev image | 3–5 min if it fits | ~10 sec | ~5 sec |
| **Train SDXL LoRA** ⭐ | not viable | **30–60 min** | 20 min |
| Train Flux LoRA | not viable | 1–3 hours | 1 hour |
| Wan 2.2 / HunyuanVideo I2V clip | not viable | 2–5 min | 1–2 min |
| HunyuanVideo-Avatar clip | not viable | OOM/marginal | 3–8 min |
| Hourly cost | n/a | $0.34–0.44 | $2–3 |

The Mac is **fine for Phase 1 SDXL prototyping** and nothing beyond. From Phase 2 onward, the work moves to RunPod.

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

The architectural decision for cloud work: **SDXL primary, not Flux.** Driven by content priorities (videos > semi-provocative > NSFW > vlogs) — see `PLAN.md` for full reasoning. Bottom line: SDXL has the mature NSFW ecosystem (Lustify, Pony Realism, BigASP), and the same persona LoRA stacks with multiple SDXL bases for different content tiers.

### Provider: RunPod

- Pay-as-you-go, no commitment. Spin up → batch produce → spin down.
- For LoRA training + image generation: **Community Cloud RTX 4090** (~$0.34–0.44/hr; spot pricing sometimes $0.20/hr).
- For HunyuanVideo-Avatar (vlogs, character replacement): **H100 80GB** (~$2–3/hr) — required for production-quality avatar work.
- Use a **Network Volume** (~$0.07/GB/mo) so base models persist across pod restarts. Otherwise every spin-up re-downloads ~30 GB of models.

### Templates

- **AI-Toolkit** for LoRA training — preferred over Kohya. Simpler UI, modern defaults, native SDXL + Flux support.
- **ComfyUI** for image generation and video pipelines. Avoid Automatic1111 — ComfyUI is the modern standard and every tutorial assumes it.

### Workflow stages on cloud

**Phase 2 — Train the persona LoRA (one-time per persona, ~$5-15)**

1. Spin up RunPod 4090 + AI-Toolkit template
2. Upload `personas/<name>/reference/` folder (already has `.png` images + `.txt` captions paired)
3. AI-Toolkit detects pairs automatically — no captioning work needed inside RunPod
4. Run SDXL LoRA training (~30–60 min)
5. Validate output across **three base models**:
   - **Juggernaut XL** → tier-2 semi-provocative + SFW
   - **Lustify** (or Pony Realism if Lustify Civitai-gated) → tier-3 full NSFW
   - **RealVisXL** → backup SFW
6. Download the `.safetensors` (~150–300 MB) to `personas/<name>/lora/`

**Phase 3a — Image-to-video pipeline (general clips)**

- Generate a still frame: ComfyUI with persona SDXL LoRA + appropriate base (Juggernaut for SFW/semi, Lustify for NSFW)
- Feed to **Wan 2.2 I2V** or **HunyuanVideo-I2V** for animation
- Output: 2–10 second clips, 4090 sufficient
- Use case: dance replacement (driving motion video + persona reference), generated motion from prompts

**Phase 3b — Avatar/vlog pipeline (character-driven video)**

- **HunyuanVideo-Avatar** on RunPod H100 (4090 marginal/OOM for production quality)
- Inputs: persona reference image (from SDXL LoRA + Juggernaut) + driving signal (motion video for dance, or audio for talking head)
- Pair with **ElevenLabs** voice for vlog content
- Output: lip-synced/motion-driven character video

**Optional add-ons:**
- **LivePortrait** for cheap face animation if HunyuanVideo-Avatar is overkill for a specific clip
- **Reactor / FaceFusion** for simple face swap on existing video (lower quality but very fast)

### Cost estimate (per persona)

| Activity | Hardware | Cost |
|---|---|---|
| Initial LoRA training | 4090, ~30-60 min | $2-5 |
| Weekly image batch (~50 images) | 4090, ~1-2 hr | $0.50-1 |
| Weekly short video batch (~10 clips) | 4090, ~3-5 hr | $1.50-3 |
| Weekly avatar/vlog video (~3-5 clips) | H100, ~1-2 hr | $3-6 |
| **Monthly total per active persona** | mixed | **$30-60** |

Multiple personas share base model storage (Network Volume) so cost scales sub-linearly — 4 personas ≈ $80-200/mo, not 4× single-persona cost.

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
- **The "AI look" has a quality ceiling on stock SDXL.** Even with the right prompt + LoRA + settings, Juggernaut/RealVis-class models retain a recognizable "AI portrait" fingerprint. The real fix is (a) img2img from a real reference photo at strength 0.4-0.5, (b) ControlNet for pose/composition, or (c) training a custom persona LoRA in Phase 2 — once the LoRA encodes the specific face, it generates much more cohesively than stock SDXL alone.
- **NSFW-trained models (Lustify, Pony Realism) ignore "be modest" prompts.** Their training pushes hard toward provocative output. For tier-2 semi-provocative IG content, swap to Juggernaut XL or RealVisXL — they obey modest framing. The same persona LoRA works on all three.
- **Captions for LoRA training should describe what *varies* (clothing, setting, pose), NOT what's constant about the persona (hair color, eye color, freckles).** The trigger word + visual data teaches constants automatically. Including constants in every caption can hurt because the model learns them as separate concepts to be told vs. baked into the trigger.
- **Img2img canvas aspect ratio must match the source image's aspect.** Mismatched aspects produce a "superimposed on a generated background" mess instead of blending. Pick aspect first (832×1216 for 4:5 IG vertical is the standard), then generate everything at that aspect.
