<!-- PROJECT_CONFIG
runtime: node 24 + pnpm 12 (Next.js 16, TypeScript 6)
test_command: pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm e2e && pnpm format:check
END_PROJECT_CONFIG -->
<!-- SECTION_MANIFEST
section-01-catalog
section-02-systems
section-03-shell
END_MANIFEST -->

| Section | Depends on | REQ | Owns | Tests |
|---|---|---|---|---|
| section-01-catalog | none | REQ-PLT-01 | platform/contract.ts, catalog, ui captions, check-captions | pnpm test src/catalog scripts src/ui |
| section-02-systems | section-01-catalog | REQ-PLT-03..08 | platform store, missions, progress, snapshot, companion, puzzle | pnpm test src/platform |
| section-03-shell | section-02-systems | REQ-PLT-01..08 | ModuleShell, routes, palette, styleguide/platform, e2e, docs | pnpm build && pnpm e2e |

Execution order: manifest order.
Parallel: none (single writer).
