/**
 * The real attention model, run in Node (onnxruntime-node) from the same files the site serves.
 * Only tests and scripts/record-attention-fixture.ts use it; the site runs the model in a worker.
 */
import { join } from "node:path";
import { AutoModel, AutoTokenizer, env, type Tensor } from "@huggingface/transformers";
import { createSession, type LoadedModel } from "../attention-session";
import { ATTENTION_MODEL } from "../runtime";

export async function loadNodeModel(root = process.cwd()): Promise<LoadedModel> {
  env.allowRemoteModels = false;
  env.allowLocalModels = true;
  env.localModelPath = join(root, "public/models/");
  const [tokenizer, model] = await Promise.all([
    AutoTokenizer.from_pretrained(ATTENTION_MODEL),
    AutoModel.from_pretrained(ATTENTION_MODEL, { dtype: "q8" }),
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

/** A reading session on the real model, loaded on first use. */
export const nodeSession = (root?: string) => createSession(() => loadNodeModel(root));
