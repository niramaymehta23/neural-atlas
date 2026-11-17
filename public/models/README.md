# Self-hosted models and runtime

Everything the pretrained lessons load comes from this folder on the site's own origin (the site is
cross-origin isolated, so nothing may be fetched from elsewhere).

- `attention-minilm-v1/`: the attention lesson's model, with its licence, notice and checksums.
- `ort-<version>/` (gitignored): the ONNX runtime for WebAssembly, copied from `node_modules` by
  `scripts/copy-runtime.ts` before `dev` and `build`. It comes from
  [onnxruntime-web](https://github.com/microsoft/onnxruntime) (MIT, commit
  `8d85527a010e294a26b274749f74294b2a32cec5`); the npm package ships no licence file, so
  `onnxruntime-web.LICENSE.txt` and `onnxruntime-web.ThirdPartyNotices.txt` are copies from that commit.
  Refresh them when `RUNTIME_VERSION` in `src/engine/pretrained/runtime.ts` changes.

## Why the model is in plain git, not Git LFS

Git LFS would need the `git-lfs` client on every machine and LFS storage and bandwidth on the GitHub
account (every CI checkout counts), which this project has not set up. The model changes rarely, so it
stays a plain file, and its integrity is guarded instead: `pnpm check-model` (run in CI) fails unless
every file matches the SHA-256 lines in the folder's README, and `scripts/export-attention-model.py`
with `scripts/requirements-export.txt` rebuilds it byte for byte. If the repository ever moves the
model out of git, fetch it from a pinned release URL in CI and keep the same checksum check.
