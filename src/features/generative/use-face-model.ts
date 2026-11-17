"use client";

import { useCallback, useEffect, useState } from "react";
import type { ModelName, Weights } from "@/engine/generative/faces";
import { loadKit, loadModel, type FacesKit } from "./face-files";

export type FaceModel =
  | { status: "loading" }
  | { status: "failed"; retry: () => void }
  | { status: "ready"; kit: FacesKit; weights: Weights };

const LOADING: FaceModel = { status: "loading" };

/**
 * One face model and the shared face files, fetched on first use; "failed" offers Try again.
 * The answer is the same object until something changes, so scenes can depend on it.
 */
export function useFaceModel(name: ModelName): FaceModel {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<{ key: string; model: FaceModel } | null>(null);
  const key = `${name}#${attempt}`;
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    let current = true;
    Promise.all([loadKit(), loadModel(name)]).then(
      ([kit, weights]) => current && setSettled({ key, model: { status: "ready", kit, weights } }),
      () => current && setSettled({ key, model: { status: "failed", retry } }),
    );
    return () => {
      current = false;
    };
  }, [name, key, retry]);

  return settled && settled.key === key ? settled.model : LOADING;
}
