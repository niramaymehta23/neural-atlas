# Engines, CI, hosting and repo fixes

## CI-01 · Blocker · CI on main is red: perf assertions are too strict and run beside everything else
- **Status:** Fixed in fd27c88. Local reference run green; 10 consecutive green GitHub runs still to be observed after merge.
- Evidence: runs 43912455168 and 43914793216: `engines.spec.ts` fps tests measured 17.64 and 21.58 ms against 17.5; `headline.spec.ts:77` 17.75 ms; `home.spec.ts:41` click-to-lesson 4907 ms against 3000. Code: `e2e/frames.ts:45-46`, `playwright.config.ts:9` (fullyParallel, 2 workers, software WebGL), `e2e/engines.spec.ts:17`.
- Fix:
  - Two Playwright projects. `functional`: everything not tagged `@perf`, parallel, `retries: CI ? 1 : 0`. `perf`: `@perf` only, `workers: 1`, runs after `functional` so nothing runs beside it.
  - Tag the three fps tests, both home timing tests and the "threads within 3 s" test `@perf`.
  - Measure main-thread blocking: `PerformanceObserver({type:"longtask"})`, dropped-frame ratio (gaps > 33 ms) and p95, against an idle baseline taken on the same page in the same run.
  - `PERF_PROFILE=reference` (local or real hardware) keeps the strict 60 fps budget; `PERF_PROFILE=ci` makes it `expect.soft` and hard-fails only on gross regressions (long tasks under 100 ms per 3 s, dropped frames under 10%). Numbers attached as annotations.
  - Home flight: time the glide in the page with `performance.mark` (≈1.1 s ± 0.3), separately from lesson loading (generous 10 s).
- Proof: 10 consecutive green runs of `functional`; `perf` writes a JSON artifact; a strict local run on a laptop still passes 60 fps.

## CI-02 · High · Serial mode hides real regressions
- **Status:** Fixed in fd27c88.
- Evidence: `e2e/engines.spec.ts:17`; run 43914793216 shows "4 did not run" (scrub/ghost, 200 connections, TF.js backend, 3D scenes).
- Fix: drop `mode:"serial"`; perf tests live in the `perf` project.
- Proof: force-fail the fps test; the other four still run.

## CI-03 · High · The caption gate has never passed in CI
- **Status:** Replaced: Gemini check removed by owner decision. `scripts/check-captions.ts`, its tests, fixture and lock file and the CI job are gone; the session that writes a string reviews it against "would a smart 12-year-old follow this?".
- Evidence: `.github/workflows/ci.yml:25-28`, `scripts/check-captions.ts:37-38,90-108,136-147`. Run 43899694531: "GEMINI_API_KEY is required in CI". On stage 04/05 runs it never ran (it sits after e2e), so their strings are unchecked.
- Fix:
  - Its own job, parallel with build. With no secret: `::warning::` and pass on PRs; fail only on push to main.
  - A committed verdict cache `captions.lock.json` (string hash → verdict, model, date) so only new or changed strings are sent and results are reproducible.
  - `AbortSignal.timeout(30_000)`, 3 retries with backoff on 429/5xx, a short delay between batches.
  - Model from `vars.GEMINI_MODEL` (default `gemini-2.5-flash`), clear message on 404.
- Proof: unit tests for 429-then-200, timeout, cache hit sends nothing, no key on a PR exits 0 with a warning.

## CI-04 · Medium · CI keeps no evidence and has no caching
- **Status:** Fixed in fd27c88.
- Evidence: no `upload-artifact`; "No build cache found"; build time went from ~13 s to 4.4 min at stage 05; actions on `@v4` with a Node 20 deprecation warning; no `permissions`/`concurrency`.
- Fix: upload `playwright-report/` and `test-results/` on failure; cache `.next/cache`; bump actions; `permissions: contents: read`; `concurrency` with cancel-in-progress.

## CI-05 · Low · The e2e server doesn't match real hosts
- **Status:** Fixed in fd27c88.
- Evidence: `scripts/serve-static.ts:13-23` (no `.mjs`, `.wasm`, `.onnx` types), `playwright.config.ts:17` (`reuseExistingServer` reuses a stale `out/`), `engines.spec.ts:30` (`?? chromium.launch()` leaks a browser).
- Fix: add the MIME types; `reuseExistingServer: false`; close the launched browser.
- Proof: e2e asserts the wasm response is `application/wasm`.

## ENG-06 · High · Without cross-origin isolation the training lessons crash
- Evidence: `src/engine/model/live.ts:13` (`new SharedArrayBuffer`), thrown in `useEffect` (`stacking-cells/scene.tsx:56`, `TrainingLab.tsx:54`); nothing checks `crossOriginIsolated`.
- Fix: when not isolated, `ModelEngine` uses a plain buffer and the worker posts a `live` copy at most once per ~16 ms; `readLive()` keeps the same API. Plus the error boundaries in PLT-04 and `src/app/learn/[moduleId]/error.tsx` with "this lesson could not start".
- Proof: vitest with `SharedArrayBuffer` undefined still yields `readLive()` frames; an e2e project serving without headers trains stacking-cells.
- Fixed in e6abe74.

