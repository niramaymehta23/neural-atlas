"use client";

import { useMemo } from "react";
import { loadWordPlaces } from "@/engine/language/files";
import { analogy, vectorOf, type WordPlaces } from "@/engine/language/word-places";
import { LanguageFileStatus } from "@/features/language/LanguageFileStatus";
import { useLanguageFile } from "@/features/language/use-language-file";
import { useShownFrame } from "@/features/language/use-shown-frame";
import type { ModuleViewProps } from "@/platform/contract";
import { WALKS, words } from "./captions";
import {
  flatMap,
  frameOf,
  MOST_LETTERS,
  startWords,
  tidy,
  unknownOf,
  type PlacesFrame,
  type PlacesState,
} from "./model";

type Props = ModuleViewProps<PlacesState, PlacesFrame>;

const BUTTON =
  "min-h-11 rounded-pill border border-hairline bg-paper px-3 py-1.5 text-sm text-accent-ink md:min-h-0";
const BOXES = ["from", "minus", "plus"] as const;
const WALK_KEYS = ["royal", "cities", "moving", "sizes"] as const;

/** Three word boxes, ready-made walks, the flat map and the nearest words to the landing spot. */
export function PlacesScene({ state, update, timeline, side }: Props) {
  const loaded = useLanguageFile(loadWordPlaces);
  const places = loaded.status === "ready" ? loaded.value : null;
  const frame = useMemo(() => (places ? frameOf(places, state) : null), [places, state]);
  useShownFrame(timeline, frame);
  const editable = side === "main";
  const unknown = places ? unknownOf(places, state) : [];

  return (
    <div className="flex grow flex-col gap-3" data-testid="words-as-places">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {BOXES.map((box) => (
          <label key={box} className="flex flex-col gap-1 text-sm">
            <span>{words[box]}</span>
            <input
              value={state[box]}
              maxLength={MOST_LETTERS}
              readOnly={!editable}
              autoCapitalize="none"
              spellCheck={false}
              data-box={box}
              onChange={(event) => update({ [box]: tidy(event.target.value) })}
              className="min-h-11 rounded-control border border-hairline bg-paper px-2 text-base"
            />
          </label>
        ))}
      </div>
      {editable && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-ink-soft">{words.walks.label}</span>
          {WALK_KEYS.map((key) => {
            const [from, minus, plus] = WALKS[key];
            return (
              <button
                key={key}
                type="button"
                className={BUTTON}
                data-walk={key}
                onClick={() => update({ from, minus, plus })}
              >
                {words.walks[key]}
              </button>
            );
          })}
        </div>
      )}
      {!places || !frame ? (
        <LanguageFileStatus
          loaded={loaded.status === "ready" ? { status: "loading" } : loaded}
          words={words.model}
          className="min-h-72"
        />
      ) : (
        <div className="grid min-h-72 grid-cols-1 gap-3 md:grid-cols-[3fr_2fr]">
          <FlatMap places={places} state={state} frame={frame} />
          <div className="flex flex-col gap-1 text-sm">
            <p className="font-semibold">{words.landing}</p>
            {state.from === "" || state.minus === "" || state.plus === "" ? (
              <p className="text-ink-soft">{words.empty}</p>
            ) : unknown.length > 0 ? (
              <p data-unknown className="text-ink-soft">
                {words.unknown(unknown.map((word) => `“${word}”`).join(", "))}
              </p>
            ) : (
              <ol data-landing className="flex flex-col gap-1">
                {frame.landing.map(({ word, likeness }, at) => (
                  <li
                    key={word}
                    data-word={word}
                    className={`flex justify-between gap-2 rounded-inner border px-2 py-1 ${
                      at === 0 ? "border-2 border-ink bg-card font-semibold" : "border-hairline"
                    }`}
                  >
                    <span>
                      {word}
                      {startWords(state).includes(word) && (
                        <span className="font-normal text-ink-soft"> ({words.start})</span>
                      )}
                    </span>
                    <span className="font-normal text-ink-soft">{words.closeness(likeness)}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const SIZE = 320;
const PAD = 40;

/** The three start words, the landing star and its nearest words on one flat slice of the map. */
function FlatMap({
  places,
  state,
  frame,
}: {
  places: WordPlaces;
  state: PlacesState;
  frame: Omit<PlacesFrame, "epoch">;
}) {
  const project = flatMap(places, state);
  const landing = analogy(places, state.from, state.minus, state.plus, state.amount);
  if (!project || !landing) return <div aria-hidden className="min-h-72" />;
  const points = [
    ...startWords(state).map((word) => ({ word, kind: "start" as const })),
    ...frame.landing
      .filter(({ word }) => !startWords(state).includes(word))
      .map(({ word }) => ({ word, kind: "near" as const })),
  ].flatMap(({ word, kind }) => {
    const vector = vectorOf(places, word);
    return vector ? [{ word, kind, ...project(vector) }] : [];
  });
  const land = project(landing);
  const all = [...points, land];
  const xs = all.map((point) => point.x);
  const ys = all.map((point) => point.y);
  const [minX, maxX, minY, maxY] = [
    Math.min(...xs),
    Math.max(...xs),
    Math.min(...ys),
    Math.max(...ys),
  ];
  const span = Math.max(maxX - minX, maxY - minY, 0.1);
  const at = (point: { x: number; y: number }) => ({
    x: PAD + ((point.x - minX) / span) * (SIZE - 2 * PAD),
    y: SIZE - PAD - ((point.y - minY) / span) * (SIZE - 2 * PAD),
  });
  const spot = (word: string) => at(points.find((point) => point.word === word) ?? land);
  const [tail, head, start, end] = [
    spot(state.minus),
    spot(state.plus),
    spot(state.from),
    at(land),
  ];

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="img"
      aria-label={words.picture}
      className="h-auto w-full max-w-md rounded-card border border-hairline bg-paper"
    >
      <defs>
        <marker
          id="places-head"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path d="M0 0 L10 5 L0 10 z" className="fill-ink" />
        </marker>
      </defs>
      <line
        x1={tail.x}
        y1={tail.y}
        x2={head.x}
        y2={head.y}
        className="stroke-ink-soft"
        strokeWidth={2}
        strokeDasharray="6 4"
        markerEnd="url(#places-head)"
      />
      {state.amount > 0.01 && (
        <line
          x1={start.x}
          y1={start.y}
          x2={end.x}
          y2={end.y}
          className="stroke-ink"
          strokeWidth={2.5}
          markerEnd="url(#places-head)"
        />
      )}
      {points.map((point) => {
        const { x, y } = at(point);
        return (
          <g key={point.word} data-point={point.kind}>
            {point.kind === "start" ? (
              <circle cx={x} cy={y} r={6} className="fill-accent stroke-ink" strokeWidth={1.5} />
            ) : (
              <rect
                x={x - 4}
                y={y - 4}
                width={8}
                height={8}
                className="fill-flow stroke-ink-soft"
              />
            )}
            <text x={x + 9} y={y - 7} className="fill-ink text-[13px]">
              {point.word}
            </text>
          </g>
        );
      })}
      <path
        data-point="landing"
        d={star(end.x, end.y, 10, 4.5)}
        className="fill-sand stroke-ink"
        strokeWidth={1.5}
      />
      <text x={end.x + 12} y={end.y + 16} className="fill-ink-soft text-[12px]">
        {words.landed}
      </text>
    </svg>
  );
}

function star(cx: number, cy: number, outer: number, inner: number) {
  return (
    Array.from({ length: 10 }, (_, at) => {
      const radius = at % 2 === 0 ? outer : inner;
      const angle = (Math.PI / 5) * at - Math.PI / 2;
      return `${at === 0 ? "M" : "L"}${(cx + radius * Math.cos(angle)).toFixed(1)} ${(cy + radius * Math.sin(angle)).toFixed(1)}`;
    }).join(" ") + " Z"
  );
}
