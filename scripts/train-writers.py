"""
Writes a seeded practice text and trains World 5's two tiny writers on it, writing
public/models/tiny-writers-v1/. No outside text or weights are used, so everything it writes is under
the repository's MIT licence.

  python3.12 -m venv .venv && .venv/bin/pip install -r scripts/requirements-train.txt
  .venv/bin/python scripts/train-writers.py   # a few minutes on a laptop CPU

  storyteller.bin  a word-level tiny GPT ("Guess the next word", "Safe vs adventurous",
                   "Short-term memory", "Confident but wrong")
  writer.bin       a letter-level tiny GPT, the starting point "Specialising" retrains on pirate talk
  manifest.json    shapes, vocabularies, the facts and book titles the storyteller read, and a fixture
                   of each model's scores that src/engine/language checks its own maths against

Both are the same GPT as src/engine/language/tiny-gpt.ts (pre-normalisation, GELU, learned places),
stored as little-endian float32 in that file's tensor order, weights as rows of inputs.
"""

import hashlib
import json
import math
import random
from pathlib import Path

import numpy as np
import torch
from torch import nn

OUT = Path(__file__).resolve().parent.parent / "public" / "models" / "tiny-writers-v1"
torch.set_num_threads(4)
torch.use_deterministic_algorithms(True)

# What the storyteller reads: a small made-up world of animal facts, short stories, pets with names
# and the books it "read" them in. Some animals have no colour on purpose: asked their colour, it can
# only make one up ("Confident but wrong").
ANIMALS = {
    "owl": {"eats": "mice", "lives": "in the woods", "colour": None, "book": "night birds"},
    "fox": {"eats": "eggs", "lives": "in a den", "colour": "red", "book": "forest tales"},
    "bear": {"eats": "honey", "lives": "in a cave", "colour": "brown", "book": "forest friends"},
    "frog": {"eats": "flies", "lives": "in the pond", "colour": "green", "book": "pond life"},
    "duck": {"eats": "seeds", "lives": "on the pond", "colour": None, "book": "pond birds"},
    "horse": {"eats": "hay", "lives": "on the farm", "colour": "brown", "book": "the busy farm"},
    "cow": {"eats": "grass", "lives": "on the farm", "colour": "brown", "book": "farm life"},
    "hen": {"eats": "corn", "lives": "on the farm", "colour": None, "book": "farm birds"},
    "bee": {"eats": "nectar", "lives": "in a hive", "colour": "yellow", "book": "garden life"},
    "mouse": {"eats": "cheese", "lives": "in a hole", "colour": "grey", "book": "garden friends"},
    "rabbit": {"eats": "carrots", "lives": "in a burrow", "colour": "brown", "book": "garden tales"},
    "hedgehog": {"eats": "beetles", "lives": "in the hedge", "colour": "brown", "book": "night friends"},
}
PEOPLE = ["the cat", "the dog", "the girl", "the boy", "my friend", "the baby"]
DOINGS = [
    ("sat on the mat", 6),
    ("sat on the rug", 2),
    ("sat on the chair", 1),
    ("ran to the park", 4),
    ("ate an apple", 3),
    ("played with a ball", 4),
    ("went to school", 3),
    ("jumped over the log", 2),
    ("slept in the sun", 3),
    ("looked at the moon", 2),
    ("sang a happy song", 2),
]
PETS = ["dog", "cat", "fish", "rabbit"]
NAMES = [
    "biscuit", "pepper", "maple", "ziggy", "luna", "coco", "rufus", "pip",
    "bramble", "toffee", "button", "nutmeg", "olive", "waffle", "pickle", "sunny",
]


def story(rng: random.Random) -> str:
    who = rng.choice(PEOPLE)
    if who == "the cat" and rng.random() < 0.6:
        doing = "sat on the mat"
    else:
        doing = rng.choices([d for d, _ in DOINGS], [w for _, w in DOINGS])[0]
    return f"{who} {doing} ."


def fact(rng: random.Random, animal: str, kind: str) -> str:
    about = ANIMALS[animal]
    if kind == "eats":
        return f"the {animal} eats {about['eats']} ."
    if kind == "lives":
        return f"the {animal} lives {about['lives']} ."
    return f"the {animal} is {about['colour']} ."


