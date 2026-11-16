# 09 — World 5: transformers and LLMs

Source: requirements.md (World 5, "Language models"); [architecture.md](../architecture.md) (DoD).
Owned: REQ-W5-01..04.

```text
Dependencies: 08
Boundary: world 5
```

## Scope and non-goals

Sixteen remaining World 5 modules, `features/language/`, baby GPT. Reuses the embedding galaxy from 08.

## Acceptance criteria

- **REQ-W5-01:** tokenisation, word embeddings, positional encoding, multi-head attention meet the DoD.
- **REQ-W5-02:** transformer block, next-token, sampling, context windows, hallucination; sampling dials update the distribution within one frame.
- **REQ-W5-03:** pretraining, scaling laws, fine-tuning; baby GPT shows style-shifted text within 2 minutes.
- **REQ-W5-04:** RLHF ranker, RAG, agent loop, multimodal run fully client-side.

## Testing

World 5 smoke spec; baby GPT loss-decrease test with a fixed seed.

## Risks

RAG and the agent loop use a small local corpus and scripted tools, never a live LLM API.
