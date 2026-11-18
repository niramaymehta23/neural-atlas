# Section 01: vision kit

## Contract
### REQ-W4-01
Source: spec.md#L17-L17
Behavior: `scripts/export-vision-model.ts` fetches MobileNet v1 0.25/224 at pinned URLs, checks each download's SHA-256 and writes `public/models/mobilenet-v1-025-v1/` (one `model.json`, one weights file, LICENSE, NOTICE, README with checksums); `public/models/photos-v1/` holds sample photos with sources. `engine/vision/` runs the model in a worker (feature maps of chosen layers, top answers, the features before the answer, a nudge that fools it) with load and read time-outs; `features/inside/` gains the camera hook and picture picker shared by the camera lessons.
Expected: Node tests run the real model on a sample photo and get its expected answer; the camera hook reports denied, missing and declined as plain states.
Command: pnpm vitest run src/engine/vision src/features/inside && pnpm check-model

## Owned files
- scripts/export-vision-model.ts
- public/models/mobilenet-v1-025-v1/
- public/models/photos-v1/
- src/engine/vision/
- src/features/inside/

## Compatibility
```json
{"version": 1, "mode": "not_required", "reason": "New files only; features/inside gains files, existing ones are untouched."}
```

## Evidence
`engine/pretrained/attention-reader.ts` is the worker-client pattern (lazy, retain/release, time-outs, restart).

Rollback: delete the new folders.

## Review
Verdict: pass
Reviewed: no request leaves the site; the camera stream stops on unmount and when hidden.
