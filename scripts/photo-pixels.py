"""
Writes every photo in public/models/photos-v1 as raw 224 x 224 RGB bytes (<name>.rgb) into the folder
given, for scripts/build-picture-words.ts (Node has no JPEG reader). Pillow is pinned in
scripts/requirements-train.txt, so the bytes are the same every run.

  .venv/bin/python scripts/photo-pixels.py <folder>
"""

import sys
from pathlib import Path

from PIL import Image

PHOTOS = Path(__file__).resolve().parent.parent / "public" / "models" / "photos-v1"

if __name__ == "__main__":
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    for photo in sorted(PHOTOS.glob("*.jpg")):
        with Image.open(photo) as image:
            pixels = image.convert("RGB")
            if pixels.size != (224, 224):
                raise SystemExit(f"{photo.name} is not 224 x 224.")
            (out / f"{photo.stem}.rgb").write_bytes(pixels.tobytes())