## ENG-07 · High · Worker failures never reach the UI; promises can hang forever
- Evidence: `src/engine/model/model-engine.ts:62-74` (no `onerror`/`onmessageerror`); no consumer passes `onError` (`stacking-cells/scene.tsx:56-70`, `TrainingLab.tsx:54-60`); `src/engine/pretrained/attention-client.ts:35-49` (no timeout; `onerror` doesn't terminate the old worker).
- Fix: port error handlers that fail `ready`, settle pending calls and call `onError`; 20 s `ready` timeout; an `error` field in the lesson view with a plain caption and "Try again"; attention: 60 s first-load and 10 s per-read timeouts, terminate the old port.
- Proof: fake port `onerror` rejects `ready` and pending `predict`; attention load timeout; e2e routes the worker script to 404 and sees the caption.
- Fixed in e6abe74.

## ENG-08 · High · An empty garden makes the trainer spin and flood the main thread
- Evidence: `stacking-cells/model.ts:9,49` (`plant("own")` returns `[]`), `src/engine/model/backends/autodiff.ts:50` (loss 0 instantly), `trainer.ts:80`; `batchSize <= 0` loops forever (`autodiff.ts:39`, `tfjs.ts:86`).
- Fix: with `data.count === 0`, `run`/`step` are no-ops and post `{type:"idle", reason:"no-data"}`; validate `batchSize >= 1` and `snapshotEvery >= 1` in `init`; the scene says "Plant some flowers first" and disables "Let it learn".
- Proof: trainer tests for empty data and `batchSize: 0`.
- Fixed in fbfff76.

## ENG-09 · Medium · Link replay is unbounded and not faithful
- Evidence: `stacking-cells/scene.tsx:72` (`step(start.epochs)` in one task, unclamped), `trainer.ts:112-129` (final settings used from epoch 0; RNG and optimiser state not restored).
- Fix: clamp epochs (5000); replay in slices with a progress caption; record a compact change log (epoch, setting) in state and replay it — or put RNG and optimiser state plus params in the snapshot. Update architecture.md's determinism note.
- Proof: change the step at epoch 50, continue to 100, replay from state → identical params; `epochs: 1e9` is clamped.
- Fixed in fbfff76 (scheduled changes, sliced replay), b3dc27d (the lesson's change log).

## ENG-10 · Medium · No divergence or NaN handling
- Evidence: `src/engine/autodiff/optimisers.ts:31-51`, `backend.ts:31-34`; TF.js the same.
- Fix: after each epoch, a non-finite loss or parameter stops the run and posts `{type:"diverged", epoch}`; lessons show "the steps got too big"; the live buffer keeps the last finite params.
- Proof: SGD at learning rate 1e6 emits `diverged` and stops.
- Fixed in fbfff76.

## ENG-11 · Medium (suspected) · TF.js backend stalls the GPU every batch
- Evidence: `tfjs.ts:100` (`await cost.data()` per batch), `trainer.ts:71` → `tfjs.ts:114-128` (all kernels read each epoch), `tfjs.ts:151` (Adam LR set on an internal field); no WebGPU device-loss handling.
- Fix: accumulate loss on the GPU and read once per epoch; write live params at most every ~16 ms; on device loss re-init on WebGL; recreate Adam on LR change.
- Proof: epochs/second before and after; `configure` changes the Adam step.
- Fixed in fbfff76.
- Follow-up, fixed in 698aade: under heavy load the TF.js e2e stayed at epoch 0. Cause: WebGL checks each new shader program synchronously, so the worker froze while a swamped graphics process compiled (over 30 s with 4–8 browsers), and each epoch then waited on 7 device reads in a row (~0.8 s each). Fix: the model's programs are compiled ahead without blocking (compile-only mode, parallel compile, shape uniforms) plus one real read; a device not ready within 5 s is passed over; parameters come back in one read; three slow reads in a row (over 1 s each) move training to the next device, as a lost device does. Proof: the e2e passed 8/8 and 12/12 run in parallel (0/8 before); unit tests for passing over a device, the deadline and the slow-read rule.

## ENG-12 · Medium · 3D has no WebGL fallback; replaced geometry leaks
- Evidence: `src/scene3d/SoftStage.tsx:22` (R3F throws without WebGL), `LossLandscape.tsx:57-86` (geometry never disposed).
- Fix: error boundary around SoftStage with a static fallback (home uses the NAV-06 lesson list; the valley a static 2D contour); `useEffect(() => () => geometry.dispose(), [geometry])`; listen for `webglcontextlost`.
- Proof: e2e with WebGL disabled: home lists 74 ideas and a link opens a lesson.
- Fixed in 91e51f5, 56c41fb.

## ENG-13 · Low · The attention worker lives for the whole session
- Evidence: `attention-client.ts:72-77`, `attention-worker.ts:52`.
- Fix: reference-count from the scene; terminate after 60 s unused; reset `loading` only on load failures.
- Fixed in 7956125.

## HOST-14 · High · No deploy target, and the obvious hosts break the design
- **Status:** Fixed in fd27c88 (deploy and smoke jobs, ready for Cloudflare Pages). Owner still connects the account: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` secrets (steps in architecture.md, Hosting and CI).
- Evidence: no deploy config or workflow; `docs/requirements.md:327` says Vercel or Cloudflare Pages; Vercel ignores `_headers`; GitHub Pages can't send COOP/COEP, needs `.nojekyll` and a sub-path; `MODELS_PATH = "/models/"` (`src/engine/pretrained/runtime.ts:5`).
- Fix: Cloudflare Pages (or Netlify) with a deploy workflow; a post-deploy smoke job asserting COOP/COEP on `/` and `/learn/stacking-cells` and `crossOriginIsolated` in Playwright against the preview URL. If a sub-path is ever needed, derive `MODELS_PATH` from `NEXT_PUBLIC_BASE_PATH`.
- Owner action: choose the host and connect the account (needs your credentials).

## HOST-15 · High · The ONNX runtime file is over Cloudflare's 25 MiB limit and shipped twice
- **Status:** Fixed in fd27c88.
- Evidence (verified): `out/models/ort/ort-wasm-simd-threaded.asyncify.wasm` and `out/_next/static/media/ort-wasm-simd-threaded.asyncify.*.wasm` are both 26,861,777 bytes; `out/` is 82 MB. Raw `worker.*.ts` files also leak into `_next/static/media`.
- Fix: use the non-asyncify `ort-wasm-simd-threaded.wasm` (~11 MB; the code forces `device: "wasm"`); keep exactly one copy (drop `scripts/copy-runtime.ts` and point `wasmPaths` at the bundled asset, or alias so the bundler doesn't emit its own); a build check that fails on any file over 24 MiB or duplicate content.
- Proof: `find out -size +24M` empty; attention e2e passes.

## HOST-16 · Medium · No caching headers; model updates will be served stale
- **Status:** Fixed in fd27c88.
- Evidence: `public/_headers` has only COOP/COEP; model and wasm at unversioned URLs; Transformers.js caches in the Cache API.
- Fix: `/_next/static/*` immutable for a year; `/models/*` one day; versioned model folder (`attention-minilm@v1`).
- Proof: serve-static header check; `ATTENTION_MODEL` contains a version.

## HOST-17 · Low · Production ships the styleguide and evidence pages
- **Status:** Partly fixed in fd27c88: kept on purpose and recorded in architecture.md (the e2e and smoke tests use them); the `noindex` itself is NAV-28 (H2).
- Fix: keep them but `noindex` (NAV-28) and say so in architecture.md, or hide them behind a build flag.

## REPO-18 · Low · Unused dependencies
- **Status:** Fixed: `d3` and `@types/d3` removed in fd27c88; `@tensorflow/tfjs` split into `tfjs-core`, `tfjs-layers`, `tfjs-backend-webgl` and `tfjs-backend-cpu` in fbfff76 (H3a).
- Evidence (verified): no imports of `d3`; `@tensorflow/tfjs` umbrella pulls unused converter/data packages.
- Fix: remove `d3`, `@types/d3`; depend on `tfjs-core`, `tfjs-layers`, `tfjs-backend-webgl`, `tfjs-backend-cpu` (and webgpu).

## REPO-19 · Low · 21 MB model in plain git; no licence
- **Status:** Fixed in fd27c88 except the repo LICENSE (owner's choice). Git LFS not used (needs the client and GitHub LFS quota); the model is guarded by checksums instead (public/models/README.md).
- Evidence (verified): no LICENSE file; model README names Apache-2.0 but the licence text isn't shipped; fonts come from Google Fonts at build time.
- Fix: track `*.onnx` with Git LFS (or fetch from a pinned release with a checksum in CI); add `public/models/attention-minilm/LICENSE` (Apache-2.0); add a repo LICENSE (owner chooses which); optionally `next/font/local` with the OFL files for offline builds.

## REPO-20 · Low · .gitignore gaps and committed tool state
- **Status:** Fixed in fd27c88.
- Evidence: `docs/.zagrosi-project/session.json` committed; no ignores for `.venv/`, `__pycache__/`, `.vercel/`, `.wrangler/`, `.netlify/`, `*.log`.
- Fix: add them; `git rm --cached` the session file.

## REPO-21 · Low · Docs drift
- **Status:** Fixed in fd27c88.
- Evidence: architecture.md's check-captions sources miss `src/constellation/captions.ts`; "one worker" is untrue with compare and attention; hosting section lacks the size limit, caching and no-isolation behaviour; determinism for links (ENG-09).
- Fix: update those sections and record the chosen host and deploy steps.

## REPO-22 · Low · Duplicated helpers
- **Status:** Partly fixed in fd27c88: `e2e/watch.ts` used by every spec. `src/engine/worker-rpc.ts` touches H2's engine files: left for H2 (with ENG-07).
- Evidence: e2e error collectors copied three times (`engines.spec.ts:7`, `home.spec.ts:6`, `headline.spec.ts:5`); pending-request map and worker start copied in `ModelEngine` and `AttentionReader`.
- Fix: `e2e/watch.ts`; `src/engine/worker-rpc.ts` used by both clients.
