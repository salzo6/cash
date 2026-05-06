# Upgrade Session — Phase 2.5 LoRA + Wan 14B I2V

One-day runbook for the LoRA v2 retrain + video model upgrade. Sequential — follow top-to-bottom.

**Estimated time:** ~3 hrs Mac work upfront + ~3 hrs cloud (mostly hands-off).
**Estimated cost:** ~$3–5 GPU time + ~$2/mo extra storage standing.

---

## Part 1 — Build the v2 dataset (Mac)

The v2 dataset is the whole game. Get this right, the rest is automated.

### 1.1 Generate cross-base bootstraps in Draw Things

Load **v1 Maya LoRA** on each of three bases. For each, generate ~30 candidates and hand-pick the strongest 4–6 (~12–17 cross-base keepers total).

| Base | LoRA weight | Notes |
|---|---|---|
| Juggernaut XL v9 | 80–95% | Polished — works for tier-2 / IG content |
| RealVisXL v4 | ~91% | Photoreal but harsher lighting |
| Lustify | 80% (calibrate) | First time on this base — start at 80%, adjust if face drifts |

Use the same prompts you've been using in `personas/maya/prompt_library.md`. Reject anything where the face looks "off" — quality bar is high. Multi-base training fails if the dataset has weak images.

### 1.2 Source 5–10 face-obscured real photos

Real photos of *anyone* (you, family, stock photos), with the face not actually visible — behind hair, hands, hat, motion blur, side profile partially turned. Purpose: ground the model in real skin/lens/lighting characteristics without contaminating identity.

Don't overthink this — phone photos are fine. Just realistic photos.

### 1.3 Build the v2 reference tree

Copy `personas/maya/reference/` → `personas/maya/reference_v2/` on Mac (preserves v1 captions and folder structure). Then add **one new folder** (`real_obscured/`) and **distribute the cross-base bootstraps into existing folders** based on what each image is, not where it came from:

```
personas/maya/reference_v2/
  core/             # v1 close-ups (5) + cross-base FACE close-ups → ~12–15 total
  standard/         # v1 standard (21) + cross-base BODY/POSE shots
  variation/        # v1 variation (7) + cross-base UNUSUAL ANGLES (if any)
  real_obscured/    # NEW — face-obscured real photos (5–10)
```

Folders represent **image type**, not source. A close-up face shot belongs in `core/` whether it came from gonzalomo, Juggernaut, or Lustify — that way it gets the `num_repeats: 2` boost meant for face-detail training. Segregating by source would silently waste the cross-base face shots' gradient signal.

