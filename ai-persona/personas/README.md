# Personas

One folder per persona. Each is self-contained — you can run, pause, kill, or relaunch a persona without touching the others.

This structure exists so the workflow scales linearly to 3–4+ accounts: same pipeline, copy-paste new identity.

---

## Spinning up a new persona

```sh
cp -R personas/_template personas/<name>
```

Then fill out, in order:

1. **`persona.md`** — identity card. Decide *who this person is* before you generate anything. Niche, vibe, age, look, voice, target audience, monetization angle. The face is downstream of the persona, not the other way around.
2. **`prompts.md`** — locked prompt tokens that bake in the visual identity. Filled in iteratively as you find what works in Draw Things / ComfyUI.
3. **`reference/`** — 30–50 base shots (Phase 1 output). These become LoRA training data in Phase 2.
4. **`lora/`** — trained LoRA `.safetensors` (Phase 2 output). Empty until then.
5. **`content/`** — generated images and videos, organized by date (e.g. `2026-05-04/`).
6. **`posts.jsonl`** — append-only log of every post. Mirror of `sportsbook-arb/tracker/events.jsonl`. One JSON object per line.

---

## `posts.jsonl` schema

One line per post. Append-only — never edit past entries; correct via a new entry with `"correction_of": "<prior_id>"`.

```json
{"id":"2026-05-04T19:30:00Z-ig-001","persona":"<name>","platform":"instagram","ts":"2026-05-04T19:30:00Z","asset":"content/2026-05-04/img_07.jpg","caption":"...","hashtags":["..."],"link_in_bio":"fanvue.com/<name>","metrics_24h":null,"metrics_7d":null,"notes":""}
```

When you have engagement numbers, append a metrics-update entry (don't edit the original):

```json
{"id":"2026-05-05T19:30:00Z-metrics-001","update_of":"2026-05-04T19:30:00Z-ig-001","metrics_24h":{"likes":120,"comments":8,"saves":3,"reach":2400}}
```

---

## Naming conventions

- Persona folder name: lowercase, no spaces (`maya`, `juno`, `lex`). Match the IG handle if possible.
- Don't use real first+last names of real people — bypass deepfake / right-of-publicity issues entirely.
- The folder name is internal; the public-facing name lives in `persona.md` under `display_name` and `handle`.

---

## Don't

- **Don't share LoRAs across personas.** The whole point is one face per LoRA.
- **Don't share prompts wholesale across personas.** Same niche tokens = same audience = cannibalization.
- **Don't reuse reference shots.** Each persona's `reference/` is a closed set tied to its LoRA.
