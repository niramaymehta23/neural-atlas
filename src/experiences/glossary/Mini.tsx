"use client";

import { useState, type ReactNode } from "react";
import { classMark, classTone, markPath, valueTone } from "@/design/encodings";
import { createRandom } from "@/engine/random";
import { Slider } from "@/ui/Slider";
import { BUTTON } from "../shell/buttons";
import { glossaryCaptions } from "./captions";
import type { MiniSpec } from "./minis";

const words = glossaryCaptions.mini;
const WIDTH = 240;
const HEIGHT = 130;

/** Told when the learner first plays, which is when the real word may be said. */
type Touch = { onTouch: () => void };
type Of<K extends MiniSpec["kind"]> = Extract<MiniSpec, { kind: K }> & Touch;

function Picture({ label, children }: { label: string; children: ReactNode }) {
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full rounded-control border border-hairline bg-paper"
    >
      {children}
    </svg>
  );
}

const Said = ({ children }: { children: ReactNode }) => (
  <p aria-live="polite" className="min-h-[2lh] text-sm text-ink-soft">
    {children}
  </p>
);

type DialProps = Touch & {
  label: string;
  value: number;
  onChange: (value: number) => void;
  low: string;
  high: string;
};
const Dial = ({ label, value, onChange, low, high, onTouch }: DialProps) => (
  <Slider
    label={label}
    value={value}
    step={0.05}
    onChange={(next) => {
      onTouch();
      onChange(next);
    }}
    describe={(at) => (at < 0.5 ? low : high)}
  />
);

const Mark = ({ x, y, group }: { x: number; y: number; group: 0 | 1 }) => (
  <path
    d={markPath(classMark(group), x, y, 5.5)}
    fill={classTone(group)}
    stroke="var(--color-ink)"
    strokeWidth={1.2}
  />
);

const LINE_DOTS = [0.1, 0.2, 0.3, 0.45, 0.55, 0.7, 0.8, 0.92].map((x, index) => ({
  x: 10 + x * 220,
  y: 110 - x * 80 + (index % 2 ? 7 : -7),
}));
/** The tilt that fits best, on the dial. */
const BEST_TILT = 0.65;

function LineMini({ onTouch }: Of<"line">) {
  const [tilt, setTilt] = useState(0.2);
  const slope = (tilt / BEST_TILT) * (80 / 220);
  const at = (x: number) => 110 - (x - 10) * slope;
  const miss = Math.abs(tilt - BEST_TILT);
  return (
    <>
      <Picture label={words.lineLabel}>
        <line
          x1={10}
          y1={at(10)}
          x2={230}
          y2={at(230)}
          stroke="var(--color-ink)"
          strokeWidth={2.5}
        />
        {LINE_DOTS.map(({ x, y }) => (
          <g key={x}>
            <line
              x1={x}
              x2={x}
              y1={y}
              y2={at(x)}
              stroke="var(--color-ink-soft)"
              strokeDasharray="2 3"
            />
            <Mark x={x} y={y} group={0} />
          </g>
        ))}
      </Picture>
      <Dial
        label={words.line.dial}
        value={tilt}
        onChange={setTilt}
        low=""
        high=""
        onTouch={onTouch}
      />
      <Said>{miss < 0.08 ? words.line.best : miss < 0.25 ? words.line.close : words.line.far}</Said>
    </>
  );
}

const valleyAt = (x: number, bumpy: boolean) =>
  bumpy ? (x - 0.75) ** 2 * 1.6 + 0.12 * Math.sin(x * 17) + 0.1 : (x - 0.6) ** 2 * 2.2;
const slopeAt = (x: number, bumpy: boolean) =>
  (valleyAt(x + 0.001, bumpy) - valleyAt(x - 0.001, bumpy)) / 0.002;
const START = 0.06;

