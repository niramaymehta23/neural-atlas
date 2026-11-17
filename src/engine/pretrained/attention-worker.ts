/**
 * The attention worker: loads the self-hosted model once (Transformers.js caches the files in the
 * browser), reports how much of it has arrived, and reads sentences. Nothing is fetched from
 * another origin.
 */
import { AutoModel, AutoTokenizer, env, type Tensor } from "@huggingface/transformers";
import { MOST_LETTERS } from "./attention";
import {
  createProgress,
  createSession,
  ReaderFailure,
  type LoadedModel,
} from "./attention-session";
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

const post = (event: AttentionEvent, transfer: Transferable[] = []) =>
  self.postMessage(event, { transfer });
const progress = createProgress((fraction) => post({ type: "progress", fraction }));

/** Fetches the runtime ourselves, so its 14 MB count towards the progress bar. */
async function fetchRuntime(): Promise<Uint8Array> {
  const response = await fetch(local(RUNTIME_PATH + RUNTIME_FILES.wasm));
  if (!response.ok || !response.body) throw new Error(`The runtime answered ${response.status}.`);
  const total = Number(response.headers.get("content-length")) || 0;
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  const reader = response.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    progress.runtime(loaded, total || loaded);
  }
  const bytes = new Uint8Array(loaded);
  let at = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, at);
    at += chunk.byteLength;
  }
  progress.runtime(loaded, loaded);
  return bytes;
}

async function load(): Promise<LoadedModel> {
  if (wasm) wasm.wasmBinary = await fetchRuntime();
  const progress_callback = (info: { status: string; file?: string } & Record<string, unknown>) => {
    if (!info.file) return;
    if (info.status === "progress")
      progress.file(info.file, Number(info.loaded) || 0, Number(info.total) || 0);
    else if (info.status === "done") progress.fileDone(info.file);
  };
  const [tokenizer, model] = await Promise.all([
    AutoTokenizer.from_pretrained(ATTENTION_MODEL, { progress_callback }),
    AutoModel.from_pretrained(ATTENTION_MODEL, { dtype: "q8", device: "wasm", progress_callback }),
  ]);
  return {
    pieces: (word) => tokenizer.tokenize(word).length,
    async attend(text) {
      const inputs = tokenizer(text, { truncation: true, max_length: 128 });
      const { attentions } = (await model(inputs)) as { attentions: Tensor };
      return { dims: attentions.dims, data: attentions.data as Float32Array };
    },
  };
}

const session = createSession(load);

self.onmessage = ({ data }: MessageEvent<AttentionCommand>) => {
  session.read(data.sentence.slice(0, MOST_LETTERS)).then(
    (reading) => post({ type: "reading", id: data.id, reading }, [reading.weights.buffer]),
    (error: unknown) =>
      post({
        type: "error",
        id: data.id,
        stage: error instanceof ReaderFailure ? error.stage : "read",
        message: String(error),
      }),
  );
};
