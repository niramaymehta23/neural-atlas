"""
Draws a seeded set of cartoon faces and trains the small World 4 face models on it, writing
public/models/faces-v1/. No outside data or weights are used, so everything it writes is under the
repository's MIT licence.

  python3.12 -m venv .venv && .venv/bin/pip install -r scripts/requirements-train.txt
  .venv/bin/python scripts/train-faces.py            # all models, a few minutes on a laptop CPU
  .venv/bin/python scripts/train-faces.py --preview  # only writes faces-preview.png to look at

Models (plain float32, little-endian; the layout of every tensor is in manifest.json):
  squeeze.bin   an autoencoder whose 16 code numbers are ordered (trained with nested dropout),
                so keeping only the first k numbers is the best squeeze to k ("Squeeze and rebuild")
  map-0/1/2.bin decoders from a 2-number map: a plain autoencoder, then two VAEs that keep the map
                tidier and tidier ("Smooth imagination"); the map spots of 600 real faces are in the
                manifest
  fog.bin       a small denoiser that guesses the clear picture under 200 steps of fog ("Painting from fog")
  faces.bin     1,000 real faces the models never practised on, 32 x 32 bytes each (0 paper, 255 ink)
"""

import argparse
import hashlib
import json
import math
import os
from pathlib import Path

import numpy as np
import torch
from torch import nn

SIZE = 32
SUPER = 4
OUT = Path(__file__).resolve().parent.parent / "public" / "models" / "faces-v1"
torch.set_num_threads(4)
torch.use_deterministic_algorithms(True)


def draw_faces(count: int, seed: int) -> np.ndarray:
    """`count` cartoon faces as ink amounts in 0..1, shape (count, 32, 32)."""
    rng = np.random.default_rng(seed)
    fine = SIZE * SUPER
    grid = (np.arange(fine) + 0.5) / SUPER
    xs, ys = np.meshgrid(grid, grid)
    faces = np.zeros((count, SIZE, SIZE), dtype=np.float32)
    for index in range(count):
        cx = 16 + rng.normal(0, 0.6)
        cy = 17 + rng.normal(0, 0.6)
        rx = rng.uniform(9, 12.5)
        ry = rng.uniform(10, 13.5)
        u = (xs - cx) / rx
        v = (ys - cy) / ry
        ring = np.sqrt(u * u + v * v)
        ink = np.where(ring < 1, rng.uniform(0.0, 0.35), 0.0)
        ink = np.maximum(ink, (np.abs(ring - 1) * min(rx, ry) < 0.75) * 1.0)
        eye_y = cy - ry * rng.uniform(0.1, 0.3)
        spread = rx * rng.uniform(0.32, 0.5)
        radius = rng.uniform(0.8, 1.9)
        if rng.uniform() < 0.7:
            line = -rng.uniform(0.2, 0.65) + rng.uniform(0.0, 0.5) * u * u
            # Hair stops above the eyes, so every face keeps both eyes.
            hair = (ring < 1.06) & (v < line) & (ys < eye_y - radius - 0.8)
            ink = np.where(hair, 0.85, ink)
        for side in (-1, 1):
            eye = (xs - (cx + side * spread)) ** 2 + (ys - eye_y) ** 2 < radius * radius
            ink = np.where(eye, 1.0, ink)
        mouth_y = cy + ry * rng.uniform(0.35, 0.55)
        half = rx * rng.uniform(0.25, 0.5)
        smile = rng.uniform(-1, 1)
        along = (xs - cx) / half
        curve = mouth_y + smile * 2.5 * (1 - along * along)
        mouth = (np.abs(along) <= 1) & (np.abs(ys - curve) < 0.7)
        ink = np.where(mouth, 1.0, ink)
        faces[index] = ink.reshape(SIZE, SUPER, SIZE, SUPER).mean(axis=(1, 3))
    return np.clip(faces, 0, 1)


def as_bytes(faces: np.ndarray) -> bytes:
    return np.round(faces * 255).astype(np.uint8).tobytes()


def preview(faces: np.ndarray, path: Path, columns: int = 16):
    from PIL import Image

    rows = math.ceil(len(faces) / columns)
    sheet = np.ones((rows * (SIZE + 2), columns * (SIZE + 2)), dtype=np.float32)
    for index, face in enumerate(faces):
        row, column = divmod(index, columns)
        sheet[row * (SIZE + 2) : row * (SIZE + 2) + SIZE, column * (SIZE + 2) : column * (SIZE + 2) + SIZE] = 1 - face
    Image.fromarray(np.round(sheet * 255).astype(np.uint8)).resize((sheet.shape[1] * 3, sheet.shape[0] * 3), 0).save(path)


