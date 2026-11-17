"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { count } from "@/design/copy";
import { classMark, classTone, markPath } from "@/design/encodings";
import { useRecordedRun } from "@/features/building/use-recorded-run";
import type { ModuleViewProps } from "@/platform/contract";
import { KINDS, words } from "./captions";
import {
  catNearer,
  keyOf,
  mapRun,
  middleOf,
  PICKED,
  placeOf,
  squashed,
  VOCABULARY,
  type MapFrame,
  type MapState,
} from "./model";

type Props = ModuleViewProps<MapState, MapFrame>;

const PICKED_AT = new Set(PICKED.map(({ at }) => at));
const OTHERS = VOCABULARY.map((_, at) => at).filter((at) => !PICKED_AT.has(at));
/** The map is drawn 0…200 each way around the picked words' middle, y upwards. */
const HALF = 90;

/** What the map shows, in words. */
export function mapLine(frame: Pick<MapFrame, "reach" | "gathered" | "places">) {
  if (squashed(frame)) return words.squashed;
  const total = count(PICKED.length);
  const gathered =
    frame.gathered === PICKED.length
      ? words.allGathered(total)
      : words.gathered(count(frame.gathered), total);
  return `${gathered} ${words.pair[catNearer(frame.places)]}`;
}

/** The word map: picked words marked by kind and named, the other words as small dots. */
export function MapScene(props: Props) {
  const { state, update, timeline } = props;
  const { failure } = useRecordedRun({
    ...props,
    runs: state.runs,
    work: mapRun,
    settings: keyOf(state),
    rerun: () => update(({ runs }) => ({ runs: runs + 1 }), { touch: false }),
  });
  const { cursor } = useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  const shown = state.runs > 0 ? timeline.at(cursor) : undefined;
  const ours = shown && shown.key === keyOf(state) ? shown : undefined;
  if (failure) throw failure;

  // The map zooms to fit the picked words, but never closer than a fixed size, so a squashed map
  // still looks squashed.
  const [mx, my] = ours ? middleOf(ours.places) : [0, 0];
  const scale = HALF / Math.max(1, (ours?.reach ?? 0) * 1.15);
  const toX = (x: number) => 100 + Math.max(-1.1 * HALF, Math.min(1.1 * HALF, (x - mx) * scale));
  const toY = (y: number) => 100 - Math.max(-1.1 * HALF, Math.min(1.1 * HALF, (y - my) * scale));

  return (
    <div
      className="flex grow flex-col gap-3"
      data-testid="meaning-as-places"
      data-epoch={ours?.epoch ?? 0}
    >
      <figure className="flex flex-col gap-1">
        <svg
          role="img"
          aria-label={words.picture}
          viewBox="0 0 200 200"
          className="mx-auto h-auto w-full max-w-md rounded-card border border-hairline bg-paper"
        >
          {ours &&
            OTHERS.map((at) => {
              const [x, y] = placeOf(ours.places, at);
              return (
                <circle key={at} cx={toX(x)} cy={toY(y)} r={1.2} fill="var(--color-hairline)" />
              );
            })}
          {ours &&
            PICKED.map(({ word, group, at }) => {
              const [x, y] = placeOf(ours.places, at);
              return (
                <g key={word} data-word={word}>
                  <path
                    d={markPath(classMark(group), toX(x), toY(y), 3)}
                    fill={classTone(group)}
                    stroke="var(--color-ink)"
                    strokeWidth={0.6}
                  />
                  <text
                    x={toX(x) + 4.5}
                    y={toY(y) + 2.5}
                    fontSize={7}
                    fill="var(--color-ink)"
                    aria-hidden
                  >
                    {word}
                  </text>
                </g>
              );
            })}
        </svg>
        <figcaption className="flex flex-wrap justify-center gap-x-4 text-xs text-ink-soft">
          {KINDS.map((kind, group) => (
            <KeyItem key={kind.name} label={kind.name}>
              <path
                d={markPath(classMark(group), 6, 6, 4)}
                fill={classTone(group)}
                stroke="var(--color-ink)"
              />
            </KeyItem>
          ))}
          <KeyItem label={words.key.other}>
            <circle
              cx={6}
              cy={6}
              r={2}
              fill="var(--color-hairline)"
              stroke="var(--color-ink-soft)"
            />
          </KeyItem>
        </figcaption>
      </figure>
      {/* Reserved lines, so the page does not jump when the words change. */}
      <p
        className="min-h-16 text-sm"
        data-map
        data-gathered={ours ? ours.gathered : undefined}
        data-squashed={ours && squashed(ours) ? "" : undefined}
      >
        {ours ? mapLine(ours) : words.waiting}
      </p>
    </div>
  );
}

function KeyItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1">
      <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
        {children}
      </svg>
      {label}
    </span>
  );
}
