# Cutaway channel: video kit

Short vertical videos that explain how something around a house is built. Each one is a
60–70 second 3D cutaway: every fix causes the next problem ("But… so you…"), and each one
ends on our catchphrase, "Congratulations, you just built ___." The mascot is a rubber duck in
a hard hat. Videos post to **TikTok and Instagram Reels** (YouTube was dropped).

This folder lives in the EverGlow website repo, but Netlify never publishes it: `netlify.toml`
copies only the site's own pages into `dist/`.

## Make a video

```bash
bash channel/make.sh 001-pool
```

That runs three steps; each can also run on its own:

1. `python3 tools/voice.py <id>` reads `videos/<id>/script.json` and writes the narration
   (`out/<id>/voice.wav`) plus `out/<id>/timeline.json`, which records when every line and
   word is spoken. If the read comes out under 62.5 s it slows the voice slightly (never
   below 0.9×) and lengthens the pauses, because TikTok only pays on videos over one minute.
2. `node tools/render.js <id>` renders every frame of `videos/<id>/scene.js` in headless
   Chromium (about 15–25 min for a minute of video on this machine). `--times 1,5,20` renders
   just those moments into `out/<id>/stills` for checking. `--resume 1` keeps frames already
   rendered if the machine restarted.
3. `bash tools/mux.sh <id>` encodes `out/<id>/final.mp4` (1080×1920, loudness −14 LUFS) and
   `out/<id>/cover.jpg`.

`out/`, `.cache/` and `node_modules/` are not committed. `bash setup.sh` reinstalls them on a fresh
machine (the narration voice downloads from GitHub).

## Folder layout

| Path | What it is |
| --- | --- |
| `engine/engine.js` | Shared engine: renderer, backyard cutaway world, materials, camera moves, captions, pipes, particles, the duck |
| `engine/stage.html` | The page the renderer loads; it pulls in a video's scene |
| `videos/<id>/script.json` | The narration, split into beats. `*word*` turns a caption word yellow |
| `videos/<id>/scene.js` | That video's animation, keyed to the beats |
| `tools/` | Voice, render and encode steps |
| `topics.md` | The backlog of future videos, in order |
| `log.md` | What was made and posted, and how each post did |

## Narration voice

Kokoro (`af_heart` voice), an open model under the Apache 2.0 license, which allows commercial
use. It runs locally, so narration costs nothing. To try another voice, set `"voice"` in a
script: `am_michael`, `am_fenrir`, `am_puck`, `bm_george` and others are available.

## Posting

- **TikTok:** through the Higgsfield connector. Upload `final.mp4` to Higgsfield, then
  `tiktok_prepare_publish`. The account owner confirms each post in the form it opens.
- **Instagram Reels:** through the Supermetrics connector (`manage_social_media`, `publish`,
  `content_type: VIDEO`), using the Higgsfield-hosted video URL. Supermetrics may return an approval
  link for the owner to tap.
- Turn on TikTok's "AI-generated content" label, because the narration voice is synthetic.
