"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react";
import { inkTone } from "@/design/encodings";
import { useColourTable } from "@/design/paint";
import { pictureAt, SIDE, type Weights } from "@/engine/generative/faces";
import { useHoldDrag, type DragPoint } from "@/features/building/use-hold-drag";
import { FaceModelStatus } from "@/features/generative/FaceModelStatus";
import { FacePicture, paintPixels } from "@/features/generative/FacePicture";
import { useFaceModel, type FaceModel } from "@/features/generative/use-face-model";
import type { ModuleViewProps } from "@/platform/contract";
import { words } from "./captions";
import {
  CHECK,
  isNonsense,
  mapName,
  matches,
  share,
  shareOf,
  spotAt,
  STEP,
  tileAt,
  windowFor,
  type MapFrame,
  type MapState,
  type MapWindow,
} from "./model";
import { useSliced } from "./sliced";

type Props = ModuleViewProps<MapState, MapFrame>;
type ReadyModel = Extract<FaceModel, { status: "ready" }>;

/** Nonsense counts of the fixed check, kept per map so it is worked out once a page. */
const checked = new WeakMap<Weights, number>();

const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

/** The map as a mosaic of the faces it draws, the real faces' spots, and the face at the marker. */
export function MapScene({ state, update, timeline }: Props) {
  const model = useFaceModel(mapName(state.tidy));
  // While another map arrives, the last one stays on screen (faded), so nothing jumps or loses focus.
  const [last, setLast] = useState<{ tidy: number; model: ReadyModel } | null>(null);
  if (model.status === "ready" && last?.model !== model) setLast({ tidy: state.tidy, model });
  const shown = model.status === "ready" ? { tidy: state.tidy, model } : last;
  const ready = shown?.model ?? null;
  const tidy = shown?.tidy ?? state.tidy;
  const view = useMemo(() => (ready ? windowFor(ready.kit.manifest, tidy) : null), [ready, tidy]);
  const torn = useTornCheck(ready?.weights ?? null, ready?.kit.faces ?? null, view);
  const marker = useMemo(() => {
    if (!ready || !view) return null;
    const picture = pictureAt(ready.weights, ...spotAt(view, state.x, state.y));
    return { picture, nonsense: isNonsense(picture, ready.kit.faces) };
  }, [ready, view, state.x, state.y]);
  const recorded = useRef(0);
  const { length } = useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  const newest = length > 0 ? timeline.at(length - 1) : undefined;

  // The face at the marker is judged and recorded, so the mission and guess see what is on screen.
  useEffect(() => {
    if (!marker) return;
    recorded.current += 1;
    timeline.record({
      epoch: recorded.current,
      loss: marker.nonsense ? 1 : 0,
      tidy,
      x: state.x,
      y: state.y,
      nonsense: marker.nonsense,
      torn,
    });
  }, [marker, torn, tidy, state.x, state.y, timeline]);

  const move = (x: number, y: number) => update({ x: share(x), y: share(y) });

  return (
    <div className="flex grow flex-col gap-3" data-testid="smooth-imagination">
      {model.status === "failed" || !ready || !view || !marker ? (
        <FaceModelStatus
          model={model.status === "ready" ? { status: "loading" } : model}
          words={words.model}
          className="aspect-square w-full max-w-md"
        />
      ) : (
        <div
          className={`grid gap-3 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] ${tidy === state.tidy ? "" : "opacity-50"}`}
          data-arriving={String(tidy !== state.tidy)}
        >
          <Mosaic
            weights={ready.weights}
            view={view}
            spots={ready.kit.manifest.models[mapName(tidy)].spots}
            state={{ ...state, tidy }}
            onMove={move}
          />
          <figure className="flex flex-col gap-2" data-marker-face>
            <FacePicture
              picture={marker.picture}
              label={words.picture.label}
              className="w-full max-w-48"
            />
            <figcaption className="text-xs text-ink-soft">{words.picture.caption}</figcaption>
            {/* A reserved line, so the page does not jump when the verdict changes. */}
            <p className="min-h-10 text-sm" data-nonsense={String(marker.nonsense)}>
              {marker.nonsense ? words.verdict.nonsense : words.verdict.face}
            </p>
          </figure>
        </div>
      )}
      <p
        className="min-h-5 text-sm text-ink-soft"
        data-torn={newest && matches(state, newest) ? String(newest.torn) : ""}
      >
        {words.hint}
      </p>
    </div>
  );
}