def question(animal: str, kind: str) -> str:
    return {
        "eats": f"what does the {animal} eat ?",
        "lives": f"where does the {animal} live ?",
        "colour": f"what colour is the {animal} ?",
    }[kind]


def document(rng: random.Random) -> str:
    roll = rng.random()
    animal = rng.choice(list(ANIMALS))
    kinds = ["eats", "lives"] + (["colour"] if ANIMALS[animal]["colour"] else [])
    kind = rng.choice(kinds)
    if roll < 0.25:
        return " ".join(story(rng) for _ in range(rng.randint(1, 3)))
    if roll < 0.45:
        return fact(rng, animal, kind)
    if roll < 0.65:
        return f"{question(animal, kind)} {fact(rng, animal, kind)}"
    if roll < 0.75:
        return f"{question(animal, kind)} {fact(rng, animal, kind)} where did you read that ? in the book called {ANIMALS[animal]['book']} ."
    pet = rng.choice(PETS)
    name = rng.choice(NAMES)
    chatter = " ".join(story(rng) for _ in range(rng.randint(0, 4)))
    return f"my {pet} is called {name} . {chatter} what is my {pet} called ? my {pet} is called {name} ."


def practice_text(seed: int, count: int) -> list[str]:
    rng = random.Random(seed)
    return [document(rng) for _ in range(count)]


def sentence_case(text: str) -> str:
    """The storyteller's words as ordinary sentences, for the letter-level writer."""
    out, start = [], True
    for word in text.split():
        if word in (".", "?"):
            out[-1] += word
            start = True
            continue
        out.append(word.capitalize() if start else word)
        start = False
    return " ".join(out)


# The letter-level writer reads every printable plain letter, a space and a line break.
LETTERS = "\n" + "".join(chr(code) for code in range(32, 127))


class Block(nn.Module):
    def __init__(self, width: int, heads: int):
        super().__init__()
        self.heads = heads
        self.ln1 = nn.LayerNorm(width)
        self.qkv = nn.Linear(width, 3 * width)
        self.proj = nn.Linear(width, width)
        self.ln2 = nn.LayerNorm(width)
        self.fc = nn.Linear(width, 4 * width)
        self.out = nn.Linear(4 * width, width)

    def forward(self, x):
        b, n, w = x.shape
        q, k, v = self.qkv(self.ln1(x)).split(w, dim=2)
        size = w // self.heads
        q, k, v = (t.view(b, n, self.heads, size).transpose(1, 2) for t in (q, k, v))
        scores = (q @ k.transpose(-2, -1)) / math.sqrt(size)
        mask = torch.ones(n, n, dtype=torch.bool).tril()
        scores = scores.masked_fill(~mask, float("-inf"))
        mixed = (scores.softmax(-1) @ v).transpose(1, 2).reshape(b, n, w)
        x = x + self.proj(mixed)
        return x + self.out(nn.functional.gelu(self.fc(self.ln2(x)), approximate="tanh"))


class TinyGpt(nn.Module):
    def __init__(self, vocab: int, context: int, width: int, heads: int, layers: int):
        super().__init__()
        self.tokens = nn.Embedding(vocab, width)
        self.places = nn.Embedding(context, width)
        self.blocks = nn.ModuleList(Block(width, heads) for _ in range(layers))
        self.lnf = nn.LayerNorm(width)
        self.head = nn.Linear(width, vocab)
        for name, p in self.named_parameters():
            if p.dim() == 2:
                spread = 0.02 / math.sqrt(2 * layers) if name.endswith(("proj.weight", "out.weight")) else 0.02
                nn.init.normal_(p, 0, spread)
            elif name.endswith("bias"):
                nn.init.zeros_(p)

    def forward(self, ids):
        x = self.tokens(ids) + self.places(torch.arange(ids.shape[1]))
        for block in self.blocks:
            x = block(x)
        return self.head(self.lnf(x))

    def flat(self) -> np.ndarray:
        """Every tensor in tiny-gpt.ts's order, weights as rows of inputs."""
        parts = [self.tokens.weight, self.places.weight]
        for b in self.blocks:
            parts += [b.ln1.weight, b.ln1.bias, b.qkv.weight.T, b.qkv.bias, b.proj.weight.T, b.proj.bias,
                      b.ln2.weight, b.ln2.bias, b.fc.weight.T, b.fc.bias, b.out.weight.T, b.out.bias]
        parts += [self.lnf.weight, self.lnf.bias, self.head.weight.T, self.head.bias]
        return np.concatenate([p.detach().contiguous().numpy().astype("<f4").ravel() for p in parts])


