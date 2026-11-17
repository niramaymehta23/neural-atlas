export type Vec3 = readonly [number, number, number];
type Matrix3 = [Vec3, Vec3, Vec3];

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** The covariance of a 3D cloud (divided by n). */
export function covariance(points: readonly Vec3[]): Matrix3 {
  const n = points.length || 1;
  const mean = [0, 0, 0];
  for (const point of points)
    point.forEach((value, axis) => (mean[axis] = (mean[axis] ?? 0) + value / n));
  const cell = (a: number, b: number) =>
    points.reduce(
      (sum, p) => sum + ((p[a] ?? 0) - (mean[a] ?? 0)) * ((p[b] ?? 0) - (mean[b] ?? 0)),
      0,
    ) / n;
  return [
    [cell(0, 0), cell(0, 1), cell(0, 2)],
    [cell(1, 0), cell(1, 1), cell(1, 2)],
    [cell(2, 0), cell(2, 1), cell(2, 2)],
  ];
}

/**
 * Eigenvalues (largest first) and unit eigenvectors of a symmetric 3 × 3 matrix, by cyclic
 * Jacobi rotations. Each vector's sign is fixed so its largest part is positive.
 */
export function eigen(matrix: Matrix3): { values: number[]; vectors: Vec3[] } {
  // Row-major 3 × 3 working copies: a (being diagonalised) and v (the rotations so far).
  const a = Float64Array.from(matrix.flat());
  const v = Float64Array.from([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  const at = (m: Float64Array, row: number, column: number) => m[row * 3 + column] ?? 0;
  const set = (m: Float64Array, row: number, column: number, value: number) => {
    m[row * 3 + column] = value;
  };
  for (let sweep = 0; sweep < 50; sweep += 1) {
    const off = at(a, 0, 1) ** 2 + at(a, 0, 2) ** 2 + at(a, 1, 2) ** 2;
    if (off < 1e-24) break;
    for (const [p, q] of [
      [0, 1],
      [0, 2],
      [1, 2],
    ] as const) {
      const apq = at(a, p, q);
      if (Math.abs(apq) < 1e-300) continue;
      const theta = (at(a, q, q) - at(a, p, p)) / (2 * apq);
      const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
      const c = 1 / Math.sqrt(t * t + 1);
      const s = t * c;
      for (let k = 0; k < 3; k += 1) {
        const kp = at(a, k, p);
        const kq = at(a, k, q);
        set(a, k, p, c * kp - s * kq);
        set(a, k, q, s * kp + c * kq);
      }
      for (let k = 0; k < 3; k += 1) {
        const pk = at(a, p, k);
        const qk = at(a, q, k);
        set(a, p, k, c * pk - s * qk);
        set(a, q, k, s * pk + c * qk);
      }
      for (let k = 0; k < 3; k += 1) {
        const kp = at(v, k, p);
        const kq = at(v, k, q);
        set(v, k, p, c * kp - s * kq);
        set(v, k, q, s * kp + c * kq);
      }
    }
  }
  const order = [0, 1, 2].sort((x, y) => at(a, y, y) - at(a, x, x) || x - y);
  const vectors = order.map((column): Vec3 => {
    const vector: Vec3 = [at(v, 0, column), at(v, 1, column), at(v, 2, column)];
    const biggest = vector.reduce(
      (best, value) => (Math.abs(value) > Math.abs(best) ? value : best),
      0,
    );
    const sign = biggest < 0 ? -1 : 1;
    return [vector[0] * sign, vector[1] * sign, vector[2] * sign];
  });
  return { values: order.map((index) => at(a, index, index)), vectors };
}

/**
 * The direction the light comes from for a view turned `turn` radians around the up axis and
 * tipped `tip` radians towards looking down: (0, 0, 1) when both are 0.
 */
export function viewDirection(turn: number, tip: number): Vec3 {
  return [Math.sin(turn) * Math.cos(tip), Math.sin(tip), Math.cos(turn) * Math.cos(tip)];
}

/** The 2D shadow of each point on a wall facing `turn`, `tip` (its right and up directions). */
export function shadowOf(points: readonly Vec3[], turn: number, tip: number): [number, number][] {
  const right: Vec3 = [Math.cos(turn), 0, -Math.sin(turn)];
  const up: Vec3 = [
    -Math.sin(turn) * Math.sin(tip),
    Math.cos(tip),
    -Math.cos(turn) * Math.sin(tip),
  ];
  return points.map((point) => [dot(point, right), dot(point, up)]);
}

/**
 * The share (0–1) of the cloud's spread its shadow keeps: everything except the spread along
 * the direction the light comes from.
 */
export function shadowShare(matrix: Matrix3, direction: Vec3): number {
  const total = matrix[0][0] + matrix[1][1] + matrix[2][2];
  if (total <= 0) return 1;
  const along = dot(direction, [
    dot(matrix[0], direction),
    dot(matrix[1], direction),
    dot(matrix[2], direction),
  ]);
  return Math.min(1, Math.max(0, 1 - along / total));
}

/** The turn and tip whose light comes along `direction` (its tip kept within ±90°). */
export function anglesOf(direction: Vec3): { turn: number; tip: number } {
  const [x, y, z] = direction;
  const length = Math.hypot(x, y, z) || 1;
  return { turn: Math.atan2(x, z), tip: Math.asin(Math.max(-1, Math.min(1, y / length))) };
}

/** The best shadow: light along the direction the cloud is thinnest (its smallest component). */
export function bestShadow(matrix: Matrix3) {
  const { vectors } = eigen(matrix);
  return anglesOf(vectors[2] ?? [0, 0, 1]);
}
