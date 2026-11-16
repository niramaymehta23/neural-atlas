# Section 04: reading and playing lessons

## Contract
### REQ-HDL-03
Behavior: who-is-looking-at-whom module; each reading is recorded as a frame for missions and predictions.
Expected: thread layout and predicate tests pass.
Command: pnpm test src/modules/w5-transformers

### REQ-HDL-04
Behavior: scoring-every-move module; Board gains optional painting, per-tile overlay and tint; encodings gain
the coin tile and `valueTone`.
Expected: Board.test.tsx passes plus a painting case; mission predicate tests pass.
Command: pnpm test src/visuals src/design src/modules/w6-reinforcement

## Owned files
- src/modules/w5-transformers/who-is-looking-at-whom/
- src/modules/w6-reinforcement/scoring-every-move/
- src/visuals/Board.tsx
- src/visuals/Board.test.tsx
- src/design/encodings.ts

## Compatibility
```json
{"version": 1, "mode": "required", "source_paths": ["src/visuals/Board.tsx", "src/design/encodings.ts"], "check_paths": ["src/visuals/Board.test.tsx", "src/design/encodings.test.ts", "src/design/encodings-kit.test.ts"], "check_provenance": {"source": "existing", "author": "Repository maintainers"}}
```

## Evidence
See the shared plan.

## Review
Verdict: pass
Reviewed: Board and encodings changes are additive.