function ValleyMini({ bumpy = false, onTouch }: Of<"valley">) {
  const [size, setSize] = useState(0.25);
  const [at, setAt] = useState(START);
  const [last, setLast] = useState(0);
  const path = Array.from({ length: 61 }, (_, index) => {
    const x = index / 60;
    return `${index ? "L" : "M"}${10 + x * 220},${115 - valleyAt(x, Boolean(bumpy)) * 120}`;
  }).join("");
  const lowest = bumpy ? 0.83 : 0.6;
  const flat = Math.abs(slopeAt(at, Boolean(bumpy))) < 0.12;
  const said =
    at === START
      ? words.valley.ready
      : flat && Math.abs(at - lowest) < 0.12
        ? words.valley.bottom
        : flat
          ? words.valley.stuck
          : (at - lowest) * (last - lowest) < 0
            ? words.valley.over
            : words.valley.going;
  return (
    <>
      <Picture label={words.valley.label}>
        <path d={path} fill="none" stroke="var(--color-ink)" strokeWidth={2.5} />
        <circle
          cx={10 + at * 220}
          cy={107 - valleyAt(at, Boolean(bumpy)) * 120}
          r={8}
          fill="var(--color-accent)"
          stroke="var(--color-ink)"
          strokeWidth={2}
        />
      </Picture>
      <Dial
        label={words.valley.dial}
        value={size}
        onChange={setSize}
        low={words.valley.small}
        high={words.valley.big}
        onTouch={onTouch}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={BUTTON}
          onClick={() => {
            onTouch();
            setLast(at);
            const step = 0.02 + size * 0.4;
            setAt(Math.min(0.98, Math.max(0.02, at - slopeAt(at, Boolean(bumpy)) * step)));
          }}
        >
          {words.valley.step}
        </button>
        <button type="button" className={BUTTON} onClick={() => setAt(START)}>
          {words.valley.again}
        </button>
      </div>
      <Said>{said}</Said>
    </>
  );
}

function BarsMini({ labels, low, high, onTouch }: Of<"bars">) {
  const [sure, setSure] = useState(0.3);
  const raw = labels.map((_, index) => Math.exp(-index * sure * 4));
  const total = raw.reduce((sum, value) => sum + value, 0);
  return (
    <>
      <ul className="flex flex-col gap-2 rounded-control border border-hairline bg-paper p-3">
        {labels.map((label, index) => (
          <li key={label} className="grid grid-cols-[6.5rem_1fr] items-center gap-2 text-sm">
            <span>{label}</span>
            {/* The length follows a number, so it cannot be a class. */}
            <span
              className="h-4 rounded-control bg-ink-soft"
              style={{ width: `${Math.max(2, ((raw[index] ?? 0) / total) * 100)}%` }}
            />
          </li>
        ))}
      </ul>
      <Dial
        label={words.bars.dial}
        value={sure}
        onChange={setSure}
        low={low}
        high={high}
        onTouch={onTouch}
      />
    </>
  );
}

