import { gridInputs, makeDataset, type DatasetName, type Point } from "@/data/datasets";
import { weightDash } from "@/design/encodings";
import {
  chance,
  createTrainer,
  predict,
  startParams,
  type DenseSpec,
  type DenseTrainer,
} from "@/engine/autodiff/dense";
import { layoutEdges, layoutNeurons } from "@/visuals/network-layout";
import { theatreCaptions as words } from "./captions";
import { regionBytes, type Painter, type Show } from "./painter";

const GARDENS: readonly DatasetName[] = ["circles", "moons", "spiral", "xor", "blobs"];
const SPEC: DenseSpec = { sizes: [2, 8, 8, 1], bends: ["tanh"], loss: "logistic" };
const DOTS = 110;
const ROUNDS = 260;
const ROUND_SECONDS = 0.1;
const REST_SECONDS = 5;
/** Rounds at once at most, so a long gap never holds up a frame. */
const MOST_ROUNDS = 30;
const FIELD = 32;
const SPOTS = gridInputs(FIELD);
/** Seconds a moving dot takes along its thread. */
const TRAVEL = 2.2;

/** A small team learning garden after garden, its threads and its painted guess side by side. */
export function createShapesShow(seed = 1): Show {
  let garden = -1;
  let dots: Point[] = [];
  let params: Float64Array = new Float64Array();
  let trainer: DenseTrainer | null = null;
  let clock = 0;
  let rest = 0;
  let time = 0;
  const chances = new Float64Array(FIELD * FIELD);
  let picture: { canvas: HTMLCanvasElement; image: ImageData } | null = null;

  const look = () => {
    const scores = predict(SPEC, params, SPOTS);
    for (let spot = 0; spot < chances.length; spot += 1) chances[spot] = chance(scores[spot] ?? 0);
  };
  const begin = () => {
    garden += 1;
    const name = GARDENS[garden % GARDENS.length] ?? "circles";
    const own = seed + (garden % 50);
    dots = makeDataset(name, { count: DOTS, noise: 0.08, seed: own, classes: 2, spin: 4.2 });
    params = startParams(SPEC.sizes, { seed: own });
    trainer = createTrainer(
      SPEC,
      params,
      {
        inputs: dots.flatMap(({ x, y }) => [x, y]),
        targets: dots.map(({ label }) => label),
      },
      { optimiser: "adam", learningRate: 0.02, batchSize: 16, seed: own },
    );
    clock = 0;
    rest = 0;
    look();
  };
  begin();

  const drawField = (
    { context, palette, shapes }: Painter,
    left: number,
    top: number,
    side: number,
  ) => {
    if (!picture) {
      const canvas = document.createElement("canvas");
      canvas.width = FIELD;
      canvas.height = FIELD;
      picture = { canvas, image: new ImageData(FIELD, FIELD) };
    }
    const { canvas, image } = picture;
    for (let spot = 0; spot < chances.length; spot += 1) {
      const [r, g, b] = regionBytes(palette, chances[spot] ?? 0.5);
      image.data[spot * 4] = r;
      image.data[spot * 4 + 1] = g;
      image.data[spot * 4 + 2] = b;
      image.data[spot * 4 + 3] = 255;
    }
    canvas.getContext("2d")?.putImageData(image, 0, 0);
    context.imageSmoothingEnabled = true;
    context.drawImage(canvas, left, top, side, side);
    context.strokeStyle = palette.hairline;
    context.lineWidth = 1;
    context.strokeRect(left, top, side, side);
    const radius = Math.max(4, side / 70);
    for (const { x, y, label } of dots) {
      if (Math.abs(x) > 1 || Math.abs(y) > 1) continue;
      const shape = shapes.groups[label];
      if (!shape) continue;
      context.save();
      context.translate(left + ((x + 1) / 2) * side, top + ((1 - y) / 2) * side);
      context.scale(radius, radius);
      context.fillStyle = palette.groups[label === 1 ? 1 : 0];
      context.fill(shape);
      context.strokeStyle = palette.ink;
      context.lineWidth = 1.4 / radius;
      context.stroke(shape);
      context.restore();
    }
  };

  const drawTeam = (
    { context, palette, still }: Painter,
    left: number,
    top: number,
    width: number,
    height: number,
  ) => {
    const neurons = layoutNeurons(SPEC.sizes, width, height);
    const edges = layoutEdges(neurons, params);
    context.save();
    context.translate(left, top);
    for (const { from, to, weight, strength } of edges) {
      const thick = 0.5 + strength * 5;
      const dash = weightDash(weight, thick);
      context.setLineDash(dash ? dash.split(" ").map(Number) : []);
      context.strokeStyle = weight < 0 ? palette.weights.down : palette.weights.up;
      context.globalAlpha = 0.25 + 0.75 * strength;
      context.lineWidth = thick;
      context.beginPath();
      context.moveTo(from[0], from[1]);
      context.lineTo(to[0], to[1]);
      context.stroke();
    }
    context.setLineDash([]);
    context.globalAlpha = 1;
    context.fillStyle = palette.accent;
    edges.forEach(({ from, to, strength }, index) => {
      if (still || strength < 0.3) return;
      const along = (time / TRAVEL + index * 0.137) % 1;
      context.beginPath();
      context.arc(
        from[0] + (to[0] - from[0]) * along,
        from[1] + (to[1] - from[1]) * along,
        2.5,
        0,
        Math.PI * 2,
      );
      context.fill();
    });
    const radius = Math.max(6, Math.min(14, height / 40));
    for (const [x, y] of neurons.flat()) {
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fillStyle = palette.card;
      context.fill();
      context.strokeStyle = palette.ink;
      context.lineWidth = 1.5;
      context.stroke();
    }
    context.restore();
  };

  return {
    advance(seconds) {
      time = (time + seconds) % 1000;
      if (!trainer) return;
      if (trainer.rounds >= ROUNDS) {
        rest += seconds;
        if (rest >= REST_SECONDS) begin();
        return;
      }
      clock += seconds;
      const rounds = Math.min(MOST_ROUNDS, Math.floor(clock / ROUND_SECONDS));
      if (rounds === 0) return;
      clock = Math.min(clock - rounds * ROUND_SECONDS, ROUND_SECONDS);
      for (let round = 0; round < rounds && trainer.rounds < ROUNDS; round += 1) trainer.round();
      look();
    },
    draw(painter) {
      const { width, height } = painter;
      const wide = width > height * 1.15;
      const margin = Math.min(width, height) * 0.1;
      if (wide) {
        const side = Math.min(height - margin * 2.4, (width - margin * 3) / 2);
        const top = (height - side) / 2;
        const left = (width - side * 2 - margin) / 2;
        drawField(painter, left, top, side);
        drawTeam(painter, left + side + margin, top, side, side);
      } else {
        const side = Math.min(width - margin * 2, (height - margin * 4) / 2);
        const left = (width - side) / 2;
        const top = (height - side * 2 - margin) / 2;
        drawField(painter, left, top, side);
        drawTeam(painter, left, top + side + margin, side, side);
      }
    },
    describe: () => words.now.shapes,
  };
}
