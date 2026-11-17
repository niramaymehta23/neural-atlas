/**
 * The real attention model, run in Node from the same files the site serves, on the same runtime
 * the learner's browser uses: onnxruntime-web's WebAssembly build, single-threaded, at the version
 * Transformers.js ships. Only tests and scripts/record-attention-fixture.ts use it.
 *
 * Not onnxruntime-node: its native int8 kernels differ by processor (on x86-64 Linux the example
 * sentence's attention differs by up to 0.18 from ARM), so a native reading says nothing exact
 * about what learners see. The WebAssembly build runs the same code everywhere.
 */
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { AutoTokenizer, env, type Tensor } from "@huggingface/transformers";
import { createSession, type LoadedModel } from "../attention-session";
import { ATTENTION_MODEL, RUNTIME_VERSION } from "../runtime";

/** The few parts of onnxruntime-web used here (it is Transformers.js's dependency, not ours). */
type OrtTensor = { dims: readonly number[]; data: unknown };
type Ort = {
  env: { wasm: { numThreads?: number }; versions: { web?: string } };
  Tensor: new (type: "int64", data: BigInt64Array, dims: readonly number[]) => OrtTensor;
  InferenceSession: {
    create(
      model: Uint8Array,
      options: { executionProviders: string[] },
    ): Promise<{
      inputNames: readonly string[];
      run(feeds: Record<string, OrtTensor>): Promise<Record<string, OrtTensor | undefined>>;
    }>;
  };
};

/** onnxruntime-web as Transformers.js resolves it, so tests run the version the site ships. */
function browserRuntime(): Ort {
  const require = createRequire(import.meta.url);
  const fromTransformers = createRequire(require.resolve("@huggingface/transformers"));
  const runtime = fromTransformers("onnxruntime-web") as Ort;
  const version = runtime.env.versions.web;
  if (version !== RUNTIME_VERSION)
    throw new Error(`onnxruntime-web is ${version}, but the site ships ${RUNTIME_VERSION}.`);
  return runtime;
}

export async function loadNodeModel(root = process.cwd()): Promise<LoadedModel> {
  env.allowRemoteModels = false;
  env.allowLocalModels = true;
  env.localModelPath = join(root, "public/models/");
  const ort = browserRuntime();
  // As in the worker: one thread keeps every reading the same.
  ort.env.wasm.numThreads = 1;
  const [tokenizer, model] = await Promise.all([
    AutoTokenizer.from_pretrained(ATTENTION_MODEL),
    readFile(join(root, "public/models", ATTENTION_MODEL, "onnx/model_quantized.onnx")).then(
      (bytes) => ort.InferenceSession.create(bytes, { executionProviders: ["wasm"] }),
    ),
  ]);
  return {
    pieces: (word) => tokenizer.tokenize(word).length,
    async attend(text) {
      const inputs = tokenizer(text, { truncation: true, max_length: 128 }) as Record<
        string,
        Tensor
      >;
      const feeds: Record<string, OrtTensor> = {};
      for (const name of model.inputNames) {
        const input = inputs[name];
        if (!input) throw new Error(`The tokenizer gave no ${name}.`);
        feeds[name] = new ort.Tensor("int64", input.data as BigInt64Array, input.dims);
      }
      const { attentions } = await model.run(feeds);
      if (!attentions) throw new Error("The model gave no attentions.");
      return { dims: [...attentions.dims], data: attentions.data as Float32Array };
    },
  };
}

/** A reading session on the real model, loaded on first use. */
export const nodeSession = (root?: string) => createSession(() => loadNodeModel(root));
