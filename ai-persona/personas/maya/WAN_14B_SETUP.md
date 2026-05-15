# Wan 2.2 14B I2V — Setup Guide (RunPod RTX 4090)

Comprehensive setup runbook for Kijai's ComfyUI-WanVideoWrapper Wan 2.2 14B I2V pipeline on a RunPod RTX 4090, written after two failed attempts (2026-05-08, 2026-05-11) and a deep research pass on 2026-05-13.

**Bar:** a future session reading only this doc should be able to spin up the pod, follow the steps, and produce a working Maya video clip on the first try.

For Wan 2.2 5B Turbo (separate, currently-deleted pipeline) see `PHASE3a_SETUP.md`. For why-we-chose-this-stack rationale see `../../PLAN.md` Phase 3a.

---

## TL;DR — the bug from prior sessions and the fix

The `Given groups=1, weight of size [5120, 36, 1, 2, 2], expected input[1, 68, 21, 44, 44] to have 36 channels, but got 68 channels` error is **caused by loading the Wan 2.2 VAE (z_dim=48) instead of the Wan 2.1 VAE (z_dim=16)** in the `WanVideoVAELoader` node.

The channel math is forced and unambiguous:

| Component | Channels |
|---|---|
| Sampler noise tensor | 16 |
| Temporal mask | 4 |
| Image latent — with Wan **2.1** VAE (z_dim=16) | 16 → total **36** ✓ matches model `in_dim=36` |
| Image latent — with Wan **2.2** VAE (z_dim=48) | 48 → total **68** ✗ this is the bug |

