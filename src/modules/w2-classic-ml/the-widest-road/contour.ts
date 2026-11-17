/**
 * Where a function crosses a level, as line pieces (marching squares on a grid over −1…1).
 * `values` holds `size × size` samples row by row from the top, as `gridInputs` lays them out.
 */
export function contour(values: ArrayLike<number>, size: number, level: number): string {
  const at = (row: number, column: number) => (values[row * size + column] ?? 0) - level;
  const x = (column: number) => ((column + 0.5) / size) * 2 - 1;
  const y = (row: number) => 1 - ((row + 0.5) / size) * 2;
  const round = (value: number) => Math.round(value * 1000) / 1000;
  const pieces: string[] = [];
  for (let row = 0; row < size - 1; row += 1)
    for (let column = 0; column < size - 1; column += 1) {
      // Corners clockwise from top left, and where the level crosses each edge.
      const a = at(row, column);
      const b = at(row, column + 1);
      const c = at(row + 1, column + 1);
      const d = at(row + 1, column);
      const cross = (p: number, q: number) => p / (p - q);
      const points: [number, number][] = [];
      if (a > 0 !== b > 0)
        points.push([x(column) + (x(column + 1) - x(column)) * cross(a, b), y(row)]);
      if (b > 0 !== c > 0)
        points.push([x(column + 1), y(row) + (y(row + 1) - y(row)) * cross(b, c)]);
      if (c > 0 !== d > 0)
        points.push([x(column + 1) + (x(column) - x(column + 1)) * cross(c, d), y(row + 1)]);
      if (d > 0 !== a > 0)
        points.push([x(column), y(row + 1) + (y(row) - y(row + 1)) * cross(d, a)]);
      for (let at2 = 0; at2 + 1 < points.length; at2 += 2) {
        const [from, to] = [points[at2], points[at2 + 1]];
        if (from && to)
          pieces.push(`M${round(from[0])} ${round(from[1])}L${round(to[0])} ${round(to[1])}`);
      }
    }
  return pieces.join("");
}
