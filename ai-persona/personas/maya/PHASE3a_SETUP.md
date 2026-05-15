# Phase 3a Setup — `maya` Image-to-Video Pipeline

Operational runbook for the Wan 2.2 5B Turbo I2V pipeline. Read this **before** spinning up a new pod — saves rediscovering everything from scratch.

For why-we-chose-this-stack rationale, see `ai-persona/PLAN.md` Phase 3a section. This doc is the *how*, not the *why*.

---

## State of the network volume (as of 2026-05-08)

- **Volume name:** `combined_crimson_swordtail` (100 GB)
- **Region:** US-TX-3 (locked — pods must spin up in this region to mount it)
- **Standing cost:** ~$7.00/mo (100 GB × $0.07/GB)
- **Used:** ~86 GB / 100 GB (~14 GB headroom)

### What's on it

| Path | Size | Purpose |
|---|---|---|
| `/workspace/ComfyUI/` | ~150 MB | ComfyUI source, custom nodes, output folder |
| `/workspace/ComfyUI/models/diffusion_models/Wan22-Turbo/Wan2_2-TI2V-5B-Turbo_fp16.safetensors` | ~8.4 GB | **5B Turbo video model — currently the only working video pipeline. Don't delete.** |
| `/workspace/ComfyUI/models/diffusion_models/Wan2_2-I2V-A14B-HIGH_bf16.safetensors` | 28.6 GB | 14B I2V HIGH expert (bf16 — see Wan 14B section below for status) |
| `/workspace/ComfyUI/models/diffusion_models/Wan2_2-I2V-A14B-LOW_bf16.safetensors` | 28.6 GB | 14B I2V LOW expert (bf16 — see Wan 14B section below for status) |
| `/workspace/ComfyUI/models/text_encoders/umt5-xxl-enc-fp8_e4m3fn.safetensors` | 6.3 GB | Text encoder (fp8 — saves 5 GB vs bf16, minor quality cost) |
| `/workspace/ComfyUI/models/vae/Wan2_2_VAE_bf16.safetensors` | 1.4 GB | Wan 2.2 VAE — used by 5B Turbo workflow |
| `/workspace/ComfyUI/models/vae/Wan2_1_VAE_bf16.safetensors` | ~250 MB | Wan 2.1 VAE — referenced by 14B example workflow (turned out not to fix the 14B issue, but kept since it's tiny) |
| `/workspace/ComfyUI/models/loras/lightx2v_I2V_14B_480p_cfg_step_distill_rank64_bf16.safetensors` | 750 MB | LightX2V step-distillation LoRA — required by the 14B example workflow at its default settings (6 steps, cfg 1) |
| `/workspace/ai-toolkit/` | ~3 GB | Phase 2 LoRA trainer (kept for future personas). **Note:** the `venv/` subfolder was deleted 2026-05-08 (15 GB of dead weight; trainer uses system python). |
| `/workspace/hf_cache/` | 14 GB | SDXL bases (Juggernaut, RealVisXL, gonzalomo, etc.) |
| `/workspace/cash/` | 120 MB | This repo, cloned for reference (stale — `git pull` next session if you need recent docs on the pod) |

### What's NOT on it (lives on container disk, has to be reinstalled each session)

- pip-installed Python packages (ComfyUI deps, WanVideoWrapper deps, ai-toolkit deps)
- apt-installed `ffmpeg`
- The running ComfyUI process

### Wan 14B I2V status (2026-05-08) ⚠️ blocked

The 14B HIGH+LOW bf16 weights are on disk but the example workflow `wanvideo_2_2_I2V_A14B_example_WIP.json` won't run with them. After many remaps, generation fails at `original_patch_embedding`: model expects 36 input channels, encoder produces 68 channels. Issue persists across Wan 2.1 ↔ Wan 2.2 VAE swap (so VAE wasn't the cause).

**Best hypothesis:** the workflow is designed for the **fp8 KJ-quantized variants** (`Wan2_2-I2V-A14B-{HIGH,LOW}_fp8_e4m3fn_scaled_KJ.safetensors`), and the encoder produces a different conditioning shape than bf16 unquantized weights produce.

**Two paths to try next session** (in this order):

1. **Swap to fp8 KJ files.** Delete the current bf16 files (~57 GB freed), download the fp8 KJ versions (~14 GB each, ~28 GB total). Workflow's hardcoded `quantization: fp8_e4m3fn_scaled` setting will then match. Don't override anything else — load workflow as-shipped and run with LightX2V at 6 steps / cfg 1 / Wan 2.1 VAE.

2. **Try `wanvideo_2_2_I2V_A14B_TimeToMove_example.json`** — a different example shipped in `custom_nodes/ComfyUI-WanVideoWrapper/example_workflows/`. Possibly more compatible with bf16.

Until 14B works, **5B Turbo is the production video pipeline.** Keep it intact.

---

