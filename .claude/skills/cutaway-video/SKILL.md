---
name: cutaway-video
description: Make, check and post the next video for the cutaway explainer channel (3D "how it's built" shorts for TikTok and Instagram Reels, built with the kit in channel/). Use for the daily video run, or whenever asked to make, fix, re-render or post one of these videos, add topics, or report how posts are doing.
---

# Cutaway video: the daily run

The kit lives in `channel/` on branch `claude/charming-ride-16utwi` of this repo. Read
`channel/README.md` first. One run makes **one** finished video and queues it for posting, in four
jobs done in order: **topic → script → build and check → post and log.** Do them yourself in
this session; don't hand them to subagents, because each job needs the previous job's details.

## 0. Get set up

```bash
git fetch origin claude/charming-ride-16utwi && git checkout claude/charming-ride-16utwi && git pull
bash channel/setup.sh
```

Commit and push to that branch whenever a step finishes. The machine can restart mid-render,
and anything not pushed is lost. Never push to `main`.

## 1. Topic

Take the first unchecked line in `channel/topics.md`. If `videos/<id>/script.json` already exists,
skip to step 3. Keep the backlog at least 10 topics deep; add ideas that follow its rules.

## 2. Script (`channel/videos/<id>/script.json`)

Copy the shape of `videos/001-pool/script.json`. The format rules come from what made the reference
videos work:

- **205–215 words.** The voice reads about 3.5 words a second, and the video has to stay over
  60 seconds for TikTok to pay on it. `voice.py` refuses scripts that come out too short.
- **The first line is the hook,** about the viewer's own house or yard, with no intro. Example: "If your house
  isn't on a city sewer, every time you flush, it goes into your backyard."
- **A chain of 8–12 problems:** "But [problem]. So you [fix]." Each fix causes the next problem.
- Name each part **after** it appears, and wrap its name in `*asterisks*` so the caption turns yellow.
- **The last line is always** "Congratulations, you just built a *___*."
- One beat per line. Beat ids are short, lowercase and unique (`dig`, `rebar`, `seep`…).
- Plain words a 12-year-old would follow. Don't use "simply" or "basically", and don't add a call to
  action or a "follow for more".
- **Facts:** check every number and claim with a web search before building. Soften claims you can't
  pin down ("often", "about"). A wrong fact in the comments costs more than the video gains.
- Also fill in `title`, `caption` (one line, plus 4–5 hashtags, always including `#howitsbuilt`) and `cover`
  (the second that makes the best thumbnail, usually the finished build).

Then run `python3 channel/tools/voice.py <id>` and read the line timings it prints. Beats under
about 1.2 s need a visual change that reads instantly.

## 3. Build and check (`channel/videos/<id>/scene.js`)

Start from `videos/001-pool/scene.js`; it uses every engine feature. `build(ctx)` creates all the objects
once and returns `update(t)`. **`update(t)` must be a pure function of time:** no state carried
between frames, because frames render out of order across several workers.

The engine (`engine/engine.js`) gives you:

- `ctx.buildYard({ profile, depth, rockTop })`: the lawn, a cut-away bank of earth with a hole shaped
  like `profile` (a polyline from top-left, down and around, to top-right, with y ≤ 0), plus the fence,
  houses, trees and sky. Use `rockTop` to bring bedrock into frame so the bottom third isn't empty.
- `ctx.tl`: the timeline. `tl.p(beat, a, b)` gives an eased 0→1 over fractions of a beat,
  `tl.ps(beat, secA, secB)` the same over seconds, `tl.lin` a linear version, and `tl.on(beat)`, `tl.at(beat, f)`,
  `tl.start` / `tl.end`.
- `ctx.shots([...])`: camera keyframes, one per beat or more:
  `{ at: 'beat', pos: [x,y,z], look: [x,y,z], fov, blend, push, offset }`.
- `ctx.setNight(k)` fades to night (house windows light up).
- Geometry helpers: `insetProfile`, `xSpanAt`, `bottomAt`, `samplePolyline`, `extrude`, `wallGeometry`, `shapeOf`,
  `roundedPath`. Builders: `makePipe(ctx, points, { dots })` (`.grow(p)` and `.flow(t, on)`), `instanced(ctx, geo, mat, n)`
  for particles, and `makeDuck(ctx)` for the mascot (`.tint(color, k)`).
- Reveal techniques that work: a clipping plane swept along x (spraying, coating), a clipping plane
  lowered or raised in y (digging, water filling), a color lerp (water going green, concrete curing), a scale
  with `easeOutBack` (equipment popping in), and `easeOutBounce` drops (blocks, lids).

**Check stills before the full render.** It takes seconds:

```bash
node channel/tools/render.js <id> --times <one time per beat, mid-beat> --workers 3
```

Tile them (`ffmpeg -pattern_type glob -i 'channel/out/<id>/stills/*.jpg' -vf "scale=270:480,tile=5x4" sheet.jpg`) and
look at every frame. Fix anything on this list before rendering it all:

- **Every beat shows a visible change** that matches its words. Each word should have a picture.
- **Fill the frame.** Shoot from above and in front (camera y about 4–6) so the build fills the
  middle. A low, straight-on camera leaves the bottom half as empty dirt.
- **Nothing shows up before it exists** (that's how the pool light ended up on bare dirt in v1),
  and nothing important sits under the caption at 44% height or in TikTok's right-hand button column.
- **The duck has one small gag per video** (falls in, gets dirty, shivers, floats).
- Text stays readable, and nothing flickers or pops between neighboring stills.

Then render it all: `bash channel/make.sh <id>` (or `node channel/tools/render.js <id> --workers 4` then
`bash channel/tools/mux.sh <id>`). Run it in the background. If the machine restarts, re-run with `--resume 1`.
Check the result: `ffprobe` says over 61 s, 1080×1920 and 30 fps, plus a contact sheet of one frame per second.

## 4. Post and log

Post any videos `log.md` lists as "built, not posted" first, oldest first. Their files are in
`channel/out/<id>/final.mp4` if this machine still has them; if not, re-run `bash channel/make.sh <id>`.

1. Upload `channel/out/<id>/final.mp4` to Higgsfield: `media_upload` with `filename: final.mp4` and `video/mp4`,
   `curl -X PUT --upload-file` to the returned URL, then `media_confirm` (type `video`). Keep the hosted URL.
2. **TikTok:** `tiktok_accounts`. If there's an active account, `tiktok_prepare_publish` with `mode: DIRECT_POST`,
   `media_type: VIDEO`, the hosted `video_url`, the script's `caption` as the description and `is_aigc: true`. The owner
   confirms in the form it opens; don't try to post without them. If there's no account, skip this and say so.
3. **Instagram:** Supermetrics `manage_social_media`, `action: publish`, `ds_id: IGI`, `content_type: VIDEO`, `media_url`
   set to the hosted URL, and `caption`. Run `validate_only: true` first. If it returns an approval link, pass it to
   the owner. If Instagram isn't connected, skip it and say so.
4. Add a row to `channel/log.md`, tick the topic in `topics.md`, then commit and push.
5. Fill in the 48-hour numbers for earlier posts: Supermetrics IGI for Instagram; TikTok numbers come
   from the owner until a TikTok analytics source is connected. After ten videos, re-order `topics.md`
   toward whatever held viewers longest.

## Hard rules

- Never post anything the owner hasn't confirmed, and never change account settings.
- Never copy another channel's look, name, catchphrase or mascot.
- If a fact can't be verified, the line goes. If a build can't be made to look right, ship the
  stills to the owner and ask, rather than posting a weak video.
