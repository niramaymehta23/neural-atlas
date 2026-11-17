import { useRef } from "react";
import { PaperCard } from "@/ui/PaperCard";
import { platformCaptions } from "./captions";
import type { Choice } from "./contract";
import type { Guess } from "./module-store";

type PredictionCardProps = {
  question: string;
  choices: readonly Choice[];
  guess: Guess | undefined;
  /** The choice that is happening now, or null while it cannot be told yet. */
  answer: string | null;
  /** The guess in a link someone shared, shown beside the learner's own. */
  theirs?: Guess;
  onGuess: (choice: string) => void;
  onReveal: (answer: string) => void;
  /** Present when another prediction is waiting. */
  onNext?: () => void;
  /** Present while the card is asking for a guess before the first run. */
  onSkip?: () => void;
};

const words = platformCaptions.prediction;
const LINK =
  "min-h-11 self-start text-sm text-accent-ink underline-offset-4 hover:underline md:min-h-0";

export const choiceLabel = (choices: readonly Choice[], id: string) =>
  choices.find((choice) => choice.id === id)?.label ?? id;

/**
 * Predict, then reveal. A guess can change until the outcome starts to show, then it is locked
 * in; the reveal puts it beside what happened. Focus moves to the question after each step.
 */
export function PredictionCard({
  question,
  choices,
  guess,
  answer,
  theirs,
  onGuess,
  onReveal,
  onNext,
  onSkip,
}: PredictionCardProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  const focusHeading = () => requestAnimationFrame(() => heading.current?.focus());
  const locked = Boolean(guess && answer !== null);
  return (
    <PaperCard role="region" aria-label={words.label} className="flex flex-col gap-3">
      <p className="text-xs font-medium tracking-wide text-ink-soft uppercase">{words.label}</p>
      <h2 ref={heading} tabIndex={-1} className="font-serif text-lg leading-snug outline-none">
        {question}
      </h2>
      {onSkip && <p className="text-sm text-ink-soft">{words.first}</p>}
      {theirs && (
        <p className="text-sm text-ink-soft">{words.theirs(choiceLabel(choices, theirs.choice))}</p>
      )}
      {guess?.revealed && guess.answer !== undefined ? (
        <div className="flex flex-col items-start gap-1 text-sm" data-revealed>
          <p>{words.guessed(choiceLabel(choices, guess.choice))}</p>
          <p>{words.happened(choiceLabel(choices, guess.answer))}</p>
          <p className="text-ink-soft">
            {guess.choice === guess.answer ? words.right : words.wrong}
          </p>
          {onNext && (
            <button
              type="button"
              onClick={() => {
                onNext();
                focusHeading();
              }}
              className={`pt-1 ${LINK}`}
            >
              {words.next}
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {choices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                aria-pressed={guess?.choice === choice.id}
                disabled={locked}
                onClick={() => onGuess(choice.id)}
                className="min-h-11 rounded-pill border border-ink-soft px-3 py-1.5 text-sm aria-pressed:border-2 aria-pressed:border-accent-ink aria-pressed:bg-paper disabled:cursor-not-allowed md:min-h-0"
              >
                {choice.label}
              </button>
            ))}
          </div>
          {locked && <p className="text-sm text-ink-soft">{words.locked}</p>}
          {guess && (
            <button
              type="button"
              disabled={answer === null}
              onClick={() => {
                if (answer === null) return;
                onReveal(answer);
                focusHeading();
              }}
              className={`${LINK} disabled:text-ink-soft disabled:no-underline`}
            >
              {answer === null ? words.waiting : words.reveal}
            </button>
          )}
          {onSkip && !guess && (
            <button type="button" onClick={onSkip} className={LINK}>
              {words.skip}
            </button>
          )}
        </>
      )}
    </PaperCard>
  );
}
