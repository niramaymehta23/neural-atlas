# faces-v1

The face models of the World 4 "imagining" lessons, read by `src/engine/generative/faces.ts`. They were
trained here, on cartoon faces that `scripts/train-faces.py` draws itself from a seed, so no outside
picture or model went into them; they are under the repository's MIT licence (`LICENSE`). The `-v1` is
the version: any change goes in a new folder named in `src/engine/generative/faces.ts`.

| File | Size | What it is | Lesson |
|---|---|---|---|
| `squeeze.bin` | 3.2 MB | an autoencoder whose 16 numbers are ordered (nested dropout), so the first k are the best squeeze to k | Squeeze and rebuild |
| `map-0.bin`, `map-1.bin`, `map-2.bin` | 2.4 MB each | decoders from a two-number map: a plain autoencoder, then VAEs that keep the map tidier (0.1 and 1 times the tidying) | Smooth imagination |
| `fog.bin` | 9.0 MB | a denoiser that guesses the clear picture under 200 steps of fog | Painting from fog |
| `faces.bin` | 1.0 MB | 1,000 faces the models never practised on, 32 × 32 bytes each (0 paper, 255 ink) | all three |
| `manifest.json` | 36 kB | where each layer's numbers sit in its file, the map spots of 600 real faces, the fog schedule | all three |

Numbers are float32, little-endian; a layer's weights are stored inputs × outputs, row by row.

Rebuild: `python3.12 -m venv .venv && .venv/bin/pip install -r scripts/requirements-train.txt`, then
`.venv/bin/python scripts/train-faces.py` (about two minutes on a laptop CPU, four threads). That
reproduces these files byte for byte on the machine they were made on (macOS arm64); another CPU may
round the last digits differently.

## Checksums

CI runs `pnpm check-model`, which fails unless every file matches its SHA-256 here.

```text
4c8477368c31ef3e78b67b5b17b2b06f5754fd0dbe7c20fccb743779c37a0c64  faces.bin
875dd4e0ad8c3dd282cede40640b76eb81cc5c7edb550bf466665a49023b3aff  fog.bin
2195396df54548576c148c8d34a21a075ebdaa60b27b4c8af19d95d7d3a2e620  map-0.bin
da86b6b2905b8b34a4595b317cdb6fe841f838d041a888b768393160f5209a40  map-1.bin
a1992adf3af5c2996bc3d6cd345666d926b37752a6d097aceccca07c8dda6bb9  map-2.bin
bca97a2655f93e7930be615880921045a7622ed49efc6e90c3df5f5ffa0270d6  squeeze.bin
22ae4d71bea7e347ae9e156e43d02c5bb29c49ada563f979c610573f8c9e5596  manifest.json
65f35cc133e0fd6339aa332bafa9382743caca27578013bd0d3e76f03e4c1e9d  LICENSE
```
