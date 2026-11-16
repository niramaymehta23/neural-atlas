# section-03-kits

## Contract
Implements REQ-ENG-04, REQ-ENG-05 and the UI half of REQ-ENG-03 from [codex-plan.md](../codex-plan.md#contract).
Behavior: additive encodings, design/paint.ts, visuals 2D kit, scene3d trio, data kit, ui/TimelineScrubber.
Expected: existing src/design/encodings.test.ts unchanged and passing plus new cases; component tests per kit file; src/data/paint-field.test.ts paints 128² under 16 ms.
Command: pnpm test && pnpm lint

## Owned files
- src/design/encodings.ts
- src/design/encodings.test.ts
- src/design/paint.ts
- src/visuals/
- src/scene3d/
- src/data/
- src/ui/TimelineScrubber.tsx
- src/ui/TimelineScrubber.test.tsx

## Compatibility
```json
{"version": 1, "mode": "required", "source_paths": ["src/design/encodings.ts"], "check_paths": ["src/design/encodings.test.ts"], "check_provenance": {"source": "existing", "author": "Repository maintainers"}}
```

## Review
Verdict: pass
Reviewed: encodings extended without changing thickness/warmth/speed; no colour literals outside design; ui imports design only.