class Tensors:
    """Collects named float32 tensors into one file and its manifest entry."""

    def __init__(self):
        self.parts: list[bytes] = []
        self.layout: list[dict] = []
        self.offset = 0

    def add(self, name: str, tensor: torch.Tensor):
        data = tensor.detach().cpu().contiguous().numpy().astype("<f4")
        self.layout.append({"name": name, "shape": list(data.shape), "offset": self.offset})
        self.parts.append(data.tobytes())
        self.offset += data.nbytes

    def add_linear(self, name: str, layer: nn.Linear):
        # Stored as [in, out] (row = input), the order the browser multiplies in.
        self.add(f"{name}.weight", layer.weight.t())
        self.add(f"{name}.bias", layer.bias)

    def write(self, path: Path) -> list[dict]:
        path.write_bytes(b"".join(self.parts))
        return self.layout


def batches(data: torch.Tensor, size: int, generator: torch.Generator):
    order = torch.randperm(len(data), generator=generator)
    for start in range(0, len(data) - size + 1, size):
        yield data[order[start : start + size]]


# --- Squeeze and rebuild: an ordered autoencoder -------------------------------------------------

CODE = 16


class Squeeze(nn.Module):
    def __init__(self):
        super().__init__()
        self.enc1 = nn.Linear(SIZE * SIZE, 384)
        self.enc2 = nn.Linear(384, CODE)
        self.dec1 = nn.Linear(CODE, 384)
        self.dec2 = nn.Linear(384, SIZE * SIZE)

    def encode(self, x):
        return self.enc2(torch.relu(self.enc1(x)))

    def decode(self, code):
        return self.dec2(torch.relu(self.dec1(code)))


def train_squeeze(data: torch.Tensor, epochs: int) -> Squeeze:
    torch.manual_seed(11)
    model = Squeeze()
    generator = torch.Generator().manual_seed(12)
    optimiser = torch.optim.Adam(model.parameters(), lr=1e-3)
    positions = torch.arange(CODE)
    for epoch in range(epochs):
        for batch in batches(data, 128, generator):
            # Nested dropout: keep only the first k numbers, k drawn evenly from 1..16.
            keep = torch.randint(1, CODE + 1, (len(batch), 1), generator=generator)
            code = model.encode(batch) * (positions < keep)
            loss = nn.functional.binary_cross_entropy_with_logits(model.decode(code), batch, reduction="sum") / len(batch)
            optimiser.zero_grad()
            loss.backward()
            optimiser.step()
        print(f"squeeze epoch {epoch + 1}: {loss.item():.1f}")
    return model


# --- Smooth imagination: maps of faces ---------------------------------------------------------


class Mapper(nn.Module):
    def __init__(self):
        super().__init__()
        self.enc1 = nn.Linear(SIZE * SIZE, 384)
        self.mean = nn.Linear(384, 2)
        self.spread = nn.Linear(384, 2)
        self.dec1 = nn.Linear(2, 128)
        self.dec2 = nn.Linear(128, 512)
        self.dec3 = nn.Linear(512, SIZE * SIZE)

    def encode(self, x):
        hidden = torch.relu(self.enc1(x))
        return self.mean(hidden), self.spread(hidden)

    def decode(self, spot):
        return self.dec3(torch.relu(self.dec2(torch.relu(self.dec1(spot)))))


# 0: a plain autoencoder (no tidying), 1: a VAE that tidies a little, 2: a full VAE.
TIDINESS = [0.0, 0.1, 1.0]


def train_mapper(data: torch.Tensor, tidy: float, epochs: int, seed: int) -> Mapper:
    torch.manual_seed(seed)
    model = Mapper()
    generator = torch.Generator().manual_seed(seed + 1)
    optimiser = torch.optim.Adam(model.parameters(), lr=1e-3)
    for epoch in range(epochs):
        for batch in batches(data, 128, generator):
            mean, spread = model.encode(batch)
            if tidy > 0:
                noise = torch.randn(mean.shape, generator=generator)
                spot = mean + torch.exp(0.5 * spread) * noise
                kl = -0.5 * torch.sum(1 + spread - mean * mean - torch.exp(spread)) / len(batch)
            else:
                spot = mean
                kl = torch.zeros(())
            rebuild = nn.functional.binary_cross_entropy_with_logits(model.decode(spot), batch, reduction="sum") / len(batch)
            loss = rebuild + tidy * kl
            optimiser.zero_grad()
            loss.backward()
            optimiser.step()
        print(f"map {tidy} epoch {epoch + 1}: rebuild {rebuild.item():.1f} kl {kl.item():.2f}")
    return model


# --- Painting from fog: a denoiser ---------------------------------------------------------------

STEPS = 200
TIME = 64
HIDDEN = 640


def schedule():
    """How much of the picture is left after each step (the rest is fog): almost none at the end."""
    scale = 1000 / STEPS
    betas = torch.linspace(1e-4 * scale, 0.02 * scale, STEPS, dtype=torch.float64)
    return torch.cumprod(1 - betas, 0).float()


