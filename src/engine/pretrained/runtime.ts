/**
 * Where the self-hosted pretrained models and their ONNX runtime are served from. Everything stays
 * on the site's own origin: it is cross-origin isolated, and models never come from elsewhere.
 */
export const MODELS_PATH = "/models/";
/** The runtime build Transformers.js uses outside old Safari, copied here by scripts/copy-runtime.ts. */
export const RUNTIME_PATH = `${MODELS_PATH}ort/`;
export const RUNTIME_FILES = {
  mjs: "ort-wasm-simd-threaded.asyncify.mjs",
  wasm: "ort-wasm-simd-threaded.asyncify.wasm",
} as const;
/** public/models/attention-minilm: all-MiniLM-L6-v2 with an attention output (see its README). */
export const ATTENTION_MODEL = "attention-minilm";
