"""Re-creates public/models/attention-minilm from the published model.

The attention lesson needs every layer's attention, which the stock ONNX exports leave out, so this
exports sentence-transformers/all-MiniLM-L6-v2 with one `attentions` output (layers x batch x heads
x words x words) and quantises it to int8 (MatMul and embeddings, per channel).

Run once by hand, in a virtual environment with torch, transformers, onnx, onnxscript and
onnxruntime: python scripts/export-attention-model.py
"""

import pathlib
import tempfile

import torch
from onnxruntime.quantization import QuantType, quantize_dynamic
from transformers import AutoModel, AutoTokenizer

NAME = "sentence-transformers/all-MiniLM-L6-v2"
OUT = pathlib.Path(__file__).resolve().parent.parent / "public/models/attention-minilm"


class AttentionOnly(torch.nn.Module):
    def __init__(self, model):
        super().__init__()
        self.model = model

    def forward(self, input_ids, attention_mask, token_type_ids):
        out = self.model(
            input_ids=input_ids,
            attention_mask=attention_mask,
            token_type_ids=token_type_ids,
            output_attentions=True,
        )
        return torch.stack(out.attentions, 0)


tokenizer = AutoTokenizer.from_pretrained(NAME)
model = AutoModel.from_pretrained(NAME, attn_implementation="eager").eval()
sample = tokenizer("The dog did not cross the road because it was tired.", return_tensors="pt")
inputs = ["input_ids", "attention_mask", "token_type_ids"]
words = {0: "batch", 1: "words"}

(OUT / "onnx").mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory() as scratch:
    full = pathlib.Path(scratch) / "model.onnx"
    torch.onnx.export(
        AttentionOnly(model),
        tuple(sample[name] for name in inputs),
        full,
        input_names=inputs,
        output_names=["attentions"],
        dynamic_axes={**{name: words for name in inputs}, "attentions": {1: "batch", 3: "words", 4: "words"}},
        opset_version=17,
        dynamo=False,
    )
    quantize_dynamic(
        full,
        OUT / "onnx/model_quantized.onnx",
        weight_type=QuantType.QInt8,
        per_channel=True,
        op_types_to_quantize=["MatMul", "Gather"],
    )
tokenizer.save_pretrained(OUT)
model.config.save_pretrained(OUT)
