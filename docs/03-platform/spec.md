# 03 — Module platform

Source: requirements.md (Interaction system, Architecture, prompts 4 and 8); docs/architecture.md.
Owned: REQ-PLT-01..08.

```text
Dependencies: 02
Boundary: platform, catalog
```

## Scope and non-goals

`platform/`, `catalog/`, `app/learn/[moduleId]`, `/puzzle`. No real modules, no home map.

## Acceptance criteria

- **REQ-PLT-01 Contract and catalog:** `defineModule`; 74 lessons with everyday title, real term and everyday idea; acyclic prerequisites; unbuilt lessons show a locked page.
- **REQ-PLT-02 ModuleShell:** story opening, dial dock beside the scene, caption, term tag at the end, mission card, timeline, closed under-the-hood drawer, compare slot; stacked cards below 768 px.
- **REQ-PLT-03 Missions:** predicate fires once; replay covers its window; star awarded.
- **REQ-PLT-04 Predictions:** guess stored before reveal, shown with the result.
- **REQ-PLT-05 Progress:** IndexedDB; mastery = visit + mission + prediction; next-suggested rule.
- **REQ-PLT-06 Snapshots:** versioned compressed URL restores the exact view.
- **REQ-PLT-07 Companion model:** changes survive navigation and reload.
- **REQ-PLT-08 Daily puzzle:** same date gives the same puzzle everywhere.

## Testing

Unit tests on catalog graph, suggestion rule, snapshot round-trip and puzzle seed; `check-captions` also covers learner-facing strings in `src/ui/` and the catalog.

## Risks

Snapshot format carries a version field from day one.
