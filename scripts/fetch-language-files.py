"""
Fetches the two outside language files World 5 uses and writes them into public/models/:

  gpt2-pieces-v1/   GPT-2's byte-pair vocabulary and merges ("Chopping text into pieces"), as published
                    by OpenAI (Modified MIT licence), unchanged
  glove-words-v1/   GloVe 6B 50-dimensional word vectors (Public Domain Dedication and License), cut to
                    the most frequent plain words and stored as int8 with one scale per word

  python3.12 -m venv .venv && .venv/bin/pip install -r scripts/requirements-train.txt
  .venv/bin/python scripts/fetch-language-files.py

Every download is checked against a pinned SHA-256 before it is used, and the output is the same
byte for byte on every run.
"""

import hashlib
import io
import json
import pickle
import re
import urllib.request
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
MODELS = ROOT / "public" / "models"
CACHE = Path.home() / ".cache" / "neural-atlas-language"

GPT2 = "https://huggingface.co/openai-community/gpt2/resolve/607a30d783dfa663caf39e06633721c8d4cfcd7e/"
GLOVE = (
    "https://huggingface.co/fse/glove-wiki-gigaword-50/resolve/"
    "6d69f9a584e4268937f8b8e9ae5810fbb22c0cc9/"
)
FILES = {
    "vocab.json": (GPT2 + "vocab.json", "196139668be63f3b5d6574427317ae82f612a97c5d1cdaf36ed2256dbf636783"),
    "merges.txt": (GPT2 + "merges.txt", "1ce1664773c50f3e0cc8842619a93edc4624525b728b188a9e0be33b7726adc5"),
    "glove.model": (
        GLOVE + "glove-wiki-gigaword-50.model",
        "d64693ba82109842fe8c9b1078970fae99de992e374d1ee9eba141b121e605a6",
    ),
    "glove.npy": (
        GLOVE + "glove-wiki-gigaword-50.model.vectors.npy",
        "5cee3016e3af5c1a3675d6b1f6d467b0fc7a0ba3dccf745aded1984ccce3ad74",
    ),
}

# How many of GloVe's most frequent plain words to keep, plus words the lessons need that may be rarer.
KEEP = 6000
NEEDED = """
king queen man woman prince princess boy girl father mother son daughter uncle aunt husband wife
brother sister actor actress waiter waitress hero heroine emperor empress lion lioness
paris france london england rome italy berlin germany tokyo japan madrid spain
puppy kitten cat dog cow calf horse foal sheep lamb pig piglet duck duckling
big bigger small smaller fast faster slow slower good better bad worse
walk walked swim swam run ran eat ate fly flew
banana bananas bicycle bike teapot tea cup flower flowers dog dogs cat cats fruit pet pets petals kettle
pool library bakery bread swim swimming opens closes hours museum dinosaur bones train station
""".split()

PLAIN = re.compile(r"^[a-z]+$")


def fetch(name: str) -> bytes:
    url, sha = FILES[name]
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / name
    if not path.exists() or hashlib.sha256(path.read_bytes()).hexdigest() != sha:
        with urllib.request.urlopen(url) as response:
            path.write_bytes(response.read())
    body = path.read_bytes()
    if hashlib.sha256(body).hexdigest() != sha:
        raise SystemExit(f"{name} does not match its pinned SHA-256; refusing to use it.")
    return body


class Stub:
    """Stands in for gensim's classes, so the word list can be read without installing gensim."""

    def __init__(self, *args, **kwargs):
        pass

    def __setstate__(self, state):
        self.__dict__.update(state if isinstance(state, dict) else {})


class StubUnpickler(pickle.Unpickler):
    def find_class(self, module, name):
        if module.startswith("gensim"):
            return Stub
        if module.startswith("numpy") or module in ("builtins", "collections", "copyreg", "_codecs"):
            return super().find_class(module, name)
        raise pickle.UnpicklingError(f"refusing to load {module}.{name}")


def glove_words() -> list[str]:
    model = StubUnpickler(io.BytesIO(fetch("glove.model"))).load()
    # gensim 3 keeps the words, most frequent first, as index2word (gensim 4 renamed it index_to_key).
    words = getattr(model, "index2word", None) or getattr(model, "index_to_key", None)
    if not isinstance(words, list):
        raise SystemExit("The GloVe file has no word list where gensim keeps it.")
    return words


def write_pieces():
    out = MODELS / "gpt2-pieces-v1"
    out.mkdir(parents=True, exist_ok=True)
    for name in ("vocab.json", "merges.txt"):
        (out / name).write_bytes(fetch(name))


def write_words():
    out = MODELS / "glove-words-v1"
    out.mkdir(parents=True, exist_ok=True)
    words = glove_words()
    vectors = np.load(io.BytesIO(fetch("glove.npy")))
    if vectors.shape != (len(words), 50):
        raise SystemExit(f"Unexpected GloVe shape {vectors.shape}.")
    at = {word: index for index, word in enumerate(words)}
    keep: list[int] = []
    for index, word in enumerate(words):
        if len(keep) >= KEEP:
            break
        if PLAIN.match(word) and (len(word) > 1 or word in ("a", "i")):
            keep.append(index)
    chosen = set(keep)
    for word in NEEDED:
        if word not in at:
            raise SystemExit(f"GloVe has no '{word}'.")
        if at[word] not in chosen:
            keep.append(at[word])
            chosen.add(at[word])
    if len(keep) % 2:
        keep.pop()  # an even count keeps the float32 scales 4-byte aligned after the int8 block
    picked = vectors[keep].astype(np.float32)
    scales = np.abs(picked).max(axis=1) / 127.0
    codes = np.round(picked / scales[:, None]).clip(-127, 127).astype(np.int8)
    (out / "vectors.bin").write_bytes(codes.tobytes() + scales.astype("<f4").tobytes())
    (out / "words.txt").write_text("\n".join(words[index] for index in keep) + "\n")
    (out / "manifest.json").write_text(
        json.dumps({"count": len(keep), "dimensions": 50, "layout": "int8 codes, then float32 scales"}) + "\n"
    )


if __name__ == "__main__":
    write_pieces()
    write_words()
    for folder in ("gpt2-pieces-v1", "glove-words-v1"):
        for path in sorted((MODELS / folder).iterdir()):
            if path.name not in ("README.md", "LICENSE"):
                print(f"{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.name}  ({path.stat().st_size} bytes)")