Counterintuitive but confirmed by Kijai personally in [issue #1281](https://github.com/kijai/ComfyUI-WanVideoWrapper/issues/1281) and reconfirmed in [issue #2003](https://github.com/kijai/ComfyUI-WanVideoWrapper/issues/2003): **Wan 2.2 14B A14B I2V uses the Wan 2.1 VAE.** Only the 5B TI2V model uses the Wan 2.2 VAE.

Prior sessions reported "tested both VAEs, same error" — that's mathematically impossible if the Wan 2.1 VAE was actually loaded. Most likely causes for the false negative: ComfyUI cached the old VAE and didn't actually reload after the swap (a known ComfyUI issue — full Python-process restart required, not just workflow reload); or the file at the path labeled `Wan2_1_VAE_bf16.safetensors` was actually a misnamed copy of the 2.2 VAE; or a shadow `ComfyUI-WanVideoWrapper-backup` install was being used (see [issue #1285](https://github.com/kijai/ComfyUI-WanVideoWrapper/issues/1285)). All addressed in Section 9's pre-flight protocol.

If the VAE fix alone doesn't work, four secondary suspects in priority order (full details in Section 10):

1. **Sage Attention + Triton at startup** corrupts channel sizing — uninstall both, restart ComfyUI fresh
2. **Conflicting `flow2-wan-video` custom node** in `custom_nodes/` — delete and restart
3. **Outdated ComfyUI (<v0.3.46)** — `git pull` and recreate venv
4. **"Use Everywhere" links broadcasting `add_extra_latents`** to the encode node — disconnect explicitly

---

## Section 1 — Overview

**What this sets up:** image-to-video generation on RunPod 4090 using Kijai's WanVideoWrapper + Wan 2.2 14B A14B I2V (HIGH + LOW dual-expert MoE) + LightX2V 4-step distillation LoRA.

**Hardware:** RunPod RTX 4090 (24 GB VRAM) in **US-TX-3** region — matches the existing network volume.

**Expected output:** 480p × 81-frame (5 sec @ 16 fps) MP4 clips with a Maya reference image as the driving still. Resolution and frame count are tunable (Section 8).

**Expected time:**
- First-run setup (this doc): **~45 min** if files already on volume (the bf16 weights are), **~90 min** if downloading fp8_scaled_KJ files fresh
- Per clip thereafter: **~3–5 min wall time** with LightX2V 4-step distilled path on 480p × 81 frames

**Expected cost:**
- Setup session: **~$1–2** (4090 at $0.34–0.69/hr × ~2 hr)
- Per clip thereafter: **~$0.03–0.05** in pod time
- Standing: ~$7/mo for the 100 GB network volume (existing)

---

## Section 2 — Prerequisites

### Existing state (as of 2026-05-13)

Network volume `combined_crimson_swordtail` in US-TX-3 already has:

- ComfyUI installed at `/workspace/ComfyUI/`
- WanVideoWrapper + KJNodes + VideoHelperSuite custom nodes installed
- Wan 2.2 14B I2V bf16 weights: `Wan2_2-I2V-A14B-HIGH_bf16.safetensors` + `Wan2_2-I2V-A14B-LOW_bf16.safetensors` (~57 GB combined)
- Wan 2.1 VAE: `Wan2_1_VAE_bf16.safetensors` (~250 MB — VERIFY this is actually 254 MB, not 1.4 GB; if 1.4 GB, it's misnamed and is actually the 2.2 VAE)
- Wan 2.2 VAE: `Wan2_2_VAE_bf16.safetensors` (~1.4 GB — keep for 5B work if ever revived, but DO NOT use for 14B I2V)
- Text encoder: `umt5-xxl-enc-fp8_e4m3fn.safetensors` (6.3 GB)
- LightX2V LoRA (generic Wan 2.1 rank64): `lightx2v_I2V_14B_480p_cfg_step_distill_rank64_bf16.safetensors` (750 MB)
- ai-toolkit (for LoRA training, irrelevant here)

Total used: ~86 GB / 100 GB. ~14 GB headroom.

### Pod creation settings (RunPod UI)

| Setting | Value | Why |
|---|---|---|
| GPU | RTX 4090 | Target |
| Region | **US-TX-3** | Volume locked here |
| Network volume | `combined_crimson_swordtail` mount at `/workspace` | |
| Container disk | 20 GB | Enough for pip + ffmpeg + scratch |
| Template | `runpod/pytorch:2.4.0-py3.11-cuda12.4.1-devel-ubuntu22.04` (or current PyTorch base) | Stable torch 2.4 |
| Exposed HTTP ports | **`8888,8188` ⚠️ MUST SET AT CREATION** | Editing post-deploy forces container reset → wipes pip installs |

### Critical: do NOT install Sage Attention at setup

Sage Attention + Triton at ComfyUI startup is a documented cause of the same channel-mismatch error class ([HF Comfy-Org discussion #3](https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged/discussions/3)). Get the base pipeline working with `sdpa` (PyTorch built-in) first. Sage can be added later as a ~30–40% speed optimization once stable. RunPod's HearmemanAI template ships Sage by default — avoid that template, use the plain `runpod/pytorch` base.

---

## Section 3 — Disk space planning

Two viable file strategies. Choose one before starting.

### Strategy A — Keep existing bf16 weights, set runtime fp8 quant (no downloads needed)

- Use the bf16 HIGH + LOW already on volume
- In WanVideoModelLoader nodes: `quantization: fp8_e4m3fn` (NOT `_scaled`)
- **Does NOT save disk space** (still ~57 GB) but saves ~90 min of download time
- Per Agent B research: this path works (models load with `in_dim=36`)

### Strategy B — Replace bf16 with fp8_scaled_KJ (recommended, saves ~28 GB)

- Delete the two bf16 files (frees 57.2 GB)
- Download the two fp8_e4m3fn_scaled_KJ files (~28.6 GB combined)
- In WanVideoModelLoader nodes: `quantization: fp8_e4m3fn_scaled` (matches workflow JSON default)
- Net: **~29 GB freed**, faster load times (no runtime quant), matches Kijai's intended workflow exactly

**Recommended:** Strategy B. The published workflow JSON hardcodes the `_KJ` filenames and the `fp8_e4m3fn_scaled` quant setting. Matching the intended config eliminates one variable.

Wan 2.2-specific LightX2V LoRAs (HIGH + LOW pair, `_260412_` build) should also be downloaded — they're ~1.2 GB combined and supersede the generic Wan 2.1 rank64 LoRA currently on disk. The published WIP workflow still references the old generic LoRA, but the new pair gives better Wan 2.2 motion (Agent B). Both are kept; the workflow gets remapped to the new ones (Section 7).

### Disk plan for Strategy B

```
Delete:  Wan2_2-I2V-A14B-HIGH_bf16.safetensors (28.6 GB)
Delete:  Wan2_2-I2V-A14B-LOW_bf16.safetensors  (28.6 GB)
Add:     Wan2_2-I2V-A14B-HIGH_fp8_e4m3fn_scaled_KJ.safetensors (14.3 GB)
Add:     Wan2_2-I2V-A14B-LOW_fp8_e4m3fn_scaled_KJ.safetensors  (14.3 GB)
Add:     Wan_2_2_I2V_A14B_HIGH_lightx2v_4step_lora_260412_rank_64_fp16.safetensors (601 MB)
Add:     Wan_2_2_I2V_A14B_LOW_lightx2v_4step_lora_260412_rank_64_fp16.safetensors  (601 MB)

Net delta: -28 GB
Headroom after: ~42 GB (from 14 GB)
```

---

## Section 4 — File downloads (verified 2026-05-13)

All filenames verified live against Kijai's HuggingFace API. The fp8_scaled_KJ files live in a **separate repo** (`Kijai/WanVideo_comfy_fp8_scaled`), not the main `Kijai/WanVideo_comfy` — this is the most common point of confusion.

### Setup the HF cache redirect first

```bash
export HF_HOME=/workspace/hf_cache
echo 'export HF_HOME=/workspace/hf_cache' >> ~/.bashrc
```

The 20 GB container disk fills otherwise during large model downloads.

### Strategy B downloads

```bash
# Diffusion models — fp8_e4m3fn_scaled_KJ from the SEPARATE fp8_scaled repo
hf download Kijai/WanVideo_comfy_fp8_scaled \
  I2V/Wan2_2-I2V-A14B-HIGH_fp8_e4m3fn_scaled_KJ.safetensors \
  I2V/Wan2_2-I2V-A14B-LOW_fp8_e4m3fn_scaled_KJ.safetensors \
  --local-dir /workspace/ComfyUI/models/diffusion_models

# Move into a tidy WanVideo/2_2/ subdir (matches the workflow JSON's hardcoded paths)
mkdir -p /workspace/ComfyUI/models/diffusion_models/WanVideo/2_2
mv /workspace/ComfyUI/models/diffusion_models/I2V/Wan2_2-I2V-A14B-*_fp8_e4m3fn_scaled_KJ.safetensors \
   /workspace/ComfyUI/models/diffusion_models/WanVideo/2_2/
rmdir /workspace/ComfyUI/models/diffusion_models/I2V 2>/dev/null

# LightX2V LoRAs — Wan 2.2-specific 260412 build, rank 64 (HIGH + LOW pair)
hf download Kijai/WanVideo_comfy \
  LoRAs/Wan22_Lightx2v/Wan_2_2_I2V_A14B_HIGH_lightx2v_4step_lora_260412_rank_64_fp16.safetensors \
  LoRAs/Wan22_Lightx2v/Wan_2_2_I2V_A14B_LOW_lightx2v_4step_lora_260412_rank_64_fp16.safetensors \
  --local-dir /workspace/ComfyUI/models/loras

# Then delete the old bf16 weights
rm /workspace/ComfyUI/models/diffusion_models/Wan2_2-I2V-A14B-HIGH_bf16.safetensors
rm /workspace/ComfyUI/models/diffusion_models/Wan2_2-I2V-A14B-LOW_bf16.safetensors
```

If you need to also fetch the VAE and text encoder for some reason (they're on the volume already, but just for reference):

```bash
hf download Kijai/WanVideo_comfy Wan2_1_VAE_bf16.safetensors \
  --local-dir /workspace/ComfyUI/models/vae

hf download Kijai/WanVideo_comfy umt5-xxl-enc-bf16.safetensors \
  --local-dir /workspace/ComfyUI/models/text_encoders
```

The volume currently has `umt5-xxl-enc-fp8_e4m3fn.safetensors` (6.3 GB), which is fine for the text encoder. The workflow defaults to the bf16 variant (10.8 GB) but accepts either — the workflow's `WanVideoT5TextEncoder` node has the file as a free dropdown.

### Verified file inventory (current 2026-05-13)

**Diffusion models — Wan 2.2 14B I2V** (`Kijai/WanVideo_comfy_fp8_scaled` repo, `I2V/` subdir):

| File | Size |
|---|---|
| `Wan2_2-I2V-A14B-HIGH_fp8_e4m3fn_scaled_KJ.safetensors` | 14.3 GB |
| `Wan2_2-I2V-A14B-HIGH_fp8_e5m2_scaled_KJ.safetensors` | 14.3 GB |
| `Wan2_2-I2V-A14B-LOW_fp8_e4m3fn_scaled_KJ.safetensors` | 14.3 GB |
| `Wan2_2-I2V-A14B-LOW_fp8_e5m2_scaled_KJ.safetensors` | 14.3 GB |

Use `e4m3fn` by default (better quality on most hardware). `e5m2` is fallback only if you hit `fp8e4nv dtype not supported` Triton error — `e5m2` is the only fp8 variant a few CUDA/triton combos accept.

**Diffusion models — bf16 (already on volume)** (`Kijai/WanVideo_comfy` repo, root):

| File | Size |
|---|---|
| `Wan2_2-I2V-A14B-HIGH_bf16.safetensors` | 27.3 GB |
| `Wan2_2-I2V-A14B-LOW_bf16.safetensors` | 27.3 GB |

**VAE** (`Kijai/WanVideo_comfy` repo, root):

| File | Size | Use |
|---|---|---|
| `Wan2_1_VAE_bf16.safetensors` | **242 MB** | Wan 2.1 ALL + **Wan 2.2 14B I2V/T2V** ← THIS ONE |
| `Wan2_1_VAE_fp32.safetensors` | 484 MB | Same VAE, higher precision (overkill) |
| `Wan2_2_VAE_bf16.safetensors` | 1344 MB | **5B TI2V only** — DO NOT use for 14B I2V |

The file-size delta (242 MB vs 1344 MB) is the easiest way to visually distinguish the two on disk. Architecturally different files, not the same VAE renamed (verified by SHA256).

**Text encoder** (`Kijai/WanVideo_comfy` repo, root):

| File | Size |
|---|---|
| `umt5-xxl-enc-bf16.safetensors` | 10.8 GB |
| `umt5-xxl-enc-fp8_e4m3fn.safetensors` | 6.4 GB (use this — saves 4 GB, negligible quality loss) |

**LightX2V LoRAs** (`Kijai/WanVideo_comfy` repo, `LoRAs/Wan22_Lightx2v/` subdir):

| File | Size |
|---|---|
| `Wan_2_2_I2V_A14B_HIGH_lightx2v_4step_lora_260412_rank_64_fp16.safetensors` | 601 MB |
| `Wan_2_2_I2V_A14B_HIGH_lightx2v_4step_lora_260412_rank_256_fp16.safetensors` | 2382 MB |
| `Wan_2_2_I2V_A14B_LOW_lightx2v_4step_lora_260412_rank_64_fp16.safetensors` | 601 MB |
| `Wan_2_2_I2V_A14B_LOW_lightx2v_4step_lora_260412_rank_256_fp16.safetensors` | 2382 MB |

Date suffix `_260412_` = 2026-04-12 build (current as of 2026-05-13). Rank 64 is the recommended starting point; rank 256 has more capacity if quality is short on motion. Use the HIGH + LOW **pair** — they distill different parts of the dual-expert architecture and must be applied to their respective model loaders.

The older generic Wan 2.1 rank64 LoRA (`lightx2v_I2V_14B_480p_cfg_step_distill_rank64_bf16.safetensors`, 750 MB) is what the WIP workflow JSON references. It works for Wan 2.2 too but isn't Wan-2.2-distilled. Use the new pair.

**Total disk for the Wan 2.2 14B I2V production set:** ~36 GB (Strategy B with fp8_scaled_KJ + new LoRAs + existing VAE/text encoder).

---

## Section 5 — ComfyUI install + custom nodes

Everything below is already on the volume. The container-side pip install needs to be redone each session because the container disk wipes between sessions.

### Spin-up sequence (every session, ~5–8 min)

```bash
export HF_HOME=/workspace/hf_cache
echo 'export HF_HOME=/workspace/hf_cache' >> ~/.bashrc

# System: ffmpeg for video output
apt update && apt install -y ffmpeg
pip install imageio_ffmpeg

# ComfyUI Python deps
cd /workspace/ComfyUI && pip install -r requirements.txt

# Custom node deps
cd /workspace/ComfyUI/custom_nodes/ComfyUI-WanVideoWrapper && pip install -r requirements.txt
cd /workspace/ComfyUI/custom_nodes/ComfyUI-KJNodes && pip install -r requirements.txt
```

### CRITICAL pre-flight: update ComfyUI core to ≥0.3.46

Outdated ComfyUI is a documented cause of the same 36-channel error class ([bullerwins HF #2](https://huggingface.co/bullerwins/Wan2.2-I2V-A14B-GGUF/discussions/2)). The fix is to `git pull` ComfyUI core:

```bash
cd /workspace/ComfyUI
git fetch origin
git log -1 --format="%ai %h" HEAD              # check current
git pull
pip install -r requirements.txt                # re-install in case of new deps
python -c "import comfy.utils; print('ComfyUI loaded OK')" # smoke test
```

Required: HEAD timestamp must be **on or after 2025-08-15** (when v0.3.46 shipped). If older, the `WanImageToVideo` node won't size channels to 36 correctly.

### CRITICAL pre-flight: update WanVideoWrapper

The wrapper itself is moving fast. The workflow we use (`wanvideo_2_2_I2V_A14B_example_WIP.json`) was last meaningfully updated 2025-07-29; the wrapper's `model.py` patch_embedding logic has stayed compatible with it. **Stay on the current main branch** — no commit pinning needed.

```bash
cd /workspace/ComfyUI/custom_nodes/ComfyUI-WanVideoWrapper
git fetch origin
git log -1 --format="%ai %h" HEAD
git pull
pip install -r requirements.txt
```

### CRITICAL pre-flight: no shadow custom-node installs

A second WanVideoWrapper install in `custom_nodes/` (e.g., `ComfyUI-WanVideoWrapper-backup/`) silently shadows the updated nodes and reproduces the channel bug — this was the root cause of [issue #1285](https://github.com/kijai/ComfyUI-WanVideoWrapper/issues/1285).

```bash
find /workspace/ComfyUI/custom_nodes -maxdepth 1 -type d -name "*WanVideo*"
# Should output exactly ONE directory: ComfyUI-WanVideoWrapper
# If you see ComfyUI-WanVideoWrapper-backup, ComfyUI-WanVideoWrapper-old, etc — delete them
```

Also check for `flow2-wan-video` — its `WanImageToVideo (Flow2)` node breaks channel sizing **even when not used in the active workflow**, because it registers a competing node class at startup:

```bash
find /workspace/ComfyUI/custom_nodes -maxdepth 1 -type d -name "*flow2*"
# Should output nothing. If anything appears, delete the directory.
```

### Launch ComfyUI

```bash
cd /workspace/ComfyUI && python main.py --listen 0.0.0.0 --port 8188
```

Wait for `To see the GUI go to: http://0.0.0.0:8188`. Don't close this terminal — it holds the running process.

Open ComfyUI in browser: RunPod's Connect tab → `Port 8188 → HTTP Service`.

---

## Section 6 — Workflow selection + load

### Recommended workflow: `wanvideo_2_2_I2V_A14B_example_WIP.json`

Despite the "WIP" filename suffix (Kijai's caution about node API stability — not a "broken" tag), this is **the only Wan 2.2 14B I2V reference workflow** Kijai ships, and it works correctly when paired with the right model files and VAE. The previous failures were misconfiguration, not workflow bugs.

**Source:**
```bash
# Already on the volume at:
/workspace/ComfyUI/custom_nodes/ComfyUI-WanVideoWrapper/example_workflows/wanvideo_2_2_I2V_A14B_example_WIP.json

# Or fetch fresh:
curl -s "https://raw.githubusercontent.com/kijai/ComfyUI-WanVideoWrapper/main/example_workflows/wanvideo_2_2_I2V_A14B_example_WIP.json" \
  > /tmp/wan22_14b_i2v.json
```

### To load in browser

1. In Jupyter (port 8888), navigate to `ComfyUI/custom_nodes/ComfyUI-WanVideoWrapper/example_workflows/`
2. Right-click `wanvideo_2_2_I2V_A14B_example_WIP.json` → Download
3. Drag the downloaded JSON onto the ComfyUI canvas in the browser tab

(Once a tuned version is saved into `personas/maya/wanvideo_2_2_14B_I2V_maya.json` in this repo, drag *that* in next time and skip the remap step below.)

### Workflows considered but not chosen (for context)

| Workflow | When to use | Why not default |
|---|---|---|
| `wanvideo_2_2_I2V_A14B_TimeToMove_example.json` | When you have a motion-source video to drive timing | Requires extra inputs (motion-signal video + mask video), not general-purpose I2V |
| `wanvideo_2_1_14B_I2V_example_03.json` | Fallback if 2.2 14B persists in failing — Section 13 | Older architecture, weaker face consistency, no MoE dual-expert. But proven-stable single-stage sampler. |
| `wanvideo_2_2_5B_I2V_example_WIP.json` | If 14B keeps failing AND you don't mind 5B quality | 5B Turbo was already deleted at user request — explicitly off the table |
| `wanvideo_2_2_14B_Pusa_extension_example_01.json` | Extending clips past native length using Pusa technique | Out of scope for first-clip setup |

The third-party AI-PET42 workflow (`https://github.com/AI-PET42/WanWorkflows/blob/main/Wan2.2-I2V-Workflow-080630.json`) is a community-frozen Kijai-wrapper Wan 2.2 14B I2V workflow that's confirmed working on 4090 — keep as a backup if the upstream WIP keeps failing.

### Remap models (one-time after first load)

The workflow ships with hardcoded paths like `WanVideo/2_2/Wan2_2-I2V-A14B-HIGH_fp8_e4m3fn_scaled_KJ.safetensors`. If your files are at slightly different paths, ComfyUI shows "missing models" errors on first load. Use the in-UI "Use from Library" dropdowns on each loader node to remap. **DO NOT edit the JSON by hand** — the UI dropdowns are authoritative and will write the correct paths when you save the workflow.

Specific remaps to verify:

| Loader node | Pick this file |
|---|---|
| WanVideo Model Loader (HIGH) | `WanVideo/2_2/Wan2_2-I2V-A14B-HIGH_fp8_e4m3fn_scaled_KJ.safetensors` |
| WanVideo Model Loader (LOW) | `WanVideo/2_2/Wan2_2-I2V-A14B-LOW_fp8_e4m3fn_scaled_KJ.safetensors` |
| WanVideo VAE Loader | **`Wan2_1_VAE_bf16.safetensors`** ⚠️ NOT the 2.2 VAE |
| WanVideo T5 Text Encoder | `umt5-xxl-enc-fp8_e4m3fn.safetensors` (or bf16 if you prefer; either works) |
| WanVideo Lora Select (HIGH) | `LoRAs/Wan22_Lightx2v/Wan_2_2_I2V_A14B_HIGH_lightx2v_4step_lora_260412_rank_64_fp16.safetensors` |
| WanVideo Lora Select (LOW) | `LoRAs/Wan22_Lightx2v/Wan_2_2_I2V_A14B_LOW_lightx2v_4step_lora_260412_rank_64_fp16.safetensors` |

**Save** the workflow after remapping (Save button in ComfyUI menu, save as `wanvideo_2_2_14B_I2V_maya.json` to `/workspace/ComfyUI/user/default/workflows/`) so the remaps persist across sessions.

---

## Section 7 — Model loader settings reference

Every WanVideoWrapper node setting, with the value to set and the failure mode if you get it wrong. Settings that match the workflow JSON defaults are marked ✓; settings that need to change from the JSON defaults are marked ⚠️.

### WanVideoModelLoader (HIGH expert and LOW expert — both same)

| Field | Value | Why |
|---|---|---|
| `model` | `Wan2_2-I2V-A14B-HIGH/LOW_fp8_e4m3fn_scaled_KJ.safetensors` | ✓ matches workflow |
| `base_precision` | **`fp16`** ⚠️ | Workflow default is `fp16_fast` which requires torch 2.7+ nightly. On the container's torch 2.4.1 stable, `fp16_fast` hard-errors. Change to `fp16`. (If torch is bumped to 2.7+ in future containers, set back to `fp16_fast` for ~5% speedup.) |
| `quantization` | **`fp8_e4m3fn_scaled`** ✓ | Matches the `_KJ` source file's scaled fp8 format. Setting to `fp8_e4m3fn` (without `_scaled`) errors with "model is not a scaled fp8 model" because the KJ files ARE scaled |
| `load_device` | `offload_device` ✓ | Offloads to CPU between forward passes — essential for fitting both experts on 24 GB |
| `attention_mode` | **`sdpa`** ⚠️ | Workflow default is `sageattn`. The `sageattention` package is not installed by default; setting `sageattn` without it hard-errors. Use `sdpa` for first run. After base pipeline works, install `sageattention` for ~30% speedup |
| `rms_norm_function` | Default (`pytorch_native` or unset) | Leave as workflow default |
| `compile_args` | unconnected | Skip torch.compile for first run; it has a documented Wan 2.2 regression that produces NaN black output ([issue #1344](https://github.com/kijai/ComfyUI-WanVideoWrapper/issues/1344)) and slow first-step transfer ([issue #1375](https://github.com/kijai/ComfyUI-WanVideoWrapper/issues/1375)). Enable after pipeline works, with `aot_eager` mode |

### WanVideoBlockSwap (connected to each Model Loader via `block_swap_args`)

| Field | Value | Why |
|---|---|---|
| `blocks_to_swap` | **20** (workflow default) ✓ | Tuned for 24 GB 4090 at 480p × 81 frames. Raise to 30 for 720p × 81; 40 max for 720p × 121 |
| `offload_img_emb` | true ✓ | Offloads image-embedding tensors to CPU between passes |
| `offload_txt_emb` | true ✓ | Same for text embeddings |
| `use_non_blocking` | true ✓ | Async CPU↔GPU transfers — small speed win, no quality cost |

### WanVideoLoraSelect (HIGH and LOW — separate nodes, separate LoRAs)

| Field | Value | Why |
|---|---|---|
| `lora` (HIGH node) | `LoRAs/Wan22_Lightx2v/Wan_2_2_I2V_A14B_HIGH_lightx2v_4step_lora_260412_rank_64_fp16.safetensors` | Wan 2.2 HIGH-expert-specific distillation |
| `strength` (HIGH) | **1.0** ✓ | Workflow default; higher = more motion but artifact risk |
| `lora` (LOW node) | `LoRAs/Wan22_Lightx2v/Wan_2_2_I2V_A14B_LOW_lightx2v_4step_lora_260412_rank_64_fp16.safetensors` | Wan 2.2 LOW-expert-specific |
| `strength` (LOW) | **3.0** ✓ | Workflow default — asymmetric on purpose, LOW expert needs more LoRA push to compensate for refinement-pass damping |
| `low_mem_load` | false ✓ | LoRAs are small (~600 MB each), fast to load |

If the HIGH/LOW Wan 2.2-specific files aren't available, fall back to the generic Wan 2.1 LoRA (`lightx2v_I2V_14B_480p_cfg_step_distill_rank64_bf16.safetensors`) on BOTH HIGH and LOW loaders. Quality is slightly worse but still functional — that's what the upstream WIP workflow originally referenced before the Wan 2.2-specific LoRAs were released.

### WanVideoVAELoader ⚠️ THIS IS THE BUG MOST LIKELY TO HIT YOU

| Field | Value | Why |
|---|---|---|
| `model` | **`Wan2_1_VAE_bf16.safetensors`** ⚠️ CRITICAL | Wan 2.2 14B I2V uses the Wan 2.1 VAE. **Do NOT use `Wan2_2_VAE_bf16.safetensors` here** — that's the 5B TI2V VAE, has z_dim=48, will produce the 68-channel error |
| `precision` | `bf16` ✓ | Match the file's native precision |

**The file at the path must actually be the 254 MB Wan 2.1 VAE.** If something named `Wan2_1_VAE_bf16.safetensors` is somehow ~1.4 GB on disk, it's misnamed and is actually the 2.2 VAE. Run the verification command in Section 9 before launching.

### WanVideoT5TextEncoder

| Field | Value | Why |
|---|---|---|
| `model` | `umt5-xxl-enc-fp8_e4m3fn.safetensors` (or bf16 variant) | Both work; fp8 saves 4 GB VRAM with minor quality loss |
| `precision` | `bf16` ✓ | Internal compute precision |
| `load_device` | `offload_device` ✓ | Offload after encoding |
| `quantization` | If file is fp8: `fp8_e4m3fn`. If file is bf16: `disabled` | Match file's native format |

### WanVideoImageToVideoEncode ⚠️ this is the node where the 68-channel construction happens

| Field | Value | Why |
|---|---|---|
| `width` | **832** (480p portrait) or **832** (480p landscape — orientation set by image) ✓ | Workflow default |
| `height` | **480** ✓ | Workflow default |
| `num_frames` | **81** ✓ | ~5 sec @ 16 fps. Drop to 65 if OOM, 121 for 7.5 sec |
| `noise_aug_strength` | **0** ✓ | Workflow default. Use 0.03 only if reference image has compression artifacts you want softened |
| `latent_strength` | **1.0** ✓ | Full influence of image latent on output |
| `clip_strength` | **1.0** ✓ | Used only if a CLIP-vision encoder is wired in (it isn't in the 2.2 workflow — Wan 2.2 dropped CLIP-vision conditioning that 2.1 had) |
| `adjust_resolution` | **True** ✓ | Auto-adjusts width/height to the model's native bucket |
| `add_cond_latents` | **False** ⚠️ CRITICAL | If accidentally True, this injects extra latents that would push channel count above 36 → reproduces the bug. Verify this is False. The TimeToMove workflow sets this to True intentionally; the plain WIP workflow keeps it False |
| `end_strength` | **False** ✓ | Only used in first/last-frame workflows |
| `end_image` | unconnected ⚠️ | Must NOT be wired. If wired, adds extra channels → reproduces the bug |
| `fun_or_fl2v_model` | unconnected / `false` ⚠️ | Same — must be off |
| `extra_latents` | unconnected ⚠️ | Same |

**If using the "Use Everywhere" feature in ComfyUI**, explicitly disconnect `extra_latents`, `end_image`, `fun_or_fl2v_model` from any broadcast UE links — these have been documented as causing exactly the 32-channel injection that produces the 36→68 mismatch ([issue #2003](https://github.com/kijai/ComfyUI-WanVideoWrapper/issues/2003)). Toggle UE's "Reject UE Links" option on as a safety net.

### Resize Image v2 (KJNodes)

This sizes the input image before it hits the I2V encoder.

| Field | Value | Notes |
|---|---|---|
| `width` | `720` (portrait reels) or `832` | Match the WanVideoImageToVideoEncode target |
| `height` | `720` (square pre-crop) or `480` | |
| `upscale_method` | `lanczos` ✓ | Best preservation of face detail |
| `keep_proportion` | `crop` ✓ | Crops to target aspect — face crops should be centered in the source image |
| `divisible_by` | `16` ✓ | Required for VAE's spatial compression |

For 9:16 IG/TikTok reels target output, use `WanVideoImageToVideoEncode` at `480 × 832` (portrait — width and height swapped from default).

---

## Section 8 — Sampler & inference settings

The Wan 2.2 14B I2V workflow uses a **two-stage dual-expert sampler**: the HIGH expert runs steps 0→3, then the LOW expert continues steps 3→6, using the LightX2V distillation LoRA on each.

### WanVideoSampler (HIGH — first stage)

| Field | Value | Why |
|---|---|---|
| `model` | wired from HIGH model loader + LoRA + blockswap | |
| `image_embeds` | wired from WanVideoImageToVideoEncode | |
| `text_embeds` | wired from T5 encoder | |
| `steps` | **6** ✓ | Total sampler steps across BOTH stages |
| `start_step` | **0** ✓ | HIGH starts at 0 |
| `end_step` | **3** ✓ | HIGH ends at step 3 (LOW picks up from there) |
| `cfg` | **1.0** ✓ | Distilled — CFG > 1 produces overcooked output. The #1 quality footgun |
| `shift` | **8.0** ✓ | Workflow default for Wan 2.2 dual-expert. Different from Wan 2.1 which uses shift=5 |
| `scheduler` | `dpm++_sde` ✓ | Workflow default. Alternatives: `flowmatch_pusa`, `unipc` |
| `sampler` | not explicitly set in this workflow (dpm++_sde is both sampler+scheduler in WanVideoWrapper's flatten) | |
| `seed` | any integer | Vary across takes — different seeds = different motion |
| `denoise_strength` | **1.0** ✓ | Full denoise |
| `force_offload` | true ✓ | Frees VRAM for the LOW stage |

### WanVideoSampler (LOW — second stage)

| Field | Value | Why |
|---|---|---|
| `model` | wired from LOW model loader + LoRA + blockswap | |
| `samples` | wired from HIGH sampler output | Receives the partial latents to continue from |
| `image_embeds` | wired from same WanVideoImageToVideoEncode | Same conditioning |
| `text_embeds` | wired from same T5 encoder | |
| `steps` | **6** ✓ | Same total |
| `start_step` | **3** ✓ | LOW continues from step 3 |
| `end_step` | **6** ✓ | Ends at step 6 |
| `cfg` | **1.0** ✓ | Same — no CFG with distilled LoRA |
| `shift` | **8.0** ✓ | Same |
| `scheduler` | `dpm++_sde` ✓ | Same |
| `seed` | **same as HIGH** | Both stages need the same seed for coherent denoise |
| `denoise_strength` | **1.0** ✓ | |
| `force_offload` | true ✓ | |

### Empty Embeds (defines clip length and resolution to the sampler)

| Field | Value |
|---|---|
| `num_frames` | **81** (5 sec @ 16 fps) — match WanVideoImageToVideoEncode |
| `width` | match WanVideoImageToVideoEncode |
| `height` | match WanVideoImageToVideoEncode |

### Resolution × frame count matrix (24 GB 4090)

| Resolution | Frames | blocks_to_swap | OK on 24 GB? | Wall time (LightX2V 4-step) |
|---|---|---|---|---|
| 480 × 832 (portrait reel) | 65 | 20 | ✓ comfortable | ~60–90 sec |
| 480 × 832 | 81 | 20 | ✓ default | **~3–5 min** ← Maya target |
| 480 × 832 | 121 | 20–25 | ✓ tight | ~5–8 min |
| 720 × 1280 | 81 | 30 | ✓ requires blockswap bump | ~10–15 min |
| 720 × 1280 | 121 | 40 | ⚠️ very tight, may OOM at VAE decode | ~20–30 min |
| 832 × 1216 (SDXL-native) | 49 | 30 | ⚠️ undocumented; likely needs VAE tiling | unknown |
| 1024 × 1024 | 81 | 40 | ⚠️ borderline | ~25 min |

**Bottom line for Maya production:** start at 480 × 832 × 81 frames. Yields a 5-second 9:16 vertical clip in ~3–5 min. Upgrade resolution after first 5–10 clips prove reliable.

### Sampler-path selection — distilled vs full quality

| Path | Steps | LoRA | CFG | When |
|---|---|---|---|---|
| **LightX2V 4-step distilled** (default) | 6 (HIGH 0→3, LOW 3→6) | rank64 HIGH + LOW pair at strengths 1.0 / 3.0 | 1.0 | Default. ~3–5 min/clip. Quality reportedly equivalent to 20-step full for static-scene face-driving use case |
| **LightX2V "Enhanced Motions"** variant | 6 (HIGH 0→4, LOW 4→6) | rank64 HIGH @ 5.6, LOW @ 2.0 | 1.0 | When stock motion is too subdued. Risk: more artifacts |
| **Full quality non-distilled** | 20 (HIGH 0→10, LOW 10→20) | none / disabled | 3.5 (HIGH and LOW) | When distilled quality is insufficient. ~15–25 min/clip. Use sampler=`euler`, scheduler=`beta`, shift=3.0–5.0 |

For Maya, default to distilled. If a clip rejects for "stiff motion", retry with Enhanced Motions strength on HIGH LoRA before stepping up to full quality.

### VHS_VideoCombine (output)

| Field | Value |
|---|---|
| `frame_rate` | 16 (Wan native) — or 24 if you want subtle slow-mo |
| `loop_count` | 0 |
| `format` | `video/h264-mp4` |
| `pingpong` | false (workflow may default to true — turn off) |
| `save_output` | true |
| Output goes to `/workspace/ComfyUI/output/` |

Optional post: `ffmpeg -vf "fps=24" input.mp4 output.mp4` to interpolate 16→24 fps. Or use RIFE (frame-interpolation custom node) for the same.

---

## Section 9 — First-run verification protocol

Execute these checks **in order** before queueing the first generation. Each catches a known failure mode.

### Step 1 — VAE file is actually the Wan 2.1 VAE (not 2.2 misnamed)

```bash
ls -la /workspace/ComfyUI/models/vae/
# Expected output:
#   Wan2_1_VAE_bf16.safetensors    ~ 254000000 bytes (254 MB)
#   Wan2_2_VAE_bf16.safetensors    ~ 1400000000 bytes (1.4 GB)
```

If the file labeled `Wan2_1_VAE_bf16.safetensors` is ~1.4 GB, it's actually the Wan 2.2 VAE under a misleading name. Delete and re-download:

```bash
rm /workspace/ComfyUI/models/vae/Wan2_1_VAE_bf16.safetensors
hf download Kijai/WanVideo_comfy Wan2_1_VAE_bf16.safetensors --local-dir /workspace/ComfyUI/models/vae
```

For absolute certainty, probe the z_dim directly:

```bash
python3 << 'EOF'
import safetensors.torch as st
sd = st.load_file("/workspace/ComfyUI/models/vae/Wan2_1_VAE_bf16.safetensors")
# Wrapper auto-detects z_dim from model.conv2.weight.shape[0]
key = "model.conv2.weight" if "model.conv2.weight" in sd else next(k for k in sd if "conv2" in k)
z_dim = sd[key].shape[0]
print(f"z_dim = {z_dim}  (must be 16 for Wan 2.2 14B I2V; 48 means it's the 2.2 VAE)")
assert z_dim == 16, "WRONG VAE — this file is the Wan 2.2 VAE, not 2.1"
print("✓ VAE verified as Wan 2.1")
EOF
```

### Step 2 — ComfyUI core ≥ 0.3.46

```bash
cd /workspace/ComfyUI
git log -1 --format="%ai %s" HEAD
# Date should be 2025-08-15 or later
```

### Step 3 — Exactly one WanVideoWrapper install

```bash
find /workspace/ComfyUI/custom_nodes -maxdepth 1 -type d | grep -i wan
# Should output exactly one line: /workspace/ComfyUI/custom_nodes/ComfyUI-WanVideoWrapper
```

### Step 4 — No `flow2-wan-video` shadow node

```bash
find /workspace/ComfyUI/custom_nodes -maxdepth 1 -type d -iname "*flow2*"
# Should output nothing
```

### Step 5 — No Sage Attention import errors at startup

After launching ComfyUI, check the startup log for:

```
✓ no "sageattention" import errors
✗ if "ImportError: sageattention not installed" appears — that's fine if attention_mode=sdpa
✗ if any error mentions "triton" or "sage" at startup, uninstall and retry:
  pip uninstall -y sageattention triton
  # then restart ComfyUI
```

### Step 6 — Workflow loads with zero "missing models" errors

After loading `wanvideo_2_2_I2V_A14B_example_WIP.json`:

- The ComfyUI canvas should show zero red error indicators
- "Missing Models" dialog (if any) — use "Use from Library" to remap each
- After remapping, all loader nodes should show file names in their dropdowns

### Step 7 — Run a 1-frame smoke test before the real clip

To validate the channel math is correct end-to-end without burning 5 min on a full 81-frame run:

- In `WanVideoImageToVideoEncode`: temporarily set `num_frames` to **5**
- In Empty Embeds: same — `num_frames` = **5**
- Use any test image (the sample `oldman_upscaled.png` in the workflow is fine)
- Queue the prompt

Expected: completes in ~15 sec, produces a 5-frame tiny clip. If the channel-mismatch error fires here, it'll fire on full runs too — fix it before increasing num_frames.

After smoke passes: bump `num_frames` back to 81 for the real clip.

---

## Section 10 — Known failure modes catalog

Comprehensive table of every documented Wan 2.2 14B I2V failure mode from community research, in rough order of likelihood for our setup.

### A — Channel mismatch errors (`expected X channels, got Y`)

| Symptom | Root cause | Fix | Source |
|---|---|---|---|
| `expected 36 channels, got 68` | **Wrong VAE: Wan 2.2 VAE loaded** | Use `Wan2_1_VAE_bf16.safetensors` (254 MB, z_dim=16) | [#1281](https://github.com/kijai/ComfyUI-WanVideoWrapper/issues/1281), [#2003](https://github.com/kijai/ComfyUI-WanVideoWrapper/issues/2003) — Kijai confirmed |
| `expected 36 channels, got 32` | ComfyUI core too old (<0.3.46) | `cd /workspace/ComfyUI && git pull && pip install -r requirements.txt` | [bullerwins HF #2](https://huggingface.co/bullerwins/Wan2.2-I2V-A14B-GGUF/discussions/2) |
| `expected 36 channels, got 32` | Conflicting `flow2-wan-video` custom node | Delete `custom_nodes/flow2-wan-video/`, restart | [HF Comfy-Org disc #3](https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged/discussions/3) |
| `expected 36 channels, got 32` | Sage Attention + Triton at startup | `pip uninstall -y sageattention triton`, restart ComfyUI | Same |
| `expected 36 channels, got 68` (32-channel surplus) | `add_cond_latents=True` mistakenly on WanVideoImageToVideoEncode | Set to `False` | [#2003](https://github.com/kijai/ComfyUI-WanVideoWrapper/issues/2003) |
| `expected 36 channels, got 68` | `end_image`, `extra_latents`, or `fun_or_fl2v_model` mis-wired (often via "Use Everywhere" broadcast) | Explicitly disconnect those inputs on WanVideoImageToVideoEncode; toggle UE "Reject UE Links" on | Same |
| `expected X channels` after `git pull` | Multiple WanVideoWrapper installs (`-backup`, `-old`) shadow the updated nodes | `find custom_nodes -name "*WanVideo*" -type d` — keep exactly one | [#1285](https://github.com/kijai/ComfyUI-WanVideoWrapper/issues/1285) |
| GGUF I2V channel mismatch (bullerwins build) | Bullerwins' early GGUF I2V conversion was buggy | Use `QuantStack/Wan2.2-I2V-A14B-GGUF` instead | [bullerwins HF #2](https://huggingface.co/bullerwins/Wan2.2-I2V-A14B-GGUF/discussions/2) |

### B — VRAM / OOM errors

| Symptom | Root cause | Fix |
|---|---|---|
| `CUDA out of memory` mid-sampling | Resolution × frames × blockswap mismatch | See Section 8 matrix; default 20 blockswap covers 480 × 832 × 81 |
| OOM during VAE decode (after sampler finishes) | VAE doesn't get blockswap | Lower resolution OR enable VAE tiling on WanVideoDecode (`tile_x=128, tile_y=128, tile_stride_x=64, tile_stride_y=64`) |
| OOM with blockswap=20 at 480p | Likely a secondary process eating VRAM; or torch.compile leaking | Restart ComfyUI; run `nvidia-smi` before queueing; ensure no other process running |
| OOM despite high blockswap | Known regression in some wrapper commits ([#1644](https://github.com/kijai/ComfyUI-WanVideoWrapper/issues/1644)) | Try blockswap 35–40; if persists, pin wrapper to an earlier commit |

### C — Quality / output errors

| Symptom | Root cause | Fix |
|---|---|---|
| Black output video | Sage Attention NaN propagation through fp8 model | Disable Sage Attention; use `sdpa` |
| Black output with torch.compile | NaN in FFN's GELU under inductor mode | Set torch.compile mode to `aot_eager` or disable |
| Looped / ping-pong output | VHS_VideoCombine `pingpong: true` set, OR known artifact with UniPC + low CFG | Set `pingpong: false`; change scheduler to euler or beta; reduce LightX2V HIGH strength |
| Overcooked / plastic / "creepy" output | CFG > 1 with distilled LoRA | Set CFG to exactly 1.0 in both samplers |
| Drunk / blurry / oversaturated output | Wrong shift value for distilled sigmas | Kijai wrapper: shift=8.0; native ComfyUI nodes: shift=5.0. Don't mix conventions |
| Identity drift through clip | Wan limitation; clip too long | Shorten to 65 frames; for >5 sec, stitch multiple takes |
| Static / no motion despite high LoRA | LightX2V HIGH at strength 1.0 is the calibrated baseline | Bump HIGH strength to 5.6 ("Enhanced Motions"), or switch to non-distilled 20-step path |
| Facial expression morphs (uncanny) | Motion prompt mentions facial expression change | Drop expression tokens from motion prompt — Wan 2.2 handles postural motion well, expressions poorly |

### D — Loading / startup errors

| Symptom | Root cause | Fix |
|---|---|---|
| `fp8e4nv dtype not supported` (Triton) | Triton version mismatch for fp8_e4m3fn on this CUDA build | Use `fp8_e5m2` variant of the model files instead |
| "model is not a scaled fp8 model, please disable '_scaled'" | Using `fp8_e4m3fn_scaled` quant on a non-scaled file (e.g., the bf16 source files) | If using bf16 source: set `quantization: fp8_e4m3fn` (no `_scaled`). If using `_KJ` source files: set `quantization: fp8_e4m3fn_scaled` |
| FlowMatch_Causvid scheduler errors | Deprecated in recent wrapper builds | Change scheduler to `dpm++_sde`, `unipc`, or `euler` |
| `huggingface-cli not found` or `command deprecated` | New HF library uses `hf` | Use `hf download ...` (same flags) |
| `Failed to upload file` (image upload via ComfyUI UI) | Known UI bug | Upload via Jupyter to `ComfyUI/input/`, then select from Library |
| Web terminal disconnects | Network blip; ComfyUI process unaffected | Reopen terminal — process keeps running |
| 502 Bad Gateway on port 8188 | Port not exposed at pod creation | Re-create pod with `8888,8188` exposed (editing post-deploy resets container) |

### E — Performance regressions

| Symptom | Root cause | Fix |
|---|---|---|
| 15→40 min per clip (vs expected 3–5 min) | Wrapper regression after v0.3.64 + Python 3.13 ([#1375](https://github.com/kijai/ComfyUI-WanVideoWrapper/issues/1375)) | Disable torch.compile; ensure Python 3.11 venv (not 3.13); reduce blocks_to_swap |
| Slow blockswap transfer on first HIGH step | Same regression | Same |
| Sage Attention 30–40% speedup not realized | Sage not actually loaded (silent fallback) | Check ComfyUI startup log for "sageattention loaded"; `pip install sageattention` if missing |

---

## Section 11 — Performance baseline (RTX 4090 / 24 GB)

These are the expected numbers once setup works. Use them to detect regressions.

### Default config: 480 × 832 × 81 frames, fp8_e4m3fn_scaled_KJ, LightX2V 4-step, sdpa attention

| Metric | Expected | Source |
|---|---|---|
| First-load model swap-in time | ~30–60 sec | (loading HIGH from offload to GPU) |
| HIGH stage (steps 0→3) | ~60–90 sec | |
| Stage transition (HIGH offload → LOW load) | ~20–30 sec | |
| LOW stage (steps 3→6) | ~60–90 sec | |
| VAE decode | ~15–30 sec | |
| Total wall time per clip | **~3–5 min** | Multiple community reports |
| Peak VRAM | ~21–23 GB / 24 GB | |
| Output file size | ~3–10 MB MP4 | |

### Scaling table

| Config change | Wall time delta | VRAM delta |
|---|---|---|
| 480p × 65 → 81 frames | +20% | +10% |
| 480p × 81 → 121 frames | +50% | +30% (may OOM, bump blockswap to 25) |
| 480p → 720p (same frames) | +200% (3× slower) | +30% (bump blockswap to 30) |
| LightX2V 4-step → 20-step full quality | +250% | minimal |
| sdpa → sageattn | -30% | minimal |
| sdpa → sageattn + sparge | -40% | minimal |
| torch.compile (when working) | -10% to -15% | minimal |

### Outliers to investigate if you see them

- **>10 min for 480p × 81 frames**: torch.compile regression, Python 3.13, or wrapper version regression. Check Python version, disable compile, pin wrapper to an earlier commit
- **<2 min for 480p × 81 frames**: probably running on 3 steps not 6 — verify both samplers' step counts
- **Peak VRAM >24 GB / OOM at default 480p**: another process eating VRAM, or wrapper offload bug. `nvidia-smi` before queueing

---

## Section 12 — Production prompt template for Maya

Once the pipeline works, use this prompt structure for tier-2 semi-provocative + tier-3 NSFW video content from a Maya reference image.

### Reference-image preparation (already done in Phase 2.5)

- Use a Maya keeper from `personas/maya/reference_v2/` or a fresh generation off gonzalomo + Maya LoRA v2 at the prompt envelope established in `gonzalomo_prompt_engineering.md`
- Upload via Jupyter to `/workspace/ComfyUI/input/maya_reference.png`
- The image should be SDXL-native dimensions (832 × 1216 or 768 × 1024) — `WanVideoImageToVideoEncode`'s `adjust_resolution: True` handles re-bucketing

### Prompt structure for Wan 2.2 14B I2V

Wan's positive prompt is **motion-and-scene description**, not subject identity (the identity comes from the reference image). Lean into postural motion, environment movement, camera language; avoid facial expression changes.

**Positive prompt template:**

```
The woman in the image [POSTURAL MOTION], [HAIR MOTION], [ENVIRONMENT MOTION].
[CAMERA LANGUAGE]. Soft natural lighting, [MOOD/AMBIENT QUALIFIER].
Cinematic, smooth motion, realistic.
```

**Postural motion** (what works well): breathing visibly, head turning slowly, shoulders shifting, hand moving to hair, lips parting slightly (NOT smiling/laughing — those morph), leaning forward/back, weight shift, slight body sway.

**Hair motion** (what works well): hair lifting in a soft breeze, hair flowing with head turn, strands moving naturally, hair settling.

**Environment motion**: leaves rustling, water rippling, fabric/curtain swaying, smoke drifting, light shifting.

**Camera language**: slight zoom-in / zoom-out / pan-left / pan-right / dolly. Avoid "spinning camera" or "fast motion" — Wan tends to produce stuttery output.

**Mood/ambient qualifier**: cinematic depth, warm golden hour, cool blue hour, dim ambient, harsh sun, soft window light, neon glow.

**Negative prompt** (use the workflow's default unless you have a specific issue):

```
blurry, distorted, deformed, low quality, low resolution, watermark, text,
multiple people, extra limbs, missing limbs, mutated hands, bad anatomy,
overexposed, oversaturated, cartoonish, animated, painting, 3D render
```

### Tier-2 examples (IG/TikTok reels-safe)

```
The woman in the image breathing softly, hair lifting gently in a warm breeze.
Slight camera dolly forward. Golden hour light through window, intimate ambient.
Cinematic, smooth motion, realistic.
```

```
The woman in the image turning her head slowly toward camera, light catching her eyes.
Static medium shot, soft window light from the left.
Cinematic, smooth motion, realistic.
```

### Tier-3 examples (paid-platform, NSFW)

The motion prompts work the same — Wan 2.2 doesn't have prudish content filters baked in at the prompt level. Drive NSFW from the reference image (generated on Lustify/Pony Realism off SDXL), and keep the motion prompt focused on postural movement only.

```
The woman in the image breathing slowly, chest rising and falling subtly,
hand moving to brush hair back. Static medium-close shot, dim warm bedroom light,
intimate ambient. Cinematic, smooth motion, realistic.
```

### Seed strategy

- Generate 3–4 takes per still with different seeds — Wan is stochastic, the same prompt yields meaningfully different motion across seeds
- Lock seed across takes for A/B testing different prompt phrasings
- Document the best seeds in `personas/maya/wanvideo_2_2_14B_I2V_maya.json` as comments (or in a sibling notes file)

### Workflow customizations for Maya production

Once the WIP workflow runs successfully with the settings in this doc, save the tuned version:

```
/workspace/ComfyUI/user/default/workflows/wanvideo_2_2_14B_I2V_maya.json
```

And commit it back to this repo at:

```
personas/maya/wanvideo_2_2_14B_I2V_maya.json
```

So future sessions skip the "remap all the models" step.

---

## Section 13 — Alternative paths (if Wan 2.2 14B can't be made to work)

If after executing Sections 1–10 the channel mismatch still persists, two fallback paths.

### 13a — Wan 2.1 14B I2V (recommended fallback)

Older but proven-stable architecture. Single-stage sampler (no HIGH/LOW MoE) which **architecturally cannot hit the 36-vs-68 channel bug** — there's no dual-encoder path. Lower face-consistency ceiling than 2.2 but acceptable for 3-sec clips. Alibaba team explicitly recommends 480p over 720p for Wan 2.1 (720p is unstable).

**Files (~17 GB):**

```bash
hf download Kijai/WanVideo_comfy_fp8_scaled \
  I2V/Wan2_1-I2V-14B-480p_fp8_e4m3fn_scaled_KJ.safetensors \
  --local-dir /workspace/ComfyUI/models/diffusion_models/WanVideo

# CLIP-vision encoder (Wan 2.1 needs this; Wan 2.2 doesn't)
hf download Kijai/WanVideo_comfy open-clip-xlm-roberta-large-vit-huge-14_visual_fp16.safetensors \
  --local-dir /workspace/ComfyUI/models/clip_vision
```

VAE, text encoder, and the generic Wan 2.1 LightX2V rank64 LoRA are already on the volume — reuse them.

**Workflow:** `wanvideo_2_1_14B_I2V_example_03.json` (in `example_workflows/`, currently on volume).

**Settings (per the workflow's defaults):**

| Field | Value |
|---|---|
| `base_precision` | `fp16` |
| `quantization` | `fp8_e4m3fn_scaled` (matches KJ file) — or `fp8_e4m3fn` for the non-scaled fp8 variant |
| `attention_mode` | `sdpa` |
| `blocks_to_swap` | 10 (lower than 2.2; single-model architecture) |
| `WanVideoVRAMManagement` | enabled (level 1) — only this workflow has it |
| Sampler steps | 4 |
| CFG | 1.0 |
| Shift | 5.0 (different from 2.2's 8.0) |
| Scheduler | `dpm++_sde` |
| Resolution | 832 × 480 |
| num_frames | 81 |
| noise_aug_strength (encode) | 0.03 (different from 2.2's 0.0) |
| LoRA | `lightx2v_I2V_14B_480p_cfg_step_distill_rank64_bf16.safetensors` @ strength 1.0 |
| CLIP-vision | `clip_vision_h.safetensors` — wired through `WanVideoClipVisionEncode` |

**Expected perf on 4090:** ~3–4 min per clip at 480p × 81 frames. Slightly faster than 2.2 14B (single-model, no HIGH/LOW transition cost).

**Quality trade-off vs 2.2:**

- Face holds well through 3-sec clips, drifts more visibly past 5 sec (vs 2.2 holding to 5+ sec)
- Motion is more subdued — fewer "wow" moments but fewer "obvious AI" moments either
- LoRA compatibility narrower than 2.2 (some community LoRAs don't load — verify per LoRA)
- For IG-reels-style content (short, face-centered), 2.1 480p is reported as acceptable

### 13b — HunyuanVideo-I2V (alternative architecture, viable but less ideal)

Different model family from Tencent. Viable on 24 GB via GGUF quantization. Weaker face-consistency than Wan 2.2 in the standard variant.

**Status on 24 GB (as of 2026-05-13):**

- Q4_K_M GGUF fits comfortably; Q8_0 tight but possible
- Wall time on 4090: ~75 sec for distilled, ~5–10 min full quality
- ComfyUI support: Kijai's `ComfyUI-HunyuanVideoWrapper` OR city96's GGUF route
- Files: `city96/HunyuanVideo-I2V-gguf`

**Why not first-choice:**

- Face drift across frames more pronounced than Wan 2.2 (per multiple comparisons)
- The Hunyuan Video Avatar variant (better for identity-locked work) requires 40 GB+ VRAM — does NOT fit on 24 GB
- Setup complexity comparable to Wan but with less community workflow maturity

**When to consider:**

- You hit a Wan-specific bug that genuinely can't be worked around (rare)
- You want to A/B compare quality
- You're moving to H100 anyway for Phase 3b (HunyuanVideo Avatar) — using standard Hunyuan I2V on 4090 first shares the model knowledge

### 13c — Other 2026 alternatives briefly

| Model | 4090 viable? | When |
|---|---|---|
| **LTX-Video 2.3** | Yes, fastest (~90–120 sec/clip) | Speed-to-iterate. Worse face-hold than Wan |
| **CogVideoX-5B-I2V** | Yes (~12–15 min/clip) | Obsolete vs Wan 2.2 now |
| **Mochi-1** | Yes (~8 min/clip) | Obsolete now |
| **Phr00t/WAN2.2-14B-Rapid-AllInOne** | Yes | Merged single-file Wan 2.2 variant — bypasses MoE complexity. Worth investigating if standard Wan 2.2 keeps failing — architecturally avoids the dual-loader channel bug |

The **Phr00t merged variant** is particularly interesting as a "last resort before Wan 2.1" — it's Wan 2.2 quality without the dual-expert encoder path, which is the layer where the channel mismatch originates.

---

## Appendix A — The 36-vs-68 channel bug: definitive diagnosis

For future-Claude debugging if this fires again. Source code analysis from `wanvideo/modules/model.py` and `nodes.py` in WanVideoWrapper main branch.

### The channel construction (exact code paths)

1. **Noise tensor** (`nodes_sampler.py:270-277`): `noise = torch.randn(16, latent_frames, lat_h, lat_w)` — 16 channels for Wan 14B (5B uses different, hence `is_5b=False` check)

2. **VAE encoding** (`nodes.py:1130` via `WanVideoImageToVideoEncode.process`): VAE encodes the start-image + zero-padded video to produce `y` (latent_image_cond). The output channel count depends on which VAE class loaded:
   - `WanVideoVAE` (z_dim=16) ← Wan 2.1 VAE → y has **16 channels**
   - `WanVideoVAE38` (z_dim=48) ← Wan 2.2 VAE → y has **48 channels**

3. **Mask construction** (`nodes.py:1037-1063`): A 1-channel temporal mask gets reshaped `(1, T/4, 4, lat_h, lat_w)` → `(C=4, T/4, lat_h, lat_w)` → **mask has 4 channels**

4. **Sampler image_cond assembly** (`nodes_sampler.py:218-243`): `image_cond = torch.cat([image_cond_mask, image_cond])` along channel dim 0 → **(4 + y) channels** = 20 (correct path) or 52 (wrong path)

5. **Model forward concat** (`wanvideo/modules/model.py:2444-2450`): `x = [torch.cat([u, v], dim=0) for u, v in zip(x, y)]` where `v = image_cond` → final tensor has **16 + 4 + y = 36 (correct) or 68 (wrong)** channels

6. **Patch embedding** (`wanvideo/modules/model.py:2520-2527`): `self.original_patch_embedding(...)` is called, which is `nn.Conv3d(in_dim=36, ...)`. Weight shape `[5120, 36, 1, 2, 2]`. Conv3d rejects the 68-channel input → error fires

### Why `original_patch_embedding` not `patch_embedding`

From `model.py:1874-1884`:

```python
self.patch_embedding = nn.Conv3d(in_dim, dim, kernel_size=patch_size, stride=patch_size)
...
self.original_patch_embedding = self.patch_embedding   # alias
self.expanded_patch_embedding = self.patch_embedding   # alias
```

The three names exist so downstream modules (control-LoRA, end-ref-latent, IP-image, dual-control, SCAIL, one-to-all) can call the unmodified 36-channel embedding even after some code paths swap `patch_embedding` to a wider `expanded_patch_embedding` (which control-LoRA uses at `model.py:2522-2524`).

In our case (`control_lora_enabled=False`), the dispatcher at `model.py:2520-2527` takes the `else` branch and calls `original_patch_embedding`. **There is no version-skew bug.** `original_patch_embedding` is the correct 36-channel embedding. The bug is upstream — the input has 68 channels because step 2 produced 48-channel `y` from the wrong VAE.

### Why VAELoader's auto-detect doesn't save us

`nodes_model_loading.py:1903-1907` auto-detects z_dim from the VAE's `model.conv2.weight.shape[0]` and picks `WanVideoVAE` (z_dim=16) or `WanVideoVAE38` (z_dim=48) accordingly. It doesn't reject the wrong VAE for the model — it loads whichever VAE you point at and produces latents of the corresponding shape. The crash only happens downstream when those latents hit the diffusion model with mismatched `in_dim`.

This is also why the prior-session diagnosis ("we tried both VAEs, same error") is mathematically improbable. The two VAEs produce different z_dim shapes; if the Wan 2.1 VAE actually loaded, the math would have added to 36 and the error would be different (or absent). Most likely the VAE swap didn't take effect due to ComfyUI's model caching (requires full process restart, not just workflow reload).

---

## Appendix B — Sources & citations

### GitHub issues (Kijai/ComfyUI-WanVideoWrapper)

- [#1281 — patch_embedding 36 vs 68 channel mismatch](https://github.com/kijai/ComfyUI-WanVideoWrapper/issues/1281) — Kijai diagnosed as wrong VAE
- [#2003 — same fingerprint, April 2026](https://github.com/kijai/ComfyUI-WanVideoWrapper/issues/2003) — reconfirmed by community user
- [#1285 — shadow wrapper install causes channel mismatch](https://github.com/kijai/ComfyUI-WanVideoWrapper/issues/1285)
- [#967 — black output, fp8e4nv triton issue](https://github.com/kijai/ComfyUI-WanVideoWrapper/issues/967)
- [#1344 — torch.compile NaN in fp8 GELU](https://github.com/kijai/ComfyUI-WanVideoWrapper/issues/1344)
- [#1375 — slow blockswap regression](https://github.com/kijai/ComfyUI-WanVideoWrapper/issues/1375)
- [#1644 — blockswap broken on certain commits](https://github.com/kijai/ComfyUI-WanVideoWrapper/issues/1644)

### Community discussions

- [HF Comfy-Org/Wan_2.2_ComfyUI_Repackaged disc #3](https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged/discussions/3) — Sage+Triton issue, conflicting custom nodes
- [HF bullerwins/Wan2.2-I2V-A14B-GGUF disc #2](https://huggingface.co/bullerwins/Wan2.2-I2V-A14B-GGUF/discussions/2) — ComfyUI <0.3.46 version issue, GGUF buggy
- [HF lightx2v/Wan2.2-I2V-A14B-Moe-Distill-Lightx2v disc #3](https://huggingface.co/lightx2v/Wan2.2-I2V-A14B-Moe-Distill-Lightx2v/discussions/3) — shift convention difference
- [HF lightx2v/Wan2.2-Lightning disc #16](https://huggingface.co/lightx2v/Wan2.2-Lightning/discussions/16) — sampler settings for Lightning variant

### Working community recipes

- [AI-PET42 Wan2.2-I2V-Workflow-080630.json](https://github.com/AI-PET42/WanWorkflows/blob/main/Wan2.2-I2V-Workflow-080630.json) — Kijai wrapper, 4090-confirmed, Aug 2025
- [NextDiffusion FP8 tutorial](https://www.nextdiffusion.ai/tutorials/exploring-the-new-wan22-image-to-video-generation-model-in-comfyui)
- [NextDiffusion Lightning recipe](https://www.nextdiffusion.ai/tutorials/fast-image-to-video-comfyui-wan2-2-lightx2v-lora)
- [Civitai Enhanced Motions workflow](https://civitai.com/models/1905937)
- [Civitai general Wan 2.2 workflow v1.8.5](https://civitai.com/models/1818841)
- [Phr00t WAN2.2-14B-Rapid-AllInOne](https://huggingface.co/Phr00t/WAN2.2-14B-Rapid-AllInOne) — merged single-file variant

### Performance references

- [Salad blog: Benchmarking Wan 2.1](https://blog.salad.com/benchmarking-wan2-1/)
- [InstaSD: Wan 2.1 perf across GPUs](https://www.instasd.com/post/wan2-1-performance-testing-across-gpus)
- [DigitalCreativeAI: SageAttention + SpargeAttention speedup](https://www.digitalcreativeai.net/en/post/how-speed-up-wan2-2-comfyui-sageattention-spargeattention)
- [RunPod ComfyUI Wan 2.2 guide](https://www.runpod.io/articles/guides/comfyui-wan-2-2)

### Authoritative model file inventory

- `Kijai/WanVideo_comfy` — main repo, bf16 + VAEs + text encoders + Wan 2.1 fp8 + LightX2V LoRAs
- `Kijai/WanVideo_comfy_fp8_scaled` — separate repo for `_KJ` fp8_scaled variants (Wan 2.2 14B I2V lives here)
- `Comfy-Org/Wan_2.2_ComfyUI_Repackaged` — alternative fp8 + fp16 native (slightly smaller fp8 than KJ but designed for native ComfyUI nodes, not Kijai wrapper)
- `QuantStack/Wan2.2-I2V-A14B-GGUF` — recommended GGUF source (not bullerwins')

---

## Doc maintenance

Last updated: 2026-05-13 after a deep research pass following two failed attempts (2026-05-08, 2026-05-11). If the bug still doesn't resolve after executing this doc, the next debugging directions are:

1. The Phr00t merged variant (Section 13c) — architecturally bypasses dual-loader path
2. Wan 2.1 14B 480p fallback (Section 13a) — proven-stable single-stage architecture
3. Direct contact with Kijai via the existing issues #1281 / #2003 with our exact pod environment captured

Memory note `feedback_wan_14b_workflow.md` should be updated after the next session — current diagnosis ("version-mismatch bug in wrapper") was wrong; correct diagnosis is "loaded wrong VAE". Two memory points to correct after success:

1. The `_KJ` fp8_scaled files DO exist for Wan 2.2 14B I2V (in `Kijai/WanVideo_comfy_fp8_scaled`, not the main `WanVideo_comfy` repo)
2. The 36-vs-68 channel mismatch is forced by VAE choice (z_dim=16 vs 48), not a wrapper version bug
