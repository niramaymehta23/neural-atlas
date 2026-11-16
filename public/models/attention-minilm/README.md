# attention-minilm

Used by the lesson "Who is looking at whom" (`src/engine/pretrained`).

- Model: [sentence-transformers/all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2),
  6 layers × 12 heads, 22.7 million parameters, uncased WordPiece tokenizer.
- Licence: Apache-2.0 (the model card's licence; this folder is a converted copy).
- Changes: exported to ONNX with a single `attentions` output (layers × batch × heads × words × words) and
  quantised to int8 per channel (MatMul and embeddings). `onnx/model_quantized.onnx` is 21.4 MB; its attention
  weights differ from the full-precision model by 0.005 on average.
- Rebuild: `scripts/export-attention-model.py`.