`real_obscured/` stays separate because its captions need a different config (`caption_dropout_rate: 0.10` vs `0.05` elsewhere — face features aren't in the image, so caption-dropping reduces overfitting on unreliable face tokens).

Target final count: **50–55 total images**.

### 1.4 Rewrite all captions with the v2 identity preamble

Every `.txt` caption in `reference_v2/` needs the identity preamble prepended. Run this from the `reference_v2/` folder:

```bash
cd /Users/salvatorepapia/Documents/GitHub/cash/ai-persona/personas/maya/reference_v2

python3 -c "
import os
prefix = 'mayacole_persona, jet black hair, deep dark brown eyes, freckles across nose, full lips, soft eyeliner, defined jawline, '
for root, _, files in os.walk('.'):
    for f in files:
        if not f.endswith('.txt'):
            continue
        path = os.path.join(root, f)
        with open(path) as fp:
            content = fp.read().strip()
        if content.startswith('mayacole_persona, jet'):
            continue  # already done, skip
        with open(path, 'w') as fp:
            fp.write(prefix + content)
        print(f'updated: {path}')
"
```

Idempotent — safe to re-run. Verify by `cat`'ing a few `.txt` files; each should start with the identity preamble.

For images that don't have caption files yet (cross-base bootstraps, real photos), write fresh captions starting with the same preamble.

---

## Part 2 — Volume + pod setup (RunPod)

### 2.1 Resize the network volume to 80 GB

In RunPod UI: Storage → `combined_crimson_swordtail` → Resize → 80 GB.

Standing cost: ~$3.50/mo → ~$5.60/mo.

(Skip this if you'd rather delete `/workspace/hf_cache/` SDXL bases first to free ~14 GB. But the resize is cleaner — keeps the Phase 2 trainer environment intact and gives buffer for future model downloads.)

### 2.2 Spin up the pod

- **GPU:** RTX 4090 in **US-TX-3**
- **Network volume:** attach `combined_crimson_swordtail`
- **Container disk:** 20 GB
- **Expose HTTP ports:** **`8888,8188`** ⚠️ at creation, not after — same gotcha as last session
- **Template:** any current Pytorch CUDA 12.4 base

### 2.3 Container rebuild block (~5 min)

```bash
export HF_HOME=/workspace/hf_cache
echo 'export HF_HOME=/workspace/hf_cache' >> ~/.bashrc
apt update && apt install -y ffmpeg
cd /workspace/ComfyUI && pip install -r requirements.txt
cd /workspace/ComfyUI/custom_nodes/ComfyUI-WanVideoWrapper && pip install -r requirements.txt
cd /workspace/ComfyUI/custom_nodes/ComfyUI-KJNodes && pip install -r requirements.txt
```

(Don't launch ComfyUI yet — we train first.)

---

## Part 3 — LoRA v2 training

### 3.1 Upload the v2 dataset

In Jupyter Lab (Port 8888): drag `personas/maya/reference_v2/` from Mac into `/workspace/training_data/`. Result:

```
/workspace/training_data/maya_v2/core/            # ~12–15 images + .txt
/workspace/training_data/maya_v2/standard/        # ~25–30 images + .txt
/workspace/training_data/maya_v2/variation/       # ~7–10 images + .txt
/workspace/training_data/maya_v2/real_obscured/   # 5–10 images + .txt
```

⚠️ After upload, **delete any `.ipynb_checkpoints/` folders** from inside the dataset — Phase 2 lesson, JupyterLab creates these and AI-Toolkit will train on them as garbage:

```bash
find /workspace/training_data/maya_v2/ -name ".ipynb_checkpoints" -type d -exec rm -rf {} +
find /workspace/training_data/maya_v2/ -type f | wc -l
# Should equal: count_of_pngs + count_of_txt_files. Anything else is contamination.
```

### 3.2 Sync the v2 trainer config to the pod

The preconfigured `maya_v2.yaml` is already at `personas/maya/maya_v2.yaml` in this repo (synced to pod via the `/workspace/cash/` clone, or just drag it into Jupyter to `/workspace/`).

Verify the config:

```bash
cat /workspace/cash/ai-persona/personas/maya/maya_v2.yaml | head -30
```

Should reference all 4 dataset folders (`core`, `standard`, `variation`, `real_obscured`) under `/workspace/training_data/maya_v2/`, with `linear: 32`, `train_text_encoder: true`, `steps: 2750`.

### 3.3 Kick off training

```bash
cd /workspace/ai-toolkit
python run.py /workspace/cash/ai-persona/personas/maya/maya_v2.yaml
```

Expected wall time: ~45–60 min on the 4090 (longer than v1's 35 min — bigger rank + text encoder training + more steps).

While it trains, do Part 4 in parallel.

---

## Part 4 — Wan 14B I2V download (parallel)

Open a **new web terminal** so training keeps running in the original.

```bash
hf download Kijai/WanVideo_comfy --include "Wan2_2-I2V-A14B-HIGH_bf16.safetensors" --local-dir /workspace/ComfyUI/models/diffusion_models/

hf download Kijai/WanVideo_comfy --include "Wan2_2-I2V-A14B-LOW_bf16.safetensors" --local-dir /workspace/ComfyUI/models/diffusion_models/
```

Total ~28 GB. ~3–5 min on RunPod's network.

The 14B is a **Mixture of Experts** — both HIGH and LOW files load together at inference. The example workflow `wanvideo_2_2_I2V_A14B_example_WIP.json` handles the dual loading automatically.

---

## Part 5 — Validate v2 LoRA

Once training finishes, copy the final `.safetensors` to your local `personas/maya/lora/` for archive:

```bash
ls /workspace/output/maya_lora_v2/
# pick the latest checkpoint, e.g., maya_lora_v2_2750.safetensors
cp /workspace/output/maya_lora_v2/maya_lora_v2_*.safetensors /workspace/cash/ai-persona/personas/maya/lora/
```

**Validation protocol** — same prompt, three bases, both LoRAs:

1. Pick one prompt from `prompt_library.md` (a tier-2 selfie is good)
2. Generate the same prompt with **v1 LoRA** on **gonzalomo, Juggernaut, RealVisXL** (3 images)
3. Generate the same prompt with **v2 LoRA** on the same 3 bases (3 images)
4. Compare side-by-side: face fidelity, freckle accuracy, "same person" feel across the row

Pass criterion: v2 produces a recognizably-same face across all three bases, with photorealism that holds up. If v2 is worse than v1 on any base, the dataset has a problem — pause and inspect captions / image quality before continuing to video.

(You can do this validation in Draw Things on Mac with the new `.safetensors` loaded.)

---

## Part 6 — Validate Wan 14B video

Boot ComfyUI:

```bash
cd /workspace/ComfyUI && python main.py --listen 0.0.0.0 --port 8188
```

In browser, load `wanvideo_2_2_I2V_A14B_example_WIP.json` from `custom_nodes/ComfyUI-WanVideoWrapper/example_workflows/`.

Workflow settings to apply (similar to the 5B Turbo settings, but **CFG goes back up** because 14B isn't distilled):

| Field | Value | Why |
|---|---|---|
| Diffusion model HIGH | `Wan2_2-I2V-A14B-HIGH_bf16.safetensors` | The 14B MoE pair |
| Diffusion model LOW | `Wan2_2-I2V-A14B-LOW_bf16.safetensors` | |
| Text encoder | `umt5-xxl-enc-fp8_e4m3fn.safetensors` | Same as 5B setup |
| VAE | `Wan2_2_VAE_bf16.safetensors` | Same |
| `base_precision` | `fp16` (NOT `fp16_fast`) | torch 2.4 limit, same as 5B |
| `attention_mode` | `sdpa` (NOT `sageattn`) | sageattention not installed |
| `steps` | **20–25** | 14B is not distilled — wants real step count |
| `cfg` | **5.0** | 14B benefits from real CFG, unlike Turbo |
| Resize Image v2 | `720 × 1280` | IG/TikTok vertical |
| `num_frames` | `81` | Start at 81 to manage VRAM, raise to 121 if OK |

Pick a v2-LoRA-generated still as input, prompt with simple postural motion (`gentle breathing, soft hair movement`), Run.

**Expected:** noticeably better face hold, less identity drift, cleaner motion than 5B Turbo. Generation time: ~5–8 min per clip (vs 2–3 min on 5B).

If OOM: drop `num_frames` to 49 first, then resolution to 624×1104. The 14B is genuinely VRAM-hungry on a 4090.

---

## Part 7 — Wrap up

### 7.1 Download artifacts to Mac

Via Jupyter, download:
- v2 LoRA `.safetensors` → `personas/maya/lora/`
- All v2 validation images → `personas/maya/reference_v2/_validation/` (or wherever)
- Best video clips → `personas/maya/content/`
- Save your tuned 14B workflow JSON: ComfyUI → Save (Browser) → drop in `personas/maya/wanvideo_14B_I2V_maya.json`

### 7.2 Update docs

- **`PHASE3a_SETUP.md`** — bump model + settings sections to 14B values, mark 5B Turbo path as "fallback for VRAM-constrained sessions"
- **`prompts.md`** — record v2 LoRA per-base weights (calibrate by hand; v2's weights will likely differ from v1's)
- **`PLAN.md`** — Phase 2.5 status section ✅, Phase 3a status updated to reflect 14B

### 7.3 Terminate the pod

Three-dot menu → Terminate. Volume persists. Standing cost: ~$5.60/mo (post-resize).

---

## Decision points (worth pausing on if reached)

- **v2 LoRA is worse than v1 on validation** → don't proceed to 14B work. Inspect dataset for bad images or caption issues. Possibly retrain with `train_text_encoder: false` and rank 32 only — text encoder training is the higher-risk lever.
- **Wan 14B OOMs even at 49 frames + 624×1104** → the bf16 weights are too heavy for 24GB. Check Kijai's repo for fp8 variants of the 14B (`Wan2_2-I2V-A14B-HIGH_fp8` etc.) — those would halve VRAM but might not exist yet.
- **v2 LoRA + 14B clips still feel "AI-generated"** → that's the open-weights ceiling in 2026. Acknowledge it, push to Phase 4 anyway, accept ~30–40% reject rate as the new baseline.
