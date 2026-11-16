/**
 * The attention worker: loads the self-hosted model once (Transformers.js caches the files in the
 * browser) and reads sentences. Nothing is fetched from another origin.
 */
import { AutoModel, AutoTokenizer, env, type Tensor } from "@huggingface/transformers";
import type { AttentionCommand, AttentionEvent } from "./protocol";
import { ATTENTION_MODEL, MODELS_PATH, RUNTIME_FILES, RUNTIME_PATH } from "./runtime";

const local = (path: string) => new URL(path, self.location.origin).href;
env.allowRemoteModels = false;
env.allowLocalModels = true;
// Root-relative on purpose: Transformers.js only checks that a local file exists when the model
// path is not a full URL, and would otherwise report the tokenizer missing.
env.localModelPath = MODELS_PATH;
const wasm = env.backends.onnx.wasm;
if (wasm) {
  wasm.wasmPaths = {
    mjs: local(RUNTIME_PATH + RUNTIME_FILES.mjs),
    wasm: local(RUNTIME_PATH + RUNTIME_FILES.wasm),
  };
  // One thread is plenty for a dozen words, and keeps every reading the same.
  wasm.numThreads = 1;
}

let loading: ReturnType<typeof load> | null = null;

async function load() {
  const [tokenizer, model] = await Promise.all([
    AutoTokenizer.from_pretrained(ATTENTION_MODEL),
    AutoModel.from_pretrained(ATTENTION_MODEL, { dtype: "q8", device: "wasm" }),
  ]);
  return { tokenizer, model };
}

async function read(sentence: string) {
  loading ??= load();
  const { tokenizer, model } = await loading;
  const inputs = tokenizer(sentence);
  const { attentions } = (await model(inputs)) as { attentions: Tensor };
  const [layers = 0, , heads = 0, size = 0] = attentions.dims;
  const tokens = ["[CLS]", ...tokenizer.tokenize(sentence), "[SEP]"];
  if (tokens.length !== size) throw new Error("The words and the reading do not line up.");
  return { tokens, weights: attentions.data as Float32Array, layers, heads };
}

const post = (event: AttentionEvent) => self.postMessage(event);

self.onmessage = ({ data }: MessageEvent<AttentionCommand>) => {
  read(data.sentence).then(
    (reading) => post({ type: "reading", id: data.id, reading }),
    (error: unknown) => {
      loading = null; // a failed load can be tried again
      post({ type: "error", id: data.id, message: String(error) });
    },
  );
};
