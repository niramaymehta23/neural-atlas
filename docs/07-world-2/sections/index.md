<!-- PROJECT_CONFIG
runtime: node 24 + pnpm 12
test_command: pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test && pnpm build && E2E_PORT=4207 pnpm e2e && pnpm format:check
END_PROJECT_CONFIG -->
<!-- SECTION_MANIFEST
section-01-ml-engine
section-02-classic-kit
section-03-garden-lessons
section-04-other-lessons
section-05-map-of-everything
section-06-smoke-and-handover
END_MANIFEST -->

| Section | Depends on | REQ | Owns | Tests |
|---|---|---|---|---|
| section-01-ml-engine | none | REQ-W2-01 | engine | unit |
| section-02-classic-kit | section-01-ml-engine | REQ-W2-02 | kit | unit |
| section-03-garden-lessons | section-02-classic-kit | REQ-W2-02 | 5 lessons | unit |
| section-04-other-lessons | section-02-classic-kit | REQ-W2-02 | 4 lessons | unit |
| section-05-map-of-everything | section-01-ml-engine | REQ-W2-01 | t-SNE | unit |
| section-06-smoke-and-handover | section-05-map-of-everything | REQ-W2-02 | smoke | e2e |

Execution order: manifest order.
Parallel: none.
