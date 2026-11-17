# Section 04: face models and generative kit

## Contract
### REQ-W4-03
Source: spec.md#L19-L19
Behavior: `scripts/train-faces.py` (pinned in `scripts/requirements-train.txt`) draws a seeded cartoon-face set and trains an ordered autoencoder, 2-D map decoders at several tidiness levels and a small denoiser, writing `public/models/faces-v1/` (weights, a few real faces, manifest, README with checksums, LICENSE). `features/generative/` reads them (typed-array forward passes), draws a grey picture and measures how far a picture is from the nearest real face.
Expected: each file under 24 MiB; Node tests load the real files and rebuild a face closely with the widest squeeze.
Command: pnpm check-model && pnpm vitest run src/features/generative

## Owned files
- scripts/train-faces.py
- scripts/requirements-train.txt
- public/models/faces-v1/
- src/features/generative/

## Compatibility
```json
{"version": 1, "mode": "not_required", "reason": "New files only."}
```

## Evidence
`check-build.ts` already fails any file over 24 MiB; `check-model.ts` reads README checksums.

Rollback: delete the new folders.

## Review
Verdict: pass
Reviewed: no third-party data or weights in this folder.