function MapMini({ places, onTouch }: Of<"map">) {
  const [from, setFrom] = useState<number | null>(null);
  const chosen = from === null ? undefined : places[from];
  const near = chosen
    ? places
        .filter((place) => place !== chosen)
        .map((place) => ({
          place,
          far: Math.hypot(place[1] - chosen[1], place[2] - chosen[2]),
        }))
        .sort((a, b) => a.far - b.far)[0]?.place
    : undefined;
  return (
    <>
      <div
        role="group"
        aria-label={words.map.label}
        className="relative h-44 rounded-control border border-hairline bg-paper"
      >
        {chosen && near && (
          <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="size-full">
            <line
              x1={chosen[1]}
              y1={chosen[2]}
              x2={near[1]}
              y2={near[2]}
              stroke="var(--color-ink)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        )}
        {places.map(([word, x, y], index) => (
          <button
            key={word}
            type="button"
            aria-pressed={from === index}
            // Where a word sits is data, so it cannot be a class.
            style={{ left: `${x}%`, top: `${y}%` }}
            className="absolute min-h-11 -translate-x-1/2 -translate-y-1/2 rounded-pill bg-card px-3 text-sm aria-pressed:outline-2 aria-pressed:outline-ink"
            onClick={() => {
              onTouch();
              setFrom(index);
            }}
          >
            {word}
          </button>
        ))}
      </div>
      <Said>{chosen && near ? words.map.near(chosen[0], near[0]) : words.map.start}</Said>
    </>
  );
}

function CellsMini({ ins, out, onTouch }: Of<"cells">) {
  const [on, setOn] = useState<readonly boolean[]>(ins.map(() => false));
  // The first voice is trusted most, the last pulls the other way.
  const trust = (index: number) => (index === ins.length - 1 ? -0.6 : 1 - index * 0.35);
  const total = on.reduce((sum, yes, index) => sum + (yes ? trust(index) : 0), 0);
  const says = total > 0.5;
  return (
    <>
      <Picture label={words.cells.label}>
        {ins.map((word, index) => {
          const y = 25 + index * 40;
          const pull = trust(index);
          return (
            <g key={word}>
              <line
                x1={50}
                y1={y}
                x2={180}
                y2={65}
                stroke="var(--color-ink)"
                strokeWidth={1 + Math.abs(pull) * 4}
                strokeDasharray={pull < 0 ? "6 4" : undefined}
                opacity={on[index] ? 1 : 0.3}
              />
              <circle
                cx={40}
                cy={y}
                r={10}
                fill={on[index] ? "var(--color-ink)" : "var(--color-card)"}
                stroke="var(--color-ink)"
                strokeWidth={2}
              />
            </g>
          );
        })}
        <circle
          cx={195}
          cy={65}
          r={20}
          fill={says ? "var(--color-accent)" : "var(--color-card)"}
          stroke="var(--color-ink)"
          strokeWidth={2}
        />
      </Picture>
      <div className="flex flex-wrap gap-2">
        {ins.map((word, index) => (
          <button
            key={word}
            type="button"
            aria-pressed={on[index]}
            className={`${BUTTON} aria-pressed:border-2 aria-pressed:border-ink`}
            onClick={() => {
              onTouch();
              setOn(on.map((yes, at) => (at === index ? !yes : yes)));
            }}
          >
            {(on[index] ? words.cells.on : words.cells.off)(word)}
          </button>
        ))}
      </div>
      <Said>{(says ? words.cells.yes : words.cells.no)(out)}</Said>
    </>
  );
}

const CURVE_DOTS = Array.from({ length: 12 }, (_, index) => {
  const x = index / 11;
  const noise = createRandom(index + 1).normal() * 0.09;
  return { x, y: 0.5 + 0.28 * Math.sin(x * 5.5) + noise };
});

/** A smooth average of the dots, over a narrower and narrower neighbourhood. */
function follow(x: number, freedom: number): number {
  const reach = 0.6 * (1 - freedom) ** 1.5 + 0.02;
  let sum = 0;
  let weight = 0;
  for (const dot of CURVE_DOTS) {
    const pull = Math.exp(-(((dot.x - x) / reach) ** 2));
    sum += pull * dot.y;
    weight += pull;
  }
  return weight > 0 ? sum / weight : 0.5;
}

function CurveMini({ low, high, onTouch }: Of<"curve">) {
  const [freedom, setFreedom] = useState(0.2);
  const path = Array.from({ length: 81 }, (_, index) => {
    const x = index / 80;
    return `${index ? "L" : "M"}${12 + x * 216},${120 - follow(x, freedom) * 110}`;
  }).join("");
  return (
    <>
      <Picture label={words.curve.label}>
        <path d={path} fill="none" stroke="var(--color-ink)" strokeWidth={2.5} />
        {CURVE_DOTS.map(({ x, y }) => (
          <Mark key={x} x={12 + x * 216} y={120 - y * 110} group={0} />
        ))}
      </Picture>
      <Dial
        label={`${low} / ${high}`}
        value={freedom}
        onChange={setFreedom}
        low={low}
        high={high}
        onTouch={onTouch}
      />
    </>
  );
}

const SIDE = 16;
/** A little boat on the sea: 0 is paper, 1 is ink. */
const BOAT = Array.from({ length: SIDE * SIDE }, (_, at) => {
  const x = at % SIDE;
  const y = Math.floor(at / SIDE);
  if (y >= 13) return 0.45;
  if (y >= 11 && x >= 3 + (y - 11) && x <= 12 - (y - 11)) return 0.9;
  if (x === 7 && y >= 2) return 0.9;
  if (x > 7 && y >= 3 && y <= 9 && x - 7 <= y - 2) return 0.65;
  if (x < 7 && y >= 4 && y <= 9 && 7 - x <= (y - 3) / 1.6) return 0.3;
  return 0;
});
const FOG = Array.from({ length: SIDE * SIDE }, (_, at) => createRandom(at + 40).next());
const shade = (x: number, y: number) =>
  x < 0 || y < 0 || x >= SIDE || y >= SIDE ? 0 : (BOAT[y * SIDE + x] ?? 0);

function pictureAt(effect: Extract<MiniSpec, { kind: "picture" }>["effect"], amount: number) {
  const tile = effect === "shrink" ? ([1, 2, 4, 8][Math.round(amount * 3)] ?? 1) : 1;
  return BOAT.map((ink, at) => {
    const x = at % SIDE;
    const y = Math.floor(at / SIDE);
    if (effect === "fog") return ink * (1 - amount) + (FOG[at] ?? 0) * amount;
    if (effect === "edges") {
      const edge = Math.min(
        1,
        Math.abs(shade(x + 1, y) - shade(x - 1, y)) + Math.abs(shade(x, y + 1) - shade(x, y - 1)),
      );
      return ink * (1 - amount) + edge * amount;
    }
    let sum = 0;
    const left = Math.floor(x / tile) * tile;
    const top = Math.floor(y / tile) * tile;
    for (let dy = 0; dy < tile; dy += 1)
      for (let dx = 0; dx < tile; dx += 1) sum += shade(left + dx, top + dy);
    return sum / (tile * tile);
  });
}

function PictureMini({ effect, low, high, onTouch }: Of<"picture">) {
  const [amount, setAmount] = useState(0);
  return (
    <>
      <svg
        role="img"
        aria-label={words.picture.label}
        viewBox={`0 0 ${SIDE} ${SIDE}`}
        className="mx-auto size-44 rounded-control border border-hairline bg-paper"
      >
        {pictureAt(effect, amount).map((ink, at) =>
          ink > 0.02 ? (
            <rect
              key={at}
              x={at % SIDE}
              y={Math.floor(at / SIDE)}
              width={1.02}
              height={1.02}
              fill="var(--color-ink)"
              opacity={Math.round(ink * 20) / 20}
            />
          ) : null,
        )}
      </svg>
      <Dial
        label={`${low} / ${high}`}
        value={amount}
        onChange={setAmount}
        low={low}
        high={high}
        onTouch={onTouch}
      />
    </>
  );
}

function ThreadsMini({ words: line, links, onTouch }: Of<"threads">) {
  const [from, setFrom] = useState<number | null>(null);
  const looks = from === null ? [] : (links[from] ?? []);
  return (
    <>
      <div className="flex flex-wrap gap-2 rounded-control border border-hairline bg-paper p-3">
        {line.map((word, index) => (
          <button
            key={word}
            type="button"
            aria-pressed={from === index}
            data-looked={looks.includes(index) || undefined}
            className="min-h-11 rounded-control border border-hairline bg-card px-3 text-sm aria-pressed:border-2 aria-pressed:border-ink data-looked:underline data-looked:decoration-2 data-looked:underline-offset-4"
            onClick={() => {
              onTouch();
              setFrom(index);
            }}
          >
            {word}
          </button>
        ))}
      </div>
      <Said>
        {from === null
          ? words.threads.start
          : words.threads.looks(
              line[from] ?? "",
              looks.map((at) => `“${line[at] ?? ""}”`).join(words.threads.and),
            )}
      </Said>
    </>
  );
}

function WindowMini({ words: line, low, high, onTouch }: Of<"window">) {
  const [amount, setAmount] = useState(0.5);
  const fits = Math.round(1 + amount * (line.length - 1));
  return (
    <>
      <p className="flex flex-wrap gap-2 rounded-control border border-hairline bg-paper p-3">
        {line.map((word, index) => {
          const seen = index >= line.length - fits;
          return (
            <span
              key={word}
              className={`rounded-control border px-2 py-1 text-sm ${seen ? "border-ink" : "border-dashed border-hairline text-ink-soft line-through"}`}
            >
              {word}
            </span>
          );
        })}
      </p>
      <Dial
        label={words.window.dial}
        value={amount}
        onChange={setAmount}
        low={low}
        high={high}
        onTouch={onTouch}
      />
      <Said>{words.window.seen(fits)}</Said>
    </>
  );
}

const COLUMNS = 6;
const ROWS = 3;
const BOWL = COLUMNS - 1;

function GlowMini({ low, high, onTouch }: Of<"glow">) {
  const [amount, setAmount] = useState(0.3);
  const keep = 0.1 + amount * 0.85;
  return (
    <>
      <Picture label={words.glow.label}>
        {Array.from({ length: COLUMNS * ROWS }, (_, cell) => {
          const x = cell % COLUMNS;
          const y = Math.floor(cell / COLUMNS);
          const steps = Math.abs(x - BOWL) + y;
          const value = keep ** steps;
          const size = 4 + value * 26;
          return (
            <g key={cell}>
              <rect
                x={6 + x * 39}
                y={6 + y * 40}
                width={35}
                height={36}
                rx={5}
                fill={valueTone(value)}
                stroke="var(--color-hairline)"
              />
              {/* Size says it too, so the glow does not rest on colour. */}
              {steps > 0 && (
                <circle
                  cx={23.5 + x * 39}
                  cy={24 + y * 40}
                  r={size / 2}
                  fill="none"
                  stroke="var(--color-ink)"
                  strokeWidth={1.2}
                />
              )}
              {steps === 0 && (
                <path
                  d={`M${12 + x * 39},${20 + y * 40}h23a11.5,11.5 0 0 1 -23,0z`}
                  fill="var(--color-card)"
                  stroke="var(--color-ink)"
                  strokeWidth={2}
                />
              )}
            </g>
          );
        })}
      </Picture>
      <Dial
        label={words.glow.dial}
        value={amount}
        onChange={setAmount}
        low={low}
        high={high}
        onTouch={onTouch}
      />
    </>
  );
}

function TriesMini({ options, odds, hit, miss, onTouch }: Of<"tries">) {
  const [random] = useState(() => createRandom(7));
  const [tally, setTally] = useState(options.map(() => ({ hits: 0, tries: 0 })));
  const [last, setLast] = useState<{ option: number; hit: boolean } | null>(null);
  return (
    <>
      <ul className="flex flex-col gap-2">
        {options.map((option, index) => {
          const { hits, tries } = tally[index] ?? { hits: 0, tries: 0 };
          return (
            <li key={option} className="flex flex-wrap items-center gap-3 text-sm">
              <button
                type="button"
                className={BUTTON}
                onClick={() => {
                  onTouch();
                  const won = random.next() < (odds[index] ?? 0);
                  setLast({ option: index, hit: won });
                  setTally(
                    tally.map((kept, at) =>
                      at === index
                        ? { hits: kept.hits + (won ? 1 : 0), tries: kept.tries + 1 }
                        : kept,
                    ),
                  );
                }}
              >
                {option}
              </button>
              <span className="text-ink-soft">
                {tries > 0 ? words.tries.tally(hits, tries) : ""}
              </span>
            </li>
          );
        })}
      </ul>
      <Said>{last ? (last.hit ? hit : miss) : words.tries.start}</Said>
    </>
  );
}

const FENCE_DOTS = Array.from({ length: 18 }, (_, index) => {
  const group: 0 | 1 = index % 2 ? 1 : 0;
  const random = createRandom(index + 9);
  return {
    group,
    x: (group ? 0.7 : 0.34) + (random.next() - 0.5) * 0.36,
    y: 0.1 + random.next() * 0.8,
  };
});

function FenceMini({ onTouch }: Of<"fence">) {
  const [fence, setFence] = useState(0.15);
  const wrong = FENCE_DOTS.filter(({ x, group }) => (x > fence ? 1 : 0) !== group).length;
  return (
    <>
      <Picture label={words.fence.label}>
        <line
          x1={fence * WIDTH}
          x2={fence * WIDTH}
          y1={0}
          y2={HEIGHT}
          stroke="var(--color-ink)"
          strokeWidth={3}
        />
        {FENCE_DOTS.map(({ x, y, group }, index) => (
          <Mark key={index} x={x * WIDTH} y={y * HEIGHT} group={group} />
        ))}
      </Picture>
      <Dial
        label={words.fence.dial}
        value={fence}
        onChange={setFence}
        low=""
        high=""
        onTouch={onTouch}
      />
      <Said>{words.fence.wrong(wrong)}</Said>
    </>
  );
}

function LoopMini({ steps, onTouch }: Of<"loop">) {
  const [at, setAt] = useState(0);
  return (
    <>
      <ol
        aria-label={words.loop.label}
        className="flex flex-col gap-2 rounded-control border border-hairline bg-paper p-3"
      >
        {steps.map((step, index) => (
          <li
            key={step}
            aria-current={index === at ? "step" : undefined}
            className="rounded-control border border-transparent px-3 py-1.5 text-sm text-ink-soft aria-[current=step]:border-ink aria-[current=step]:text-ink"
          >
            {step}
          </li>
        ))}
      </ol>
      <button
        type="button"
        className={`${BUTTON} self-start`}
        onClick={() => {
          onTouch();
          setAt((at + 1) % steps.length);
        }}
      >
        {words.loop.next}
      </button>
    </>
  );
}

/** The small thing to play with on an idea's card. */
export function Mini({ spec, onTouch }: { spec: MiniSpec } & Touch) {
  switch (spec.kind) {
    case "line":
      return <LineMini {...spec} onTouch={onTouch} />;
    case "valley":
      return <ValleyMini {...spec} onTouch={onTouch} />;
    case "bars":
      return <BarsMini {...spec} onTouch={onTouch} />;
    case "map":
      return <MapMini {...spec} onTouch={onTouch} />;
    case "cells":
      return <CellsMini {...spec} onTouch={onTouch} />;
    case "curve":
      return <CurveMini {...spec} onTouch={onTouch} />;
    case "picture":
      return <PictureMini {...spec} onTouch={onTouch} />;
    case "threads":
      return <ThreadsMini {...spec} onTouch={onTouch} />;
    case "window":
      return <WindowMini {...spec} onTouch={onTouch} />;
    case "glow":
      return <GlowMini {...spec} onTouch={onTouch} />;
    case "tries":
      return <TriesMini {...spec} onTouch={onTouch} />;
    case "fence":
      return <FenceMini {...spec} onTouch={onTouch} />;
    case "loop":
      return <LoopMini {...spec} onTouch={onTouch} />;
  }
}
