# attention-minilm-v1

Used by the lesson "Who is looking at whom" (`src/engine/pretrained`). The `-v1` in the folder name is
its version: browsers cache `/models/*` for a day and Transformers.js keeps the files in the Cache API,
both by URL, so any change to these files goes in a new folder (`-v2`) named in
`src/engine/pretrained/runtime.ts`.

- Model: [sentence-transformers/all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)
  at revision `1110a243fdf4706b3f48f1d95db1a4f5529b4d41`, 6 layers × 12 heads, 22.7 million parameters,
  uncased WordPiece tokenizer.
- Licence: Apache-2.0, the model card's licence. `LICENSE` is its text and `NOTICE` says what was changed.
- Changes: exported to ONNX with a single `attentions` output (layers × batch × heads × words × words) and
  quantised to int8 per channel (MatMul and embeddings). `onnx/model_quantized.onnx` is 21.4 MB; its attention
  weights differ from the full-precision model by 0.005 on average.
- Rebuild: `scripts/export-attention-model.py` with the exact tools in `scripts/requirements-export.txt`
  (Python 3.12). That reproduces these files byte for byte and prints the lines below.

## Checksums

CI runs `pnpm check-model`, which fails unless every file matches its SHA-256 here.

```text
0514187a557adadc96dff4ec2288b2149395effaf50d70465b80a0b7d6d50662  config.json
0614336f01ee0f7a3f83a36be26ea21f7d9c14195b8ce62f308bd9f7f6d05ff8  onnx/model_quantized.onnx
d241a60d5e8f04cc1b2b3e9ef7a4921b27bf526d9f6050ab90f9267a1f9e5c66  tokenizer.json
872b6936be955bc3aea75ed599264d865626d68feede7e58b01e378e6332bd74  tokenizer_config.json
cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30  LICENSE
```
