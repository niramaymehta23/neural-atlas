# Section 01: classic ML engine

## Contract
### REQ-W2-01
Source: spec.md#L13-L22
Behavior: `src/engine/ml/` holds pure, seeded k-NN (plain and distance-weighted votes), a Gini decision tree, a bootstrapped random forest, gradient boosting with small regression trees on log-loss, an SVM (SMO with maximal-violating-pair selection) with flat and lifted kernels, multinomial naive Bayes with smoothing, k-means with seeded k-means++ starts, PCA (Jacobi eigenvectors) with shadow share, t-SNE (perplexity search, exaggeration, momentum with gains) and confusion matrix, ROC and area.
Expected: each file's test checks a hand-computed fixture and that the same seed gives bit-identical output twice.
Command: pnpm vitest run src/engine/ml

## Owned files
- src/engine/ml/knn.ts
- src/engine/ml/tree.ts
- src/engine/ml/boost.ts
- src/engine/ml/svm.ts
- src/engine/ml/kmeans.ts
- src/engine/ml/pca.ts
- src/engine/ml/metrics.ts

Also in the folder, small and covered by the same tests: bayes.ts, forest.ts, field.ts and the `*.test.ts` files.

## Compatibility
```json
{"version": 1, "mode": "not_required", "reason": "New pure engine folder; no existing caller or behaviour changes."}
```

## Evidence
Randomness only via `engine/random.ts`; engine imports nothing outside engine (eslint boundaries).

Rollback: revert this section's commit; it adds new files only (section 03 also adds `load` lines to the catalog).
Ownership: single writer; stage 06 owns worlds 1 and 3 and touches none of these paths.

## Review
Verdict: pass
Reviewed: algorithms chosen to be deterministic without randomness except through the seed (SMO pair choice is a deterministic maximal-violating pair, ties broken by index; tree splits tie-break by feature then threshold); fixture per algorithm; ownership is a new folder.
