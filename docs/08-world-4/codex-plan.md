<!-- FORGE_META
{"artifact_type": "compact_plan", "depth_mode": "lean", "source": "spec.md"}
END_FORGE_META -->
# Stage 08 World 4 (Seeing, remembering and imagining): shared plan

Spec of record: `docs/requirements.md` (World 4, feature tables); `docs/architecture.md`; `docs/hardening/`.

## Contract

### REQ-W4-01
Source: spec.md#L17-L17
Behavior: four vision lessons (the-pattern-torch, how-machines-see, zooming-out, standing-on-giants) meet the DoD.
A pretrained MobileNet v1 (0.25, 224) runs in its own worker (`engine/vision/`), reads the webcam or a sample photo,
and returns feature maps and answers. Sample photos work whenever the camera is denied, missing or declined; the
camera is never needed to finish a lesson. The camera ask says, in plain words, that the picture never leaves the
device. Finishing the pattern torch's mission gives the companion model convolution.
Expected: webcam maps update at 15 fps or more on the reference machine (judged by the `e2e/frames.ts` profiles or a
same-machine baseline, never a fixed CI time); a fake-camera run and a camera-denied run both finish a mission.
Command: pnpm vitest run src/engine/vision src/modules/w4-deep-architectures && pnpm build && E2E_PORT=4208 pnpm e2e e2e/world-4.spec.ts

### REQ-W4-02
Source: spec.md#L18-L18
Behavior: reading-one-word-at-a-time (RNN) and choosing-what-to-remember (LSTM) meet the DoD, trained live as
recorded runs by a pure seeded sequence engine (`engine/sequence/`) checked against finite differences.
Expected: gradient, forgetting, gate-locking and lesson unit tests.
Command: pnpm vitest run src/engine/sequence src/modules/w4-deep-architectures

### REQ-W4-03
Source: spec.md#L19-L19
Behavior: meaning-as-places (embeddings, trained live), squeeze-and-rebuild (autoencoder), smooth-imagination (VAE),
forger-vs-detective (GAN, trained live on a plane) and painting-from-fog (diffusion) meet the DoD. Offline-trained
weights live in `public/models/faces-v1/` (own synthetic face set, MIT), each file under 24 MiB, with README
checksums and `scripts/train-faces.py` to rebuild them. Shared parts used by two lessons go in `features/generative/`.
Expected: every model file under 24 MiB (`check-build`), checksums pass (`check-model`), unit tests for every lesson.
Command: pnpm check-model && pnpm vitest run src/features/generative src/modules/w4-deep-architectures

### REQ-W4-04
Source: spec.md#L20-L20
Behavior: learning-from-friends (message passing on a friendship network) meets the DoD; passing messages too many
times makes everyone identical (the mission).
Expected: lesson unit tests; it is in the world smoke spec.
Command: pnpm vitest run src/modules/w4-deep-architectures

## Owned files
Per section in [sections/index.md](sections/index.md).

## Decisions
- Weights: MobileNet v1 0.25/224 from the TensorFlow.js model store (Apache-2.0, `tensorflow/tfjs-models`), rebuilt
  into one weights file by `scripts/export-vision-model.ts` (pinned URLs and SHA-256). Generative weights are trained
  briefly on CPU from a synthetic cartoon-face set drawn by the script itself, so there is no dataset licence to
  inherit; everything there is the repository's MIT licence.
- Small generative decoders run as plain typed-array maths on the main thread;
  only MobileNet uses TF.js, in a worker, so a slow shader compile never freezes the page.
- Sample photos are public-domain or CC0 photos from Wikimedia Commons, each source, author and licence recorded in
  its folder README with checksums.
- Live-trained lessons (embeddings, GAN, RNN, LSTM) use `useRecordedRun` like World 3: a pure seeded run from state,
  so links replay exactly.
- Webcam snaps are never put in a link; a link carries sample-photo choices only and says so.
- Locked-lesson examples in older tests move from World 4 to unbuilt World 5 lessons.

## Risks
- Webcam inference speed on CI's software WebGL: judged with the perf profiles; the functional test only needs a map.
- MobileNet loading fails (offline, blocked): each vision lesson keeps its non-model part working and says plainly
  that the picture reader could not load, with Try again.
- Diffusion mush and VAE gaps are judged by distance to the nearest real face; thresholds are set from measured
  separations in unit tests, not tuned to pass.

## Evidence
Read: architecture.md (all hand-overs), hardening README and lessons.md, decision-curve and stacking-cells lessons,
attention reader (`engine/pretrained`), `platform/contract.ts`, companion store, `check-model.ts`, `check-build.ts`,
`e2e/world-smoke.ts`, `e2e/frames.ts`, `a11y.spec.ts`.

Rollback: new files except `src/catalog/world-4.ts` (adds `load`), test files that used World 4 as locked examples,
one docs section and additive shared changes listed in the hand-over.

## Review
Verdict: pass
Reviewed: contract coverage of the four REQs, ownership, DoD and hardening items per lesson; findings in reviews/plan-review.md applied.
