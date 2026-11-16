<!-- PROJECT_CONFIG
runtime: node 24 + pnpm 12 (Next.js 16, TypeScript 6)
test_command: pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm e2e
END_PROJECT_CONFIG -->
<!-- SECTION_MANIFEST
section-01-scaffold
section-02-design
section-03-ui
section-04-styleguide
section-05-captions
END_MANIFEST -->

| Section | Depends on | REQ | Owns | Tests |
|---|---|---|---|---|
| section-01-scaffold | none | REQ-FND-01, REQ-FND-02 | config, lint | pnpm test src/lint.test.ts |
| section-02-design | section-01-scaffold | REQ-FND-02 | src/design/ | pnpm test src/design |
| section-03-ui | section-02-design | REQ-FND-03 | src/ui/ | pnpm test src/ui |
| section-04-styleguide | section-03-ui | REQ-FND-01, REQ-FND-04 | app, e2e | pnpm build && pnpm e2e |
| section-05-captions | section-01-scaffold | REQ-FND-05 | scripts | pnpm test scripts |

Execution order: manifest order.
Parallel: none (single writer).
