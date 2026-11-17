"use client";

import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { FaceModelStatus } from "@/features/generative/FaceModelStatus";
import { FacePicture } from "@/features/generative/FacePicture";
import { useFaceModel } from "@/features/generative/use-face-model";
import type { ModuleViewProps } from "@/platform/contract";
import { words } from "./captions";
import { FacePicker } from "./face-picker";
import {
  closenessOf,
  frameOf,
  matches,
  squeezeOf,
  type SqueezeFrame,
  type SqueezeState,
} from "./model";
import { NumberList } from "./number-list";

type Props = ModuleViewProps<SqueezeState, SqueezeFrame>;

/** The face going in, its short list of numbers, and the face drawn again from the kept ones. */
export function SqueezeScene({ state, update, timeline }: Props) {
  const model = useFaceModel("squeeze");
  const ready = model.status === "ready" ? model : null;
  const squeezed = useMemo(
    () => (ready ? squeezeOf(ready.weights, ready.kit.faces, state) : null),
    [ready, state],
  );
  const recorded = useRef(0);
  const { length } = useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  const newest = length > 0 ? timeline.at(length - 1) : undefined;

  // Every squeeze shown is recorded, so the mission and the guess judge what is on screen.
  useEffect(() => {
    if (!ready || !squeezed) return;
    recorded.current += 1;
    timeline.record(
      frameOf(ready.weights, ready.kit.faces, state, squeezed.rebuilt, recorded.current),
    );
  }, [ready, squeezed, state, timeline]);

  return (
    <div className="flex grow flex-col gap-3" data-testid="squeeze-and-rebuild">
      {!ready || !squeezed ? (
        <FaceModelStatus
          model={model.status === "ready" ? { status: "loading" } : model}
          words={words.model}
          className="min-h-72"
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <figure className="flex flex-col gap-1">
              <FacePicture
                picture={squeezed.input}
                label={words.picture.inputLabel}
                className="w-full max-w-56"
              />
              <figcaption className="text-xs text-ink-soft">{words.picture.input}</figcaption>
            </figure>
            <figure className="flex flex-col gap-1" data-rebuilt>
              <FacePicture
                picture={squeezed.rebuilt}
                label={words.picture.rebuiltLabel}
                className="w-full max-w-56"
              />
              <figcaption className="text-xs text-ink-soft">{words.picture.rebuilt}</figcaption>
            </figure>
          </div>
          <NumberList numbers={squeezed.numbers} keep={state.keep} />
          {/* Reserved lines, so the page does not jump when the words change. */}
          <div className="flex min-h-12 flex-col gap-1 text-sm">
            <Closeness state={state} frame={newest} />
          </div>
          <FacePicker
            faces={ready.kit.faces}
            chosen={state.face}
            onPick={(face) => update({ face })}
          />
        </>
      )}
    </div>
  );
}

function Closeness({ state, frame }: { state: SqueezeState; frame: SqueezeFrame | undefined }) {
  if (!frame || !matches(state, frame)) return null;
  return (
    <>
      <p data-closeness={closenessOf(frame.gap)}>{words.closeness[closenessOf(frame.gap)]}</p>
      {state.smudge >= 0.5 && frame.cleansSpeckles && (
        <p className="text-ink-soft" data-speckles-gone>
          {words.speckles}
        </p>
      )}
    </>
  );
}
