/**
 * A number that remembers how it was made, so it can say how much each ingredient moved it.
 * micrograd-style scalar autodiff: every weight, activation and gradient stays inspectable.
 */
export class Value {
  grad = 0;
  private backwardStep: () => void = () => {};

  constructor(
    public data: number,
    readonly children: readonly Value[] = [],
    readonly op = "",
  ) {}

  add(other: Value | number): Value {
    const that = lift(other);
    const out = new Value(this.data + that.data, [this, that], "+");
    out.backwardStep = () => {
      this.grad += out.grad;
      that.grad += out.grad;
    };
    return out;
  }

  mul(other: Value | number): Value {
    const that = lift(other);
    const out = new Value(this.data * that.data, [this, that], "*");
    out.backwardStep = () => {
      this.grad += that.data * out.grad;
      that.grad += this.data * out.grad;
    };
    return out;
  }

  pow(exponent: number): Value {
    const out = new Value(this.data ** exponent, [this], `^${exponent}`);
    out.backwardStep = () => {
      this.grad += exponent * this.data ** (exponent - 1) * out.grad;
    };
    return out;
  }

  neg(): Value {
    return this.mul(-1);
  }

  sub(other: Value | number): Value {
    return this.add(lift(other).neg());
  }

  div(other: Value | number): Value {
    return this.mul(lift(other).pow(-1));
  }

  exp(): Value {
    return this.unary(Math.exp(this.data), "exp", (out) => out);
  }

  log(): Value {
    return this.unary(Math.log(this.data), "log", () => 1 / this.data);
  }

  relu(): Value {
    return this.unary(Math.max(0, this.data), "relu", () => (this.data > 0 ? 1 : 0));
  }

  leakyRelu(): Value {
    const slope = this.data > 0 ? 1 : LEAK;
    return this.unary(this.data * slope, "leakyRelu", () => slope);
  }

  tanh(): Value {
    return this.unary(Math.tanh(this.data), "tanh", (out) => 1 - out ** 2);
  }

  sigmoid(): Value {
    return this.unary(1 / (1 + Math.exp(-this.data)), "sigmoid", (out) => out * (1 - out));
  }

  /** One node for a long sum, so a neuron with many inputs stays a shallow graph. */
  static sum(values: readonly Value[]): Value {
    const out = new Value(
      values.reduce((total, value) => total + value.data, 0),
      values,
      "sum",
    );
    out.backwardStep = () => {
      for (const value of values) value.grad += out.grad;
    };
    return out;
  }

  /** Fills `grad` on every Value that fed into this one (this one gets 1). */
  backward(): void {
    const order: Value[] = [];
    const seen = new Set<Value>();
    // Iterative depth-first topological sort: big graphs would overflow recursion.
    const stack: [Value, boolean][] = [[this, false]];
    while (stack.length > 0) {
      const [node, expanded] = stack.pop() as [Value, boolean];
      if (expanded) {
        order.push(node);
        continue;
      }
      if (seen.has(node)) continue;
      seen.add(node);
      stack.push([node, true]);
      for (const child of node.children) if (!seen.has(child)) stack.push([child, false]);
    }
    this.grad = 1;
    for (let index = order.length - 1; index >= 0; index -= 1) order[index]?.backwardStep();
  }

  /** A one-input op whose local slope is computed from its output. */
  private unary(data: number, op: string, slope: (out: number) => number): Value {
    const out = new Value(data, [this], op);
    out.backwardStep = () => {
      this.grad += slope(out.data) * out.grad;
    };
    return out;
  }
}

/** How much a leaky relu lets through below zero. */
export const LEAK = 0.01;

function lift(value: Value | number): Value {
  return value instanceof Value ? value : new Value(value);
}
