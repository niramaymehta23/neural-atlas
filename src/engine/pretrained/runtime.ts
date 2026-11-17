/**
 * Where the self-hosted pretrained models and their ONNX runtime are served from. Everything stays
 * on the site's own origin: it is cross-origin isolated, and models never come from elsewhere.
 */
export const MODELS_PATH = "/models/";
/**
 * The onnxruntime-web version Transformers.js depends on. The runtime folder is named after it, so
 * a browser that cached last release's files for a day never pairs them with this release's code.
 * `scripts/copy-runtime.ts` fails the build when the installed version differs.
 */
export const RUNTIME_VERSION = "1.31.0-dev.20260914-8d85527a0";
/** Filled from node_modules by scripts/copy-runtime.ts before dev and build (gitignored). */
export const RUNTIME_PATH = `${MODELS_PATH}ort-${RUNTIME_VERSION}/`;
/**
 * The plain threaded WebAssembly build (14 MB). The lesson runs on `device: "wasm"`, so the
 * WebGPU-capable asyncify build (26 MB, over Cloudflare Pages' 25 MiB file limit) is never needed;
 * `next.config.ts` points the bundler at onnxruntime-web's external-wasm entry so it emits no copy.
 */
export const RUNTIME_FILES = {
  mjs: "ort-wasm-simd-threaded.mjs",
  wasm: "ort-wasm-simd-threaded.wasm",
} as const;
/**
 * public/models/attention-minilm-v1: all-MiniLM-L6-v2 with an attention output (see its README).
 * Bump the version folder whenever the files change: browsers keep `/models/*` for a day and
 * Transformers.js keeps it in the Cache API, both keyed by URL.
 */
export const ATTENTION_MODEL = "attention-minilm-v1";
