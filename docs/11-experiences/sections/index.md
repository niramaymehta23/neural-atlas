<!-- PROJECT_CONFIG
runtime: node 24 + pnpm 12
test_command: pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test && pnpm build && E2E_PORT=4310 pnpm e2e && pnpm format:check
END_PROJECT_CONFIG -->
<!-- SECTION_MANIFEST
section-01-foundation
section-02-sandbox
section-03-journeys-museum
section-04-theatre
section-05-two-player
section-06-extras
END_MANIFEST -->

| Section | Depends on | REQ | Owns | Tests |
|---|---|---|---|---|
| section-01-foundation | none | REQ-EXP-06 | star layout, navigation, tally, experience shell | unit, e2e |
| section-02-sandbox | section-01-foundation | REQ-EXP-01 | engine/lab, sandbox | unit, e2e |
| section-03-journeys-museum | section-02-sandbox | REQ-EXP-02 | journeys, museum | unit, e2e |
| section-04-theatre | section-01-foundation | REQ-EXP-03 | theatre | unit, e2e heap |
| section-05-two-player | section-02-sandbox | REQ-EXP-04 | two-player | unit, e2e |
| section-06-extras | section-05-two-player | REQ-EXP-05 | sound, glossary, meter, achievements | unit, e2e |

Execution order: 01 to 06. Parallel: none (one writer).