## Spin-up procedure (next session, ~10 min total)

### 1. Create the pod (in RunPod UI)

- **GPU:** RTX 4090 in **US-TX-3** (matches volume region)
- **Network volume:** attach `combined_crimson_swordtail` → mount at `/workspace`
- **Container disk:** 20 GB is enough
- **Template:** `runpod/pytorch:2.4.0-py3.11-cuda12.4.1-devel-ubuntu22.04` (or any current Pytorch base)
- **Expose HTTP ports:** **set `8888,8188` at creation** ⚠️ — editing post-deploy forces a container reset and you'll lose all pip-installed packages

**Note:** the prior version of this doc said "CPU pods aren't available in US-TX-3" — that turned out to be wrong (they're listed in the UI under the CPU tab). They're fine for download-only work, though for video generation you need the GPU anyway.

### 2. Open web terminal, run the rebuild block (~5–8 min)

```bash
export HF_HOME=/workspace/hf_cache
echo 'export HF_HOME=/workspace/hf_cache' >> ~/.bashrc
apt update && apt install -y ffmpeg
pip install imageio_ffmpeg
cd /workspace/ComfyUI && pip install -r requirements.txt
cd /workspace/ComfyUI/custom_nodes/ComfyUI-WanVideoWrapper && pip install -r requirements.txt
cd /workspace/ComfyUI/custom_nodes/ComfyUI-KJNodes && pip install -r requirements.txt
cd /workspace/ComfyUI && python main.py --listen 0.0.0.0 --port 8188
```

Wait for `To see the GUI go to: http://0.0.0.0:8188`. Don't close this terminal — it holds the running process.

**If you also need ai-toolkit (LoRA training)** — run this in a separate terminal *before* launching ComfyUI:

```bash
cd /workspace/ai-toolkit && pip install -r requirements.txt
pip install --force-reinstall torch==2.6.0 torchvision==0.21.0 torchaudio==2.6.0 --index-url https://download.pytorch.org/whl/cu124
pip install "numpy<2.0"
```

The torch dance is mandatory — ai-toolkit's diffusers fork uses PEP 604 unions in `attention_dispatch.py` that the container's default torch 2.4.1 can't parse.

### 3. Open ComfyUI in browser

In RunPod's Connect tab, click the `Port 8188 → HTTP Service` link (must be signed in to RunPod in same browser, otherwise 403).

### 4. Load the workflow

In Jupyter Lab (Port 8888 → Ready), navigate to:
```
ComfyUI/custom_nodes/ComfyUI-WanVideoWrapper/example_workflows/wanvideo_2_2_5B_I2V_example_WIP.json
```

Right-click → Download. Drag the JSON onto the ComfyUI canvas.

(Once you've saved a customized version of this workflow to `personas/maya/`, drag *that* in instead — it'll already have all the settings below applied.)

---

## Known-good workflow settings (calibrated 2026-05-06)

The default workflow ships with settings tuned for the *base* 5B model with current torch nightly. We use the **Turbo** variant on stable torch 2.4.1, so several values must change.

### Model loaders (one-time after loading workflow — use "Use from Library" dropdowns)

| Loader | Pick this file |
|---|---|
| Diffusion model | `Wan22-Turbo/Wan2_2-TI2V-5B-Turbo_fp16.safetensors` |
| Text encoder (T5) | `umt5-xxl-enc-fp8_e4m3fn.safetensors` |
| VAE | `Wan2_2_VAE_bf16.safetensors` |

### WanVideo Model Loader node — critical settings

| Field | Default | Set to | Why |
|---|---|---|---|
| `base_precision` | `fp16_fast` | **`fp16`** | `fp16_fast` requires torch 2.7+ nightly; we're on 2.4.1 → hard error if not changed |
| `attention_mode` | `sageattn` | **`sdpa`** | `sageattention` package isn't installed → hard error if not changed |

### WanVideo Sampler — critical settings

| Field | Default | Set to | Why |
|---|---|---|---|
| `steps` | `30` | **`6`** | Turbo is calibrated for 4–8 steps; 30 wastes 5× the GPU time |
| `cfg` | `5.00` | **`1.00`** | Turbo is *distilled* — CFG > 1 produces overcooked, "creepy" output. This is the #1 quality fix. |
| `shift` | `8.00` | `5.00` | Lower shift suits Turbo at low step counts |

Leave `scheduler: flowmatch_pusa`, `denoise_strength: 1.00`, `seed: any` as default.

### Resize Image v2 (KJNodes) — output dimensions

| Field | Default | Set to | Why |
|---|---|---|---|
| `width` | `1024` | **`720`** | Vertical reels are the priority format |
| `height` | `1024` | **`1280`** | 9:16 = IG/TikTok native |
| `keep_proportion` | `crop` | `crop` | Crops cleanly when SDXL still aspect ≈ output aspect |

Other usable presets:
- `832 × 1216` — matches SDXL stills natively (no crop)
- `1024 × 1024` — square legacy IG
- `1280 × 720` — horizontal (low priority)

### Empty Embeds — clip length

| Field | Default | Set to | Why |
|---|---|---|---|
| `num_frames` | `121` | `121` (= ~5s @ 24fps) or `81` (~3.4s) | Drop to 81 if hitting OOM |

---

## Memory pressure / OOM mitigations

OOM warnings appeared during this session — VRAM was sitting near the 24 GB ceiling on the 4090. If they come back:

1. **Lower `num_frames`**: 121 → 81 (-33% activation memory)
2. **Lower resolution**: 720×1280 → 624×1104 (-24% pixels)
3. **Verify `force_offload: true`** is set on text encoder *and* model loader nodes
4. **Last resort: switch to GGUF quantized model** (~5 GB instead of 10 GB) — kijai's wrapper supports GGUF in the main loader; minor quality cost

---

## Quality tuning notes

- **Avoid facial expression changes in motion prompts** ("slight smile" → uncanny morphs). Stick to ambient/postural motion: breathing, hair movement, head turns, posture shifts.
- **Identity drift scales with clip length.** 3 sec drifts noticeably less than 5 sec. For posts that need 10+ sec, stitch multiple short clips rather than one long one.
- **Generate 3–4 takes per still and pick the best** — Wan is stochastic, same input + different seed = noticeably different drift.
- **Tighter face crops fight the model less** than wide frames.
- **End-frame trick:** for clips that should end on a hero pose, generate with motion *away from* the pose, then `ffmpeg -vf reverse -af areverse` the output. Reads as motion *toward* the pose.

Plan for **~50% reject rate on first 5–10 clips.**

---

## Common gotchas (from the 2026-05-06 setup session)

| Gotcha | Symptom | Fix |
|---|---|---|
| `huggingface-cli` is deprecated | Command warns + does nothing | Use `hf` instead, same flags |
| HF cache fills container disk | Disk full during model downloads | `export HF_HOME=/workspace/hf_cache` before any download |
| Workflow filenames don't match Kijai's repo paths | "3 missing models" error on first load | Use the in-UI "Use from Library" dropdowns to remap |
| ComfyUI kjnodes not pre-installed | "Missing Node Packs (1): comfyui-kjnodes" | `git clone https://github.com/kijai/ComfyUI-KJNodes.git` into `custom_nodes/`, restart |
| Pod port not exposed at creation | 502 Bad Gateway / can't reach ComfyUI | Edit pod → add 8188 → reset (annoying). Better: set both 8888,8188 at creation |
| Web terminal disconnects randomly | "Connection Closed" | Pod is fine, just reopen the terminal — ComfyUI process keeps running independently |
| Direct image upload via UI fails | "Failed to upload file" | Upload via Jupyter to `ComfyUI/input/` instead, then use "Use from Library" |
| Pasting GH PAT in URL creates a folder by that name | Token leaked in folder name | Already fixed; **never paste tokens in URLs**, use env vars |

---

## Cost summary

| Cost | Amount | Frequency |
|---|---|---|
| Network volume storage | ~$3.50 | per month, standing |
| 4090 GPU pod | ~$0.34–0.69/hr | only when generating |
| Setup-and-tune session (one-time) | ~$3–5 total | this session |
| Typical generation session | ~$0.30–1.00 | per session, 1–3 hrs |

PLAN.md budgeted $15–30 for first session — actual was well under that.

---

## Next major upgrade

**Phase 2.5 LoRA v2: complete** — `maya_lora_v2.safetensors` trained, qualitative comparison vs v1 was favorable. Per-base weight calibration and systematic 3-base validation deferred to next session.

**Wan 14B I2V: in progress** — blocked on workflow compatibility (see Wan 14B status section above). Resume from there. Until unblocked, 5B Turbo remains the production video pipeline.

See `UPGRADE_SESSION.md` for the full session-2 outcome and resume points for next session.

## Outstanding / next-session todos

- [ ] **Unblock Wan 14B I2V** — try the two paths in the Wan 14B status section (fp8 KJ swap, or TimeToMove workflow).
- [ ] **Save the customized 5B Turbo workflow JSON** → ComfyUI → Save (Browser) → drop file in `personas/maya/wanvideo_5B_I2V_maya.json` → commit. Removes the "fix all the settings" step every future session.
- [ ] **Get 5–10 clean clips out** with the tuned 5B Turbo settings to validate the pipeline end-to-end while 14B is still blocked.
- [ ] **Test tier-3 NSFW clips** specifically — the workflow handles them the same way (just feed an NSFW SDXL still), but worth confirming Wan 2.2 doesn't introduce content-filter artifacts.
- [ ] **Phase 3b deferred until tier-2/3 video pipeline is producing reliably.** The H100 cost only makes sense when there's real revenue to justify vlog/talking-head content.
