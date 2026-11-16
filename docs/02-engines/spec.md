# 02 — Shared engines

Source: requirements.md (Shared engines, prompt 3); docs/architecture.md.
Owned: REQ-ENG-01..05.

```text
Dependencies: 01
Boundary: engine, scene, data
```

## Scope and non-goals

`engine/{autodiff,model,timeline,random.ts}`, `visuals/`, `scene3d/`, `data/`, TimelineScrubber. Not RL, classic ML or pretrained loaders.

## Acceptance criteria

- **REQ-ENG-01 Autodiff:** Value, Neuron, Layer, MLP, losses, three optimisers, four activations; same seed gives an identical run.
- **REQ-ENG-02 ModelEngine:** one worker, typed protocol, autodiff and TF.js backends (WebGPU, WebGL fallback); main thread holds 60 fps while a spiral MLP trains.
- **REQ-ENG-03 Timeline:** scrub to epoch n restores its snapshot; ghost run plays in sync.
- **REQ-ENG-04 Visuals:** 2D NetworkView, Edge, FlowParticles, Board, Chart; 3D LossLandscape, IdeaSpace, CameraRig without rotation required; 200 edges at 60 fps; every mapping from `encodings.ts`.
- **REQ-ENG-05 DataKit:** five seeded datasets, PaintCanvas, DecisionField redrawing 128² within 16 ms.

## Testing

Gradients match central differences to 1e-6; Timeline round-trip; Playwright performance trace.

## Risks

WebGPU varies; autodiff stays for small nets, larger ones use TF.js.