def train(ids: np.ndarray, shape: dict, steps: int, seed: int, rate: float) -> TinyGpt:
    torch.manual_seed(seed)
    model = TinyGpt(**shape)
    optimiser = torch.optim.AdamW(model.parameters(), lr=rate, betas=(0.9, 0.99), weight_decay=0.01)
    rng = np.random.default_rng(seed)
    stream = torch.tensor(ids, dtype=torch.long)
    span = shape["context"]
    for step in range(steps):
        starts = rng.integers(0, len(ids) - span - 1, size=32)
        batch = torch.stack([stream[s : s + span + 1] for s in starts])
        logits = model(batch[:, :-1])
        loss = nn.functional.cross_entropy(logits.reshape(-1, shape["vocab"]), batch[:, 1:].reshape(-1))
        for group in optimiser.param_groups:
            group["lr"] = rate * 0.5 * (1 + math.cos(math.pi * step / steps))
        optimiser.zero_grad()
        loss.backward()
        nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimiser.step()
        if step % 500 == 0 or step == steps - 1:
            print(f"  step {step}: surprise {loss.item():.3f}")
    return model.eval()


def fixture(model: TinyGpt, ids: list[int]) -> list[float]:
    with torch.no_grad():
        return [round(float(v), 5) for v in model(torch.tensor([ids]))[0, -1]]


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    documents = practice_text(seed=9, count=60_000)
    words = sorted({word for doc in documents for word in doc.split()})
    word_ids = {word: at for at, word in enumerate(words)}
    stream = np.array([word_ids[w] for doc in documents for w in doc.split()], dtype=np.int64)
    story_shape = {"vocab": len(words), "context": 48, "width": 64, "heads": 4, "layers": 2}
    print(f"storyteller: {len(words)} words, {len(stream)} words of practice")
    storyteller = train(stream, story_shape, steps=4000, seed=1, rate=3e-3)

    letters_text = "\n".join(sentence_case(doc) for doc in documents[:20_000])
    letter_ids = {letter: at for at, letter in enumerate(LETTERS)}
    letter_stream = np.array([letter_ids[c] for c in letters_text], dtype=np.int64)
    writer_shape = {"vocab": len(LETTERS), "context": 32, "width": 48, "heads": 4, "layers": 2}
    print(f"writer: {len(letter_stream)} letters of practice")
    writer = train(letter_stream, writer_shape, steps=3000, seed=2, rate=3e-3)

    (OUT / "storyteller.bin").write_bytes(storyteller.flat().tobytes())
    (OUT / "writer.bin").write_bytes(writer.flat().tobytes())
    probe = "the cat sat on the".split()
    letter_probe = "The owl eats "
    manifest = {
        "storyteller": {
            "file": "storyteller.bin",
            "shape": story_shape,
            "words": words,
            "fixture": {"words": probe, "scores": fixture(storyteller, [word_ids[w] for w in probe])},
        },
        "writer": {
            "file": "writer.bin",
            "shape": writer_shape,
            "letters": LETTERS,
            "fixture": {"text": letter_probe, "scores": fixture(writer, [letter_ids[c] for c in letter_probe])},
            "everyday": sentence_case(" ".join(practice_text(seed=77, count=40))),
        },
        "animals": ANIMALS,
        "books": sorted({about["book"] for about in ANIMALS.values()}),
        "names": NAMES,
        "pets": PETS,
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=1) + "\n")
    for name in ("storyteller.bin", "writer.bin", "manifest.json"):
        body = (OUT / name).read_bytes()
        print(f"{hashlib.sha256(body).hexdigest()}  {name}  ({len(body)} bytes)")


if __name__ == "__main__":
    main()
