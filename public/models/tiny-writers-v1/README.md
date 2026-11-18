# tiny-writers-v1

World 5's two tiny writers, read by `src/engine/language/writers.ts` and run by
`src/engine/language/tiny-gpt.ts`. Both were trained here on a practice text that
`scripts/train-writers.py` writes itself from a seed (a small made-up world of animal facts, short
stories, pets with names and the books the facts came from), so no outside text or model went into
them; they are under the repository's MIT licence (`LICENSE`). Any change goes in a new `-v2` folder
named in `writers.ts`.

| File | Size | What it is | Lessons |
|---|---|---|---|
| `storyteller.bin` | 473 kB | a word-level tiny GPT: 117 words, reads 48 at once, 64 numbers wide, 4 readers, 2 blocks | Guess the next word, Safe vs adventurous, Short-term memory, Confident but wrong |
| `writer.bin` | 270 kB | a letter-level tiny GPT: 96 letters, reads 32 at once, 48 wide, 4 readers, 2 blocks | Specialising (retrained in the browser on pirate talk) |
| `manifest.json` | 10 kB | shapes, the words and letters, the animal facts and book titles, an everyday sample text and a fixture of each model's scores | all of them |

Numbers are float32, little-endian, in `tiny-gpt.ts`'s tensor order; weights are stored inputs ×
outputs, row by row. `writers.test.ts` checks the TypeScript maths against the fixtures PyTorch wrote.

Measured facts the lessons rest on (checked by tests): after "the cat sat on the" it gives "mat" about
93 in 100; it recalls a pet's name while the name is inside what it reads, and falls back to an even
guess among names once the name is out of view; asked the colour of the hen (never in its practice
text) it still answers "brown", about 92 in 100 sure; asked where it read that, it names a book that
says nothing of the kind.

Rebuild: `python3.12 -m venv .venv && .venv/bin/pip install -r scripts/requirements-train.txt`, then
`.venv/bin/python scripts/train-writers.py` (about a minute on a laptop CPU, four threads). That
reproduces these files byte for byte on the machine they were made on (macOS arm64); another CPU may
round the last digits differently.

## Checksums

CI runs `pnpm check-model`, which fails unless every file matches its SHA-256 here.

```text
a25e834ab6e78114f2f401358937084b915424c18aa86f11f5d80fcada3a787a  storyteller.bin
c15f463e63778ff20829346108ae37111d951771583f6ba2d65de8ae3b3da034  writer.bin
2e10de2f8bdc09b03b57a852453c1fb68ea5fcc5c4bf54ab6a5a9c196da92c09  manifest.json
```
