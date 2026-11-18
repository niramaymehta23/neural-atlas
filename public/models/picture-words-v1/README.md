# picture-words-v1

The shared map of "Pictures and words together", read by `src/engine/language/picture-words.ts`: a
small CLIP-style matcher in which a photo and a caption land near each other when they mean the same
thing. Built here by `scripts/build-picture-words.ts`; under the repository's MIT licence (`LICENSE`).

- Pictures: MobileNet v1's 256 deep numbers (`../mobilenet-v1-025-v1`, Apache-2.0) for each of the 29
  photos in `../photos-v1` (CC0 and public domain), mapped to 32 numbers. Only the finished places are
  stored, so the lesson needs no picture model.
- Words: a caption is the average GloVe place of its words (`../glove-words-v1`, PDDL), times the
  50 × 32 `wordMap` stored here.
- The two maps were fitted together (400 steps of Adam, contrastive, on 30 practice captions such as
  "a sleepy cat" and "a pot for making tea"), so each photo lands nearest the captions of its own kind.

`matcher.json` holds `size` (32), `wordMap` (50 × 32, row by row) and, for each photo, its file, kind
and place (unit length). Numbers are rounded to five decimals.

Measured (checked by `picture-words.test.ts`): each lesson caption scores highest on its own photo;
captions it never practised on can fool it, such as "a car", which scores about 0.78 on the bicycle.

Rebuild: `.venv/bin/python scripts/photo-pixels.py <folder>` (with `scripts/requirements-train.txt`),
then `pnpm tsx scripts/build-picture-words.ts <folder>`. Seeded, on TensorFlow.js's CPU backend: the
same file every run on the machine it was made on (macOS arm64).

## Checksums

CI runs `pnpm check-model`, which fails unless every file matches its SHA-256 here.

```text
31e4faf1325513b4e442a4e6e5ca747a28b49369f1f0892f7bbf1dcf5ca5dc78  matcher.json
```
