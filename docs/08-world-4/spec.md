# 08 — World 4: deep architectures

Source: requirements.md (World 4, "Seeing inside", "Generative"); [architecture.md](../architecture.md) (DoD).
Owned: REQ-W4-01..04.

```text
Dependencies: 06
Boundary: world 4
```

## Scope and non-goals

Twelve World 4 modules, `features/generative/`, TF.js CNN and generative models, webcam.

## Acceptance criteria

- **REQ-W4-01 Vision:** convolution, CNNs, pooling, transfer learning; webcam maps update at 15 fps or more; sample images work when the camera is denied; companion model gains convolution.
- **REQ-W4-02 Sequence:** RNNs and LSTM/GRU meet the DoD.
- **REQ-W4-03 Generative:** embeddings, autoencoders, VAEs, GANs, diffusion meet the DoD; each weight file is under 30 MB.
- **REQ-W4-04 GNN:** message pulses module meets the DoD.

## Testing

World 4 smoke spec with a fake camera stream; a weight-size check in CI.

## Risks

Small pretrained generative weights must be sourced or trained offline; the plan records each source and licence.
