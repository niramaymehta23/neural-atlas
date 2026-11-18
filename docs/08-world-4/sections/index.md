<!-- PROJECT_CONFIG
runtime: node 24 + pnpm 12
test_command: pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test && pnpm build && E2E_PORT=4208 pnpm e2e && pnpm format:check
END_PROJECT_CONFIG -->
<!-- SECTION_MANIFEST
section-01-vision-kit
section-02-vision-lessons
section-03-sequence
section-04-faces-models
section-05-generative-lessons
section-06-friends
section-07-smoke-and-handover
END_MANIFEST -->

| Section | Depends on | REQ | Owns | Tests |
|---|---|---|---|---|
| section-01-vision-kit | none | REQ-W4-01 | vision kit | unit |
| section-02-vision-lessons | section-01-vision-kit | REQ-W4-01 | 4 lessons | unit |
| section-03-sequence | none | REQ-W4-02 | 2 lessons | unit |
| section-04-faces-models | none | REQ-W4-03 | weights, kit | unit |
| section-05-generative-lessons | section-04-faces-models | REQ-W4-03 | 5 lessons | unit |
| section-06-friends | none | REQ-W4-04 | 1 lesson | unit |
| section-07-smoke-and-handover | section-06-friends | REQ-W4-01 | smoke | e2e |

Parallel: none.
