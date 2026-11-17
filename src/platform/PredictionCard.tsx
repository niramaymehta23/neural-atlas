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
  onGuess: (choice: string) => void;
  onReveal: (answer: string) => void;
  /** Present when another prediction is waiting. */
  onNext?: () => void;
};

const label = (choices: readonly Choice[], id: string) =>
  choices.find((choice) => choice.id === id)?.label ?? id;

/** Predict, then reveal: the guess is locked in before the result shows, then shown beside it. */
export function PredictionCard({
  question,
  choices,
  guess,
  answer,
  onGuess,
  onReveal,
  onNext,
}: PredictionCardProps) {
  const words = platformCaptions.prediction;
  return (
    <PaperCard role="region" aria-label={words.label} className="flex flex-col gap-3">
      <p className="text-xs font-medium tracking-wide text-ink-soft uppercase">{words.label}</p>
      <p className="font-serif text-lg leading-snug">{question}</p>
      {guess?.revealed && guess.answer !== undefined ? (
        <div role="status" className="flex flex-col items-start gap-1 text-sm">
          <p>{words.guessed(label(choices, guess.choice))}</p>
          <p>{words.happened(label(choices, guess.answer))}</p>
          <p className="text-ink-soft">
            {guess.choice === guess.answer ? words.right : words.wrong}
          </p>
          {onNext && (
            <button
              type="button"
              onClick={onNext}
              className="pt-1 text-accent-ink underline-offset-4 hover:underline"
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
                onClick={() => onGuess(choice.id)}
                className="rounded-pill border border-hairline px-3 py-1.5 text-sm aria-pressed:border-accent aria-pressed:bg-paper"
              >
                {choice.label}
              </button>
            ))}
          </div>
          {guess && (
            <button
              type="button"
              disabled={answer === null}
              onClick={() => answer !== null && onReveal(answer)}
              className="self-start text-sm text-accent-ink underline-offset-4 hover:underline disabled:text-ink-soft disabled:no-underline"
            >
              {answer === null ? words.waiting : words.reveal}
            </button>
          )}
        </>
      )}
    </PaperCard>
  );
}
