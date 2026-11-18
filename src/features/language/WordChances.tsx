"use client";

export type WordChance = {
  word: string;
  /** 0 to 1. */
  chance: number;
  /** The word just picked: drawn with a heavier outline and named in words. */
  picked?: boolean;
};

export type WordChancesWords = {
  /** What the list is, read by screen readers. */
  label: string;
  /** A chance in words, such as "about 9 in 10". */
  say: (chance: number) => string;
  /** Said after the picked word's chance. */
  picked: string;
};

/**
 * The next-word chances as a list of bars: a bar's length is its chance, every bar names its word
 * and its chance in words, and the picked word is outlined and named, never marked by colour
 * alone. Rows keep their height, so changing chances never moves the page.
 */
export function WordChances({
  chances,
  words,
}: {
  chances: readonly WordChance[];
  words: WordChancesWords;
}) {
  return (
    <ol aria-label={words.label} className="flex flex-col gap-1" data-chances>
      {chances.map(({ word, chance, picked }) => (
        <li
          key={word}
          data-word={word}
          data-chance={chance.toFixed(4)}
          data-picked={picked ? "" : undefined}
          className="grid min-h-7 grid-cols-[5.5rem_1fr_6.5rem] items-center gap-2 text-sm"
        >
          <span className={`truncate ${picked ? "font-semibold" : ""}`}>{word}</span>
          <span aria-hidden className="relative h-4 rounded-pill bg-inset">
            <span
              className={`absolute inset-y-0 left-0 rounded-pill ${picked ? "border-2 border-ink bg-accent" : "bg-flow"}`}
              style={{ width: `${Math.max(2, Math.round(chance * 100))}%` }}
            />
          </span>
          <span className="text-xs text-ink-soft">
            {words.say(chance)}
            {picked ? <span className="block font-semibold text-ink">{words.picked}</span> : null}
          </span>
        </li>
      ))}
    </ol>
  );
}
