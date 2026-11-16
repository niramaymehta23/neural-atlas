# Project Manifest

<!-- SPLIT_MANIFEST
01-foundation
02-engines
03-platform
04-constellation
05-headline
06-autodiff-worlds
07-world-2
08-world-4
09-world-5
10-world-6
11-experiences
12-polish
END_MANIFEST -->

| Split | REQ | Depends on | Owns/boundary | Next command |
|---|---|---|---|---|
| 01-foundation | REQ-FND-01..05 | none | scaffold, design, ui | `/zagrosi-forge:zagrosi-plan @docs/01-foundation/spec.md` |
| 02-engines | REQ-ENG-01..05 | 01 | engine, scene, data | `/zagrosi-forge:zagrosi-plan @docs/02-engines/spec.md` |
| 03-platform | REQ-PLT-01..08 | 02 | platform, catalog | `/zagrosi-forge:zagrosi-plan @docs/03-platform/spec.md` |
| 04-constellation | REQ-CON-01..04 | 03 | home | `/zagrosi-forge:zagrosi-plan @docs/04-constellation/spec.md` |
| 05-headline | REQ-HDL-01..04 | 03 | headline modules | `/zagrosi-forge:zagrosi-plan @docs/05-headline/spec.md` |
| 06-autodiff-worlds | REQ-W13-01..03 | 05 | worlds 1, 3 | `/zagrosi-forge:zagrosi-plan @docs/06-autodiff-worlds/spec.md` |
| 07-world-2 | REQ-W2-01..02 | 05 | world 2 | `/zagrosi-forge:zagrosi-plan @docs/07-world-2/spec.md` |
| 08-world-4 | REQ-W4-01..04 | 06 | world 4 | `/zagrosi-forge:zagrosi-plan @docs/08-world-4/spec.md` |
| 09-world-5 | REQ-W5-01..04 | 08 | world 5 | `/zagrosi-forge:zagrosi-plan @docs/09-world-5/spec.md` |
| 10-world-6 | REQ-W6-01..03 | 09 | world 6 | `/zagrosi-forge:zagrosi-plan @docs/10-world-6/spec.md` |
| 11-experiences | REQ-EXP-01..06 | 04, 07, 10 | experiences | `/zagrosi-forge:zagrosi-plan @docs/11-experiences/spec.md` |
| 12-polish | REQ-PA-01..03 | 11 | phone, a11y | `/zagrosi-forge:zagrosi-plan @docs/12-polish/spec.md` |

Execution order: 01 → 02 → 03 → 04/05 → 06/07 → 08 → 09 → 10 → 11 → 12.
Parallel groups: 04∥05, 06∥07.
Shared sequencing: 03 seeds catalog; others edit their world file.
