# 07 — World 2: classic ML

Source: requirements.md (World 2, "Classic ML"); docs/architecture.md (DoD).
Owned: REQ-W2-01..02.

```text
Dependencies: 05
Boundary: world 2
```

## Scope and non-goals

`engine/ml/`, ten World 2 modules, `features/classic/`.

## Acceptance criteria

- **REQ-W2-01:** k-NN, tree, forest, boosting, SVM with kernels, naive Bayes, k-means, PCA, t-SNE, confusion and ROC are deterministic by seed.
- **REQ-W2-02:** each module meets the DoD; 2D modules reuse DataKit and DecisionField.

## Testing

Each algorithm checked against a hand-computed fixture; World 2 smoke spec.

## Risks

t-SNE over 1k points must step inside the worker to stay interactive.
