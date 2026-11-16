# section-02-systems

## Contract
Implements REQ-PLT-03, REQ-PLT-04, REQ-PLT-05, REQ-PLT-06, REQ-PLT-07 and REQ-PLT-08 logic from [codex-plan.md](../codex-plan.md#contract).
Behavior: createModuleStore (state, touched, guesses; update, guess, reveal, restore), mission watcher and replay, IndexedDB key-value storage and persisted stores, progress with mastery and nextSuggested, snapshot encode/decode, companion store, pickDaily.
Expected: module-store, missions, progress, snapshot, companion and puzzle tests pass.
Command: pnpm test src/platform

## Owned files
- src/platform/module-store.ts
- src/platform/missions/
- src/platform/storage.ts
- src/platform/progress/
- src/platform/snapshot/
- src/platform/companion/
- src/platform/puzzle/

## Compatibility
```json
{"version": 1, "mode": "not_required", "reason": "New files under src/platform; nothing calls them yet."}
```

## Review
Verdict: pass
Reviewed: state stays plain serialisable data; persisted writes wait for hydration; decoding rejects unknown versions.
