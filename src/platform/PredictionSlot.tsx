"use client";

import { useState, useSyncExternalStore } from "react";
import { useStore } from "zustand";
import type { Timeline } from "@/engine/timeline/timeline";
import { platformCaptions } from "./captions";
import type { LessonModule, TimelineFrame } from "./contract";
import type { Guess, ModuleStore } from "./module-store";
import { choiceLabel, PredictionCard } from "./PredictionCard";

type PredictionSlotProps = {
  predictions: LessonModule["predictions"];
  store: ModuleStore;
  timeline: Timeline<TimelineFrame>;
  /** Guesses from a shared link, shown as theirs. */
  theirs: Record<string, Guess>;
  /** Writes into the shell's one status region. */
  announce: (message: string) => void;
  onRevealed: () => void;
  /** Present while the card should ask for a guess before the first run. */
  onSkip?: () => void;
};

const words = platformCaptions.prediction;

/**
 * The prediction card, kept apart from the shell so that it alone follows the newest recorded
 * moment (its answer depends on it) and the rest of the lesson does not re-render every frame.
 */
export function PredictionSlot({
  predictions,
  store,
  timeline,
  theirs,
  announce,
  onRevealed,
  onSkip,
}: PredictionSlotProps) {
  const { length, run } = useSyncExternalStore(
    timeline.subscribe,
    timeline.getState,
    timeline.getState,
  );
  const { state, guesses } = useStore(store);
  const [justRevealed, setJustRevealed] = useState<string | null>(null);
  /** For guesses about the next run: the run that was on screen when each guess was placed. */
  const [guessedDuring, setGuessedDuring] = useState<Record<string, number>>({});
  const waiting = predictions.find(({ id }) => !guesses[id]?.revealed);
  const prediction =
    predictions.find(({ id }) => id === justRevealed) ?? waiting ?? predictions.at(-1);
  if (!prediction) return null;
  const frame = timeline.at(length - 1);
  const stale = prediction.fresh && guessedDuring[prediction.id] === run;
  let answer: string | null;
  try {
    answer = stale ? null : prediction.answer(state, frame);
  } catch {
    answer = null; // A broken answer keeps the reveal waiting rather than blanking the lesson.
  }
  return (
    <div data-prediction={prediction.id}>
      <PredictionCard
        question={prediction.question}
        choices={prediction.choices}
        guess={guesses[prediction.id]}
        answer={answer}
        theirs={theirs[prediction.id]}
        onGuess={(choice) => {
          if (length > 0) setGuessedDuring((during) => ({ ...during, [prediction.id]: run }));
          store.guess(prediction.id, choice);
        }}
        onReveal={(happened) => {
          const guess = guesses[prediction.id];
          store.reveal(prediction.id, happened);
          setJustRevealed(prediction.id);
          onRevealed();
          if (guess) {
            const label = (id: string) => choiceLabel(prediction.choices, id);
            announce(
              [
                words.guessed(label(guess.choice)),
                words.happened(label(happened)),
                guess.choice === happened ? words.right : words.wrong,
              ].join(" "),
            );
          }
        }}
        onNext={
          justRevealed === prediction.id && waiting && waiting.id !== prediction.id
            ? () => setJustRevealed(null)
            : undefined
        }
        onSkip={onSkip}
      />
    </div>
  );
}
