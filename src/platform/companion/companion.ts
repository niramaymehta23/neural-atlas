import { useStore } from "zustand";
import { ACTIVATIONS, type Activation } from "@/engine/autodiff/nn";
import { browserStorage, createPersistedStore, type KeyValueStorage } from "../storage";

/**
 * The learner's own network, carried from World 1 to World 4: lessons upgrade it (add a layer,
 * swap the bend, add a pattern torch) and later lessons start from it.
 */
export type Companion = {
  /** Cells per hidden layer, input side first. */
  hidden: number[];
  activation: Activation;
  convolution: boolean;
};

const KEY = "companion-v1";
export const freshCompanion: Companion = { hidden: [4], activation: "tanh", convolution: false };

const isActivation = (value: unknown): value is Activation =>
  [...ACTIVATIONS, "identity"].includes(value as Activation);

function parseCompanion(saved: unknown): Companion | null {
  if (typeof saved !== "object" || saved === null) return null;
  const { hidden, activation, convolution } = saved as Partial<Companion>;
  const valid =
    Array.isArray(hidden) &&
    hidden.every((size) => Number.isInteger(size) && size > 0) &&
    isActivation(activation) &&
    typeof convolution === "boolean";
  return valid ? { hidden, activation, convolution } : null;
}

export function createCompanionStore(storage: KeyValueStorage) {
  const store = createPersistedStore(KEY, freshCompanion, parseCompanion, storage);
  return {
    ...store,
    update: (change: Partial<Companion>) => store.change((model) => ({ ...model, ...change })),
    reset: () => store.change(() => freshCompanion),
  };
}

export const companionStore = createCompanionStore(browserStorage);

export function useCompanion<T>(select: (model: Companion) => T): T {
  return useStore(companionStore, select);
}
