# mobilenet-v1-025-v1

Used by the World 4 picture lessons ("How machines see", "Zooming out", "Standing on giants") through
`src/engine/vision`. The `-v1` is its version: browsers cache `/models/*` for a day, so any change to
these files goes in a new folder named in `src/engine/vision/runtime.ts`.

- Model: MobileNet v1, width 0.25, for 224 × 224 colour pictures, 470 thousand numbers, from the
  TensorFlow.js model store (`mobilenet_v1_0.25_224`). It knows 1,000 everyday things (ImageNet).
- Licence: Apache-2.0 (tensorflow/tfjs-models). `LICENSE` is its text and `NOTICE` says what changed.
- Changes: the 55 weight files joined into `weights.bin` (1.9 MB), `model.json` pointed at it;
  `things.json` is the first name of each thing.
- Rebuild: `pnpm tsx scripts/export-vision-model.ts` downloads the pinned files, checks their SHA-256
  and writes these files byte for byte.

## Checksums

CI runs `pnpm check-model`, which fails unless every file matches its SHA-256 here.

```text
eec136af0a3659d2cc82f26324938487d27adcf56efed40a5129138f6f4bdebe  model.json
eb49857447f6089e7e392f7991f3f4fdce1936efaf83d535f5eb8aaba9538e0b  weights.bin
08895f631dfd52748d999a074e40b5270d9beebdcf72a5071c3c6e0b05d7b403  things.json
58d1e17ffe5109a7ae296caafcadfdbe6a7d176f0bc4ab01e12a689b0499d8bd  LICENSE
```