def time_features(step: torch.Tensor) -> torch.Tensor:
    """Sines and cosines of the step number (0..199), the same sums the browser does."""
    half = TIME // 2
    rates = torch.exp(-math.log(1000.0) * torch.arange(half, dtype=torch.float32) / half)
    angles = step.float()[:, None] * rates[None, :]
    return torch.cat([torch.sin(angles), torch.cos(angles)], dim=1)


class Fog(nn.Module):
    def __init__(self):
        super().__init__()
        self.in1 = nn.Linear(SIZE * SIZE, HIDDEN)
        self.t1 = nn.Linear(TIME, HIDDEN)
        self.in2 = nn.Linear(HIDDEN, HIDDEN)
        self.t2 = nn.Linear(TIME, HIDDEN)
        self.in3 = nn.Linear(HIDDEN, HIDDEN)
        self.t3 = nn.Linear(TIME, HIDDEN)
        self.out = nn.Linear(HIDDEN, SIZE * SIZE)

    def forward(self, x, step):
        time = time_features(step)
        hidden = nn.functional.silu(self.in1(x) + self.t1(time))
        hidden = nn.functional.silu(self.in2(hidden) + self.t2(time))
        hidden = nn.functional.silu(self.in3(hidden) + self.t3(time))
        return self.out(hidden)


def train_fog(seed: int, epochs: int) -> Fog:
    torch.manual_seed(seed)
    model = Fog()
    generator = torch.Generator().manual_seed(seed + 1)
    optimiser = torch.optim.Adam(model.parameters(), lr=1e-3)
    data = torch.from_numpy(draw_faces(40000, seed=3)).reshape(-1, SIZE * SIZE) * 2 - 1
    per_epoch = len(data) // 128
    slowing = torch.optim.lr_scheduler.CosineAnnealingLR(optimiser, epochs * per_epoch, eta_min=1e-5)
    kept = schedule()
    for epoch in range(epochs):
        for batch in batches(data, 128, generator):
            step = torch.randint(0, STEPS, (len(batch),), generator=generator)
            noise = torch.randn(batch.shape, generator=generator)
            share = kept[step][:, None]
            foggy = share.sqrt() * batch + (1 - share).sqrt() * noise
            # It guesses the clear picture under the fog (steadier than guessing the fog itself).
            loss = ((model(foggy, step) - batch) ** 2).mean()
            optimiser.zero_grad()
            loss.backward()
            optimiser.step()
            slowing.step()
        print(f"fog epoch {epoch + 1}: {loss.item():.4f}")
    return model


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--preview", action="store_true")
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    reference = draw_faces(1000, seed=1)
    if args.preview:
        preview(reference[:128], Path("faces-preview.png"))
        return
    practice = torch.from_numpy(draw_faces(20000, seed=2)).reshape(-1, SIZE * SIZE)
    (OUT / "faces.bin").write_bytes(as_bytes(reference))
    held = torch.from_numpy(reference).reshape(-1, SIZE * SIZE)
    manifest: dict = {"size": SIZE, "faces": {"file": "faces.bin", "count": len(reference)}, "models": {}}

    squeeze = train_squeeze(practice, epochs=30)
    tensors = Tensors()
    for name in ("enc1", "enc2", "dec1", "dec2"):
        tensors.add_linear(name, getattr(squeeze, name))
    manifest["models"]["squeeze"] = {"file": "squeeze.bin", "code": CODE, "tensors": tensors.write(OUT / "squeeze.bin")}

    for level, tidy in enumerate(TIDINESS):
        mapper = train_mapper(practice, tidy, epochs=30, seed=21 + level)
        tensors = Tensors()
        for name in ("dec1", "dec2", "dec3"):
            tensors.add_linear(name, getattr(mapper, name))
        with torch.no_grad():
            spots = mapper.encode(held[:600])[0]
        manifest["models"][f"map-{level}"] = {
            "file": f"map-{level}.bin",
            "tidy": tidy,
            "spots": [[round(float(a), 4), round(float(b), 4)] for a, b in spots],
            "tensors": tensors.write(OUT / f"map-{level}.bin"),
        }

    fog = train_fog(seed=31, epochs=40)
    tensors = Tensors()
    for name in ("in1", "t1", "in2", "t2", "in3", "t3", "out"):
        tensors.add_linear(name, getattr(fog, name))
    manifest["models"]["fog"] = {
        "file": "fog.bin",
        "steps": STEPS,
        "time": TIME,
        "guesses": "picture",
        "kept": [float(value) for value in schedule()],
        "tensors": tensors.write(OUT / "fog.bin"),
    }

    (OUT / "manifest.json").write_text(json.dumps(manifest, separators=(",", ":")) + "\n")
    for name in sorted(os.listdir(OUT)):
        if name.endswith((".bin", ".json")):
            print(f"{sha(OUT / name)}  {name}")


if __name__ == "__main__":
    main()
