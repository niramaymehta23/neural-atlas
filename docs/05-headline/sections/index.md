<!-- PROJECT_CONFIG
runtime: node 24 + pnpm 12 (Next.js 16, TypeScript 6)
test_command: pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm e2e && pnpm format:check
END_PROJECT_CONFIG -->
<!-- SECTION_MANIFEST
section-01-engines
section-02-attention-engine
section-03-trained-lessons
section-04-reading-and-playing
section-05-wiring
END_MANIFEST -->

| Section | Depends on | REQ |
|---|---|---|
| section-01-engines | none | REQ-HDL-02, REQ-HDL-04 |
| section-02-attention-engine | none | REQ-HDL-03 |
| section-03-trained-lessons | section-01-engines | REQ-HDL-01, REQ-HDL-02 |
| section-04-reading-and-playing | section-01-engines, section-02-attention-engine | REQ-HDL-03, REQ-HDL-04 |
| section-05-wiring | section-03-trained-lessons, section-04-reading-and-playing | REQ-HDL-01 |

Execution order: manifest order.
Parallel: none (single writer).
