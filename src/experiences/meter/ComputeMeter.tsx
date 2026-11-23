"use client";

import { sentenceStart } from "@/design/copy";
import { TermTag } from "@/ui/TermTag";
import { meterCaptions as words } from "./captions";

/**
 * A short reply from a big chatbot: GPT-3 has 175 billion weights, each used once per piece of
 * text it writes, and a short reply is about a hundred pieces (Brown et al., 2020).
 */
export const ONE_REPLY = 175e9 * 100;
/** Dots on the scale: ten to the power of each, up to the reply and one beyond. */
const DOTS = 15;

/** How far along the scale a count sits, in dots (0: none yet). */
export const dotsFor = (times: number) =>
  times < 1 ? 0 : Math.min(DOTS, Math.floor(Math.log10(times)) + 1);

type ComputeMeterProps = {
  /** Multiplications done so far, as the engines counted them. */
  times: number;
  /** Multiplications one answer takes, where learning and answering cost differently. */
  perAnswer?: number;
  /** It has taken steps, so a count of none means its learning needed none. */
  started?: boolean;
};

/** How much computing a run took, counted in the engines, next to one chatbot reply. */
export function ComputeMeter({ times, perAnswer, started = times > 0 }: ComputeMeterProps) {
  const filled = dotsFor(times);
  const reply = dotsFor(ONE_REPLY);
  return (
    <section
      aria-label={words.label}
      data-multiplications={times}
      className="flex flex-col gap-2 text-sm text-ink-soft"
    >
      <h3 className="font-sans text-sm font-medium text-ink">{words.label}</h3>
      <svg viewBox={`0 0 ${DOTS * 14} 16`} className="h-4 w-full max-w-64" aria-hidden>
        {Array.from({ length: DOTS }, (_, dot) => (
          <g key={dot}>
            <circle
              cx={dot * 14 + 8}
              cy={8}
              r={dot < filled ? 4 : 2}
              fill={dot < filled ? "var(--color-ink)" : "var(--color-ink-soft)"}
            />
            {dot === reply - 1 && (
              <circle
                cx={dot * 14 + 8}
                cy={8}
                r={6.5}
                fill="none"
                stroke="var(--color-ink)"
                strokeWidth={1.5}
              />
            )}
          </g>
        ))}
      </svg>
      <p className="min-h-[2lh]">
        {times > 0
          ? `${sentenceStart(words.so_far(times))} ${words.reply(ONE_REPLY / times)}`
          : started
            ? words.remembered
            : words.none}
        {started && perAnswer !== undefined && ` ${words.answer(perAnswer)}`}
      </p>
      <p>{words.scale}</p>
      {times > 0 && (
        <div>
          <TermTag term={words.term} lead={words.lead} />
        </div>
      )}
    </section>
  );
}
