<!-- PROJECT_CONFIG
runtime: node 24 + pnpm 12
test_command: pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test && pnpm build && E2E_PORT=4209 pnpm e2e && pnpm format:check
END_PROJECT_CONFIG -->
<!-- SECTION_MANIFEST
section-01-pieces-and-places
section-02-the-writer
section-03-baby-gpt
section-04-helpers-and-smoke
END_MANIFEST -->

| Section | Depends on | REQ | Owns | Tests |
|---|---|---|---|---|
| section-01-pieces-and-places | none | REQ-W5-01 | 4 lessons, language files | unit |
| section-02-the-writer | section-01-pieces-and-places | REQ-W5-02 | 5 lessons, storyteller | unit, e2e |
| section-03-baby-gpt | section-02-the-writer | REQ-W5-03 | 3 lessons, worker | unit, perf e2e |
| section-04-helpers-and-smoke | section-03-baby-gpt | REQ-W5-04 | 4 lessons, smoke, hand-over | unit, e2e |

Execution order: 01, 02, 03, 04. Parallel: none (one writer; shared `src/engine/language`).
