<!-- PROJECT_CONFIG
runtime: node 24 + pnpm 12 (Next.js 16, TypeScript 6)
test_command: pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm e2e && pnpm format:check
END_PROJECT_CONFIG -->
<!-- SECTION_MANIFEST
section-01-autodiff
section-02-model
section-03-kits
section-04-lab
END_MANIFEST -->

| Section | Depends on | REQ | Owns | Tests |
|---|---|---|---|---|
| section-01-autodiff | none | REQ-ENG-01, REQ-ENG-03 | src/engine/{random,autodiff,timeline} | pnpm test src/engine |
| section-02-model | section-01-autodiff | REQ-ENG-02 | src/engine/model, next.config.ts, scripts | pnpm test src/engine/model |
| section-03-kits | section-01-autodiff | REQ-ENG-03, REQ-ENG-04, REQ-ENG-05 | src/design additions, visuals, scene3d, data, ui/TimelineScrubber | pnpm test |
| section-04-lab | section-02-model, section-03-kits | REQ-ENG-02..05 | src/app/styleguide/engines, e2e/engines.spec.ts, docs | pnpm build && pnpm e2e |

Execution order: manifest order.
Parallel: none (single writer).
