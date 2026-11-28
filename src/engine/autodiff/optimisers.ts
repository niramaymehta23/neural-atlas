/** Anything with a value and a slope can be stepped: autodiff Values or a ball on a landscape. */
export type Param = { data: number; grad: number };

export const OPTIMISERS = ["sgd", "momentum", "adam"] as const;
export type OptimiserKind = (typeof OPTIMISERS)[number];

export type OptimiserSettings = {
  kind: OptimiserKind;
  /** How big a step. */
  learningRate: number;
  /** Momentum's memory of past steps (0–1). */
  momentum?: number;
  beta1?: number;
  beta2?: number;
};

export type Optimiser = {
  /** Moves every parameter downhill using its grad. Call with the same parameters in the same order. */
  step(params: readonly Param[]): void;
  settings: OptimiserSettings;
};

const EPSILON = 1e-8;

export function createOptimiser(settings: OptimiserSettings): Optimiser {
  const velocity: number[] = [];
  const second: number[] = [];
  let steps = 0;
  const optimiser: Optimiser = {
    settings,
    step(params) {
      const { kind, learningRate, momentum = 0.9, beta1 = 0.9, beta2 = 0.999 } = optimiser.settings;
      steps += 1;
      const fade1 = 1 - beta1 ** steps;
      const fade2 = 1 - beta2 ** steps;
      params.forEach((param, index) => {
        const { grad } = param;
        if (kind === "sgd") {
          param.data -= learningRate * grad;
        } else if (kind === "momentum") {
          const v = momentum * (velocity[index] ?? 0) + grad;
          velocity[index] = v;
          param.data -= learningRate * v;
        } else {
          const m = beta1 * (velocity[index] ?? 0) + (1 - beta1) * grad;
          const s = beta2 * (second[index] ?? 0) + (1 - beta2) * grad * grad;
          velocity[index] = m;
          second[index] = s;
          const mHat = m / fade1;
          const sHat = s / fade2;
          param.data -= (learningRate * mHat) / (Math.sqrt(sHat) + EPSILON);
        }
      });
    },
  };
  return optimiser;
}

export function zeroGrad(params: readonly Param[]): void {
  for (const param of params) param.grad = 0;
}
