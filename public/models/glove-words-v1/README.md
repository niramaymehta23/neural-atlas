# GloVe word places (v1)

Word vectors for "Words as places", "Looking things up" and "Pictures and words together":
GloVe 6B, 50 numbers per word, cut to the 6,000 most frequent plain lower-case words plus the few
rarer words the lessons need (6,036 in all).

- Source: [fse/glove-wiki-gigaword-50](https://huggingface.co/fse/glove-wiki-gigaword-50) on Hugging
  Face, revision `6d69f9a584e4268937f8b8e9ae5810fbb22c0cc9` (a copy of Stanford's glove.6B.50d).
- Licence: Public Domain Dedication and License (PDDL) v1.0; see `LICENSE`.
- Layout: `words.txt` lists the words, one a line, most frequent first. `vectors.bin` holds, for each
  word in that order, 50 signed bytes, and then one little-endian float32 scale per word; a word's
  vector is its bytes times its scale. `manifest.json` gives the count and size.
- Rebuilt byte for byte by `scripts/fetch-language-files.py` (pinned downloads, SHA-256 checked).

## Checksums

```text
a416d0ad54f21a95fc8f6ea74f4b92f27e329c148d64b8fcc8e0beaee8066e12  words.txt
8f6b32fd91a2ed5129b014b99e767c413d43860b5022fbe4425cbaad3ce9c99a  vectors.bin
38eabe27bf2a27c2a2309af4c194a7ba63dc314e8e8a0f48dc7cb12358659ae9  manifest.json
```