/** Works out, a few faces at a time, how many of the fixed 12 × 12 check are nonsense. */
function useTornCheck(
  weights: Weights | null,
  faces: Uint8Array | null,
  view: MapWindow | null,
): number | null {
  const known = weights ? checked.get(weights) : undefined;
  const [, setFound] = useState(0);
  const counted = useRef<{ weights: Weights | null; bad: number }>({ weights: null, bad: 0 });
  const done = useSliced(
    weights && faces && view && known === undefined ? `check` : null,
    CHECK * CHECK,
    (index) => {
      if (!weights || !faces || !view) return;
      if (counted.current.weights !== weights) counted.current = { weights, bad: 0 };
      const picture = tileAt(weights, view, CHECK, index % CHECK, Math.floor(index / CHECK));
      if (isNonsense(picture, faces)) counted.current.bad += 1;
      if (index === CHECK * CHECK - 1) {
        checked.set(weights, counted.current.bad);
        setFound((value) => value + 1);
      }
    },
  );
  if (known !== undefined) return known;
  return done === CHECK * CHECK && weights ? (checked.get(weights) ?? null) : null;
}

function Mosaic({
  weights,
  view,
  spots,
  state,
  onMove,
}: {
  weights: Weights;
  view: MapWindow;
  spots: readonly (readonly [number, number])[];
  state: MapState;
  onMove: (x: number, y: number) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const table = useColourTable(inkTone);
  const { across } = state;
  const size = across * SIDE;
  const image = useRef<{ key: string; data: ImageData | null }>({ key: "", data: null });
  // The ends of the colour table change with the theme, so a new theme redraws the mosaic.
  const key = `${state.tidy}|${across}|${table[0]},${table[1]},${table[2]}|${table.at(-1)}`;
  const drawn = useSliced(key, across * across, (index) => {
    const context = canvas.current?.getContext("2d");
    if (!context) return;
    if (image.current.key !== key || !image.current.data) {
      image.current = { key, data: context.createImageData(SIDE, SIDE) };
      context.clearRect(0, 0, size, size);
    }
    const column = index % across;
    const row = Math.floor(index / across);
    const data = image.current.data;
    if (!data) return;
    paintPixels(tileAt(weights, view, across, column, row), table, data.data);
    context.putImageData(data, column * SIDE, row * SIDE);
  });
  const dots = useMemo(
    () =>
      spots
        .map((spot) => shareOf(view, spot))
        .filter(({ x, y }) => x >= 0 && x <= 1 && y >= 0 && y <= 1),
    [spots, view],
  );
  const box = useRef<HTMLDivElement>(null);
  const moveTo = ({ clientX, clientY }: DragPoint) => {
    const rect = box.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    onMove((clientX - rect.left) / rect.width, (clientY - rect.top) / rect.height);
  };
  const { ref, handlers } = useHoldDrag<HTMLDivElement>({ onDrag: moveTo, onTap: moveTo });
  const onKeyDown = (event: KeyboardEvent) => {
    const arrow = ARROWS[event.key];
    if (!arrow) return;
    event.preventDefault();
    onMove(state.x + arrow[0] * STEP, state.y + arrow[1] * STEP);
  };
  return (
    <figure className="flex flex-col gap-1">
      <div
        ref={(element) => {
          box.current = element;
          ref.current = element;
        }}
        {...handlers}
        tabIndex={0}
        role="group"
        aria-label={words.map.label}
        aria-roledescription={words.map.kind}
        onKeyDown={onKeyDown}
        data-drawn={drawn}
        className="relative aspect-square w-full max-w-md cursor-crosshair touch-pan-y overflow-hidden rounded-card border border-hairline bg-paper select-none"
      >
        <canvas
          ref={canvas}
          width={size}
          height={size}
          aria-hidden
          className="absolute inset-0 size-full"
        />
        <svg viewBox="0 0 100 100" aria-hidden className="absolute inset-0 size-full">
          {dots.map(({ x, y }, index) => (
            <circle
              key={index}
              cx={x * 100}
              cy={y * 100}
              r={0.7}
              fill="var(--color-paper)"
              stroke="var(--color-ink)"
              strokeWidth={0.3}
            />
          ))}
          <g data-marker transform={`translate(${state.x * 100} ${state.y * 100})`}>
            <circle r={4.5} fill="none" stroke="var(--color-paper)" strokeWidth={2.2} />
            <circle r={4.5} fill="none" stroke="var(--color-ink)" strokeWidth={1} />
            <path
              d="M-7 0H-2.5M2.5 0H7M0 -7V-2.5M0 2.5V7"
              stroke="var(--color-ink)"
              strokeWidth={1}
            />
          </g>
        </svg>
      </div>
      <figcaption className="flex flex-wrap gap-x-4 text-xs text-ink-soft">
        <span className="flex items-center gap-1">
          <svg viewBox="0 0 10 10" className="size-2.5" aria-hidden>
            <circle cx={5} cy={5} r={3} fill="var(--color-paper)" stroke="var(--color-ink)" />
          </svg>
          {words.map.dots}
        </span>
        <span className="flex items-center gap-1">
          <svg viewBox="0 0 10 10" className="size-2.5" aria-hidden>
            <circle cx={5} cy={5} r={3.5} fill="none" stroke="var(--color-ink)" />
          </svg>
          {words.map.marker}
        </span>
      </figcaption>
    </figure>
  );
}
