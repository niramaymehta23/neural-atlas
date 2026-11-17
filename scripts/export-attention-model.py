"""Re-creates public/models/attention-minilm-v1 from the published model.

The attention lesson needs every layer's attention, which the stock ONNX exports leave out, so this
exports sentence-transformers/all-MiniLM-L6-v2 (at a pinned revision) with one `attentions` output
(layers x batch x heads x words x words) and quantises it to int8 (MatMul and embeddings, per
channel).

Run by hand with the pinned tools, then refresh the checksums in the folder's README:
    python3.12 -m venv .venv && .venv/bin/pip install -r scripts/requirements-export.txt
    .venv/bin/python scripts/export-attention-model.py [--out some/folder]
If the files change, also bump the folder's version (ATTENTION_MODEL in
src/engine/pretrained/runtime.ts) so browsers that cached the old files fetch the new ones.
"""

import argparse
import hashlib
import pathlib
import tempfile

import torch
from onnxruntime.quantization import QuantType, quantize_dynamic
from transformers import AutoModel, AutoTokenizer

NAME = "sentence-transformers/all-MiniLM-L6-v2"
# The Hugging Face commit the export reads (the model's main branch on 2026-11-17).
REVISION = "1110a243fdf4706b3f48f1d95db1a4f5529b4d41"
DEFAULT_OUT = pathlib.Path(__file__).resolve().parent.parent / "public/models/attention-minilm-v1"
FILES = ["config.json", "onnx/model_quantized.onnx", "tokenizer.json", "tokenizer_config.json"]

parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
parser.add_argument("--out", type=pathlib.Path, default=DEFAULT_OUT)
OUT = parser.parse_args().out


class AttentionOnly(torch.nn.Module):
    def __init__(self, model):
        super().__init__()
        # The attribute name becomes the ONNX node names ("/m/embeddings/..."): keep it, or the
        # export no longer matches the committed file's checksum.
        self.m = model

    def forward(self, input_ids, attention_mask, token_type_ids):
        out = self.m(
            input_ids=input_ids,
            attention_mask=attention_mask,
            token_type_ids=token_type_ids,
            output_attentions=True,
        )
        return torch.stack(out.attentions, 0)


torch.manual_seed(0)
tokenizer = AutoTokenizer.from_pretrained(NAME, revision=REVISION)
model = AutoModel.from_pretrained(NAME, revision=REVISION, attn_implementation="eager").eval()
sample = tokenizer("The dog did not cross the road because it was tired.", return_tensors="pt")
inputs = ["input_ids", "attention_mask", "token_type_ids"]
# Axis names are part of the file: keep them, or the checksum changes.
seq = {0: "batch", 1: "seq"}

(OUT / "onnx").mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory() as scratch:
    full = pathlib.Path(scratch) / "model.onnx"
    torch.onnx.export(
        AttentionOnly(model),
        tuple(sample[name] for name in inputs),
        full,
        input_names=inputs,
        output_names=["attentions"],
        dynamic_axes={**{name: seq for name in inputs}, "attentions": {1: "batch", 3: "seq", 4: "seq"}},
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

# The lines for the README's checksum block (scripts/check-model.ts verifies them in CI).
for name in FILES:
    print(f"{hashlib.sha256((OUT / name).read_bytes()).hexdigest()}  {name}")
