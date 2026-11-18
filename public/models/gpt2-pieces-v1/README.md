# GPT-2 word pieces (v1)

The byte-pair vocabulary and merges of OpenAI's GPT-2, used by "Chopping text into pieces" to split
text the way GPT-2 does. `src/engine/language/bpe.ts` applies them; it matches Transformers.js's GPT-2
tokenizer (checked in `bpe.test.ts`).

- Source: [openai-community/gpt2](https://huggingface.co/openai-community/gpt2) on Hugging Face,
  revision `607a30d783dfa663caf39e06633721c8d4cfcd7e`, files `vocab.json` and `merges.txt`, unchanged.
- Licence: Modified MIT, Software Copyright (c) 2019 OpenAI. `LICENSE` is the copy from
  [openai/gpt-2](https://github.com/openai/gpt-2) at commit `9b63575ef42771a015060c964af2c3da4cf7c8ab`.
- Rebuilt by `scripts/fetch-language-files.py`, which checks the SHA-256 of each download.

## Checksums

```text
196139668be63f3b5d6574427317ae82f612a97c5d1cdaf36ed2256dbf636783  vocab.json
1ce1664773c50f3e0cc8842619a93edc4624525b728b188a9e0be33b7726adc5  merges.txt
```
