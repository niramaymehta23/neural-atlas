"use client";

import { useMemo, useRef, type KeyboardEvent } from "react";
import { faceAt } from "@/engine/generative/faces";
import { FacePicture } from "@/features/generative/FacePicture";
import { words } from "./captions";
import { FACES } from "./model";

const STEPS: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

/** The stored faces as a row of radio buttons; arrow keys move the choice, as in any radio group. */
export function FacePicker({
  faces,
  chosen,
  onPick,
}: {
  faces: Uint8Array;
  chosen: number;
  onPick: (face: number) => void;
}) {
  const pictures = useMemo(
    () => Array.from({ length: FACES }, (_, index) => faceAt(faces, index)),
    [faces],
  );
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (event: KeyboardEvent) => {
    const step = STEPS[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const next = (chosen + step + FACES) % FACES;
    onPick(next);
    buttons.current[next]?.focus();
  };
  return (
    <div
      role="radiogroup"
      aria-label={words.faces.label}
      onKeyDown={onKeyDown}
      className="grid grid-cols-6 gap-1.5 sm:grid-cols-12"
    >
      {pictures.map((picture, index) => (
        <button
          key={index}
          ref={(button) => {
            buttons.current[index] = button;
          }}
          type="button"
          role="radio"
          aria-checked={index === chosen}
          aria-label={words.faces.face(index + 1)}
          tabIndex={index === chosen ? 0 : -1}
          onClick={() => onPick(index)}
          // The chosen face is raised with a thick ring, not just a colour.
          className={`rounded-card p-0.5 ${index === chosen ? "ring-3 ring-ink" : "opacity-70 hover:opacity-100"}`}
        >
          <FacePicture picture={picture} className="pointer-events-none w-full" />
        </button>
      ))}
    </div>
  );
}
