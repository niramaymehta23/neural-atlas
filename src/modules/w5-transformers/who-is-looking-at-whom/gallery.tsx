"use client";

import { thickness } from "@/design/encodings";
import { favourites, wordThreads, type Habit, type Reading } from "@/engine/pretrained/attention";
import { words } from "./captions";
import { FAINT } from "./threads";
import { readerName } from "./readers";

const WIDTH = 240;
const HEIGHT = 96;
const LINE = HEIGHT / 2;
const PAD = 12;

/** Every reader at this depth as a small card: its habit by name and its strongest threads. */
export function ReaderGallery({
  reading,
  depth,
  habits,
  onPick,
}: {
  reading: Reading;
  depth: number;
  habits: readonly Habit[];
  /** Picks a reader (1 to 12) for the big picture. */
  onPick: (reader: number) => void;
}) {
  return (
    <section className="flex flex-col gap-3" data-gallery>
      <p className="text-sm text-ink-soft">{words.gallery.heading}</p>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {[...Array(reading.heads).keys()].map((head) => {
          const name = readerName(habits[head], reading.words);
          return (
            <li key={head}>
              <button
                type="button"
                aria-label={words.gallery.pick(name)}
                onClick={() => onPick(head + 1)}
                className="flex w-full flex-col gap-1 rounded-card border border-hairline bg-card p-2 text-left text-xs hover:border-ink-soft"
                data-reader={head + 1}
              >
                <MiniThreads reading={reading} depth={depth} head={head} />
                <span className="text-ink-soft">{name}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** One reader's strongest thread from each word, as dots on a line: later words over, earlier under. */
function MiniThreads({ reading, depth, head }: { reading: Reading; depth: number; head: number }) {
  const threads = wordThreads(reading, depth - 1, head);
  const count = threads.words.length;
  const x = (index: number) =>
    count > 1 ? PAD + (index / (count - 1)) * (WIDTH - 2 * PAD) : WIDTH / 2;
  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" aria-hidden>
      {threads.looks.flatMap((row, from) =>
        favourites(threads, from, FAINT)
          .slice(0, 1)
          .map((to) => {
            const strength = row[to] ?? 0;
            const forward = to > from;
            const lift = Math.min(LINE - 6, 6 + Math.abs(x(to) - x(from)) * 0.3);
            const control = LINE + (forward ? -2 : 2) * lift;
            return (
              <path
                key={`${from}>${to}`}
                d={`M ${x(from)} ${LINE} Q ${(x(from) + x(to)) / 2} ${control} ${x(to)} ${LINE}`}
                fill="none"
                stroke="var(--color-ink-soft)"
                strokeOpacity={0.3 + 0.6 * strength}
                strokeWidth={thickness(strength) / 2}
                strokeLinecap="round"
              />
            );
          }),
      )}
      {threads.words.map((word, index) => (
        <circle key={`${word}-${index}`} cx={x(index)} cy={LINE} r={3} fill="var(--color-ink)" />
      ))}
    </svg>
  );
}
