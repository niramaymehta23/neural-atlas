import type { Random } from "../random";
import { Value } from "./value";

/** The four bends a neuron can put on its sum, plus "identity" (no bend) for output layers. */
export const ACTIVATIONS = ["relu", "leakyRelu", "tanh", "sigmoid"] as const;
export type Activation = (typeof ACTIVATIONS)[number] | "identity";

export function activate(value: Value, activation: Activation): Value {
  return activation === "identity" ? value : value[activation]();
}

/** One tiny voter: weighs its inputs, adds a bias, bends the result. */
export class Neuron {
  readonly weights: Value[];
  readonly bias = new Value(0);
  /** What this neuron said on its most recent input, for drawing. */
  output: Value | null = null;

  constructor(
    inputs: number,
    readonly activation: Activation,
    random: Random,
  ) {
    const scale = 1 / Math.sqrt(inputs);
    this.weights = Array.from({ length: inputs }, () => new Value(random.normal() * scale));
  }

  call(inputs: readonly Value[]): Value {
    const weighted = this.weights.map((weight, index) => weight.mul(inputs[index] ?? 0));
    this.output = activate(Value.sum([...weighted, this.bias]), this.activation);
    return this.output;
  }

  parameters(): Value[] {
    return [...this.weights, this.bias];
  }
}

export class Layer {
  readonly neurons: Neuron[];

  constructor(inputs: number, outputs: number, activation: Activation, random: Random) {
    this.neurons = Array.from({ length: outputs }, () => new Neuron(inputs, activation, random));
  }

  call(inputs: readonly Value[]): Value[] {
    return this.neurons.map((neuron) => neuron.call(inputs));
  }

  parameters(): Value[] {
    return this.neurons.flatMap((neuron) => neuron.parameters());
  }
}

export type MlpShape = {
  /** Neurons per layer, inputs first: [2, 8, 8, 1]. */
  sizes: readonly number[];
  /** Bend for every hidden layer. */
  activation: Activation;
  /** Bend for the last layer; losses expect "identity" (they take raw scores). */
  output?: Activation;
};

/** A stack of layers. Parameters are ordered layer by layer, neuron by neuron, weights then bias. */
export class MLP {
  readonly layers: Layer[];

  constructor(
    readonly shape: MlpShape,
    random: Random,
  ) {
    const { sizes, activation, output = "identity" } = shape;
    this.layers = sizes
      .slice(1)
      .map(
        (size, index) =>
          new Layer(
            sizes[index] ?? 0,
            size,
            index === sizes.length - 2 ? output : activation,
            random,
          ),
      );
  }

  call(inputs: readonly (Value | number)[]): Value[] {
    return this.layers.reduce<Value[]>(
      (values, layer) => layer.call(values),
      inputs.map((input) => (input instanceof Value ? input : new Value(input))),
    );
  }

  /**
   * The same answer as `call`, without building a graph to learn from: plain sums, with each bend
   * taken from Value so the formulas have one home. For painting thousands of points.
   */
  predict(inputs: readonly number[]): number[] {
    return this.layers.reduce<readonly number[]>(
      (values, layer) =>
        layer.neurons.map((neuron) => {
          const total = neuron.weights.reduce(
            (sum, weight, index) => sum + weight.data * (values[index] ?? 0),
            neuron.bias.data,
          );
          return activate(new Value(total), neuron.activation).data;
        }),
      inputs,
    ) as number[];
  }

  parameters(): Value[] {
    return this.layers.flatMap((layer) => layer.parameters());
  }
}

/** Copies parameter values out, exactly (float64), for snapshots. */
export function readParameters(parameters: readonly Value[]): Float64Array {
  return Float64Array.from(parameters, (parameter) => parameter.data);
}

export function writeParameters(parameters: readonly Value[], values: ArrayLike<number>): void {
  parameters.forEach((parameter, index) => {
    parameter.data = values[index] ?? parameter.data;
  });
}
