# section-03-ui

## Contract
Implements REQ-FND-03 from [codex-plan.md](../codex-plan.md#contract): Twelve primitives plus `illustrations/` (robot learner).
Behavior: Twelve primitives plus `illustrations/` (robot learner).
Expected: src/ui/*.test.tsx: each primitive operated by keyboard shows the expected result; reduced motion skips animation.
Command: pnpm test src/ui

## Owned files
- src/ui/PaperCard.tsx
- src/ui/Dial.tsx
- src/ui/Slider.tsx
- src/ui/CommandPalette.tsx
- src/ui/CompareSplit.tsx
- src/ui/illustrations/Robot.tsx

Other primitives (Toggle, SegmentedControl, HoverNote, StoryCaption, TermTag, MissionCard, UnderTheHoodDrawer) and their tests sit beside these in `src/ui/`.

## Compatibility
```json
{"version": 1, "mode": "not_required", "reason": "Greenfield: main holds only docs/, so there is no existing executable behaviour to preserve."}
```

## Review
Verdict: pass
Reviewed: scope against the shared contract; ownership disjoint from other sections.
