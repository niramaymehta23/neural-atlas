"use client";

import { useId } from "react";
import type { Camera, CameraState } from "./use-camera";
import { photoUrl } from "./use-photo";

export type PicturePickerWords = {
  /** The group's name, read by screen readers ("Pick a picture"). */
  label: string;
  /** Present when the lesson can use the camera. */
  camera?: {
    use: string;
    stop: string;
    ask: { title: string; body: string; yes: string; no: string };
    /** One plain line per state; empty for none. */
    states: Record<Exclude<CameraState, "asking">, string>;
  };
};

type Props = {
  photos: readonly { name: string; label: string }[];
  /** The photo picked, or "camera" while the camera is the picture. */
  value: string;
  onPick: (name: string) => void;
  words: PicturePickerWords;
  camera?: Camera;
  /** Called when the camera becomes (true) or stops being (false) the picture. */
  onCamera?: (on: boolean) => void;
};

export type CameraWords = NonNullable<PicturePickerWords["camera"]>;

/**
 * The camera's on/off button and state line, and the plain question asked before the browser is:
 * nothing is asked of the browser until the learner says yes here.
 */
export function CameraChoice({
  camera,
  words: cameraWords,
  onCamera,
}: {
  camera: Camera;
  words: CameraWords;
  onCamera?: (on: boolean) => void;
}) {
  const askId = useId();
  const state = camera.state;
  return (
    <div className="flex min-h-12 flex-col gap-2 text-sm">
      {state === "asking" ? (
        <div
          role="group"
          aria-labelledby={askId}
          className="flex flex-col gap-2 rounded-card border border-hairline bg-card p-3"
        >
          <p id={askId} className="font-medium">
            {cameraWords.ask.title}
          </p>
          <p className="text-ink-soft">{cameraWords.ask.body}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                camera.start();
                onCamera?.(true);
              }}
              className="min-h-11 rounded-pill bg-accent px-4 py-2 text-on-accent"
            >
              {cameraWords.ask.yes}
            </button>
            <button
              type="button"
              onClick={() => {
                camera.stop();
                onCamera?.(false);
              }}
              className="min-h-11 rounded-pill border border-hairline bg-paper px-4 py-2 text-accent-ink"
            >
              {cameraWords.ask.no}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {state === "on" || state === "starting" ? (
            <button
              type="button"
              onClick={() => {
                camera.stop();
                onCamera?.(false);
              }}
              className="min-h-11 rounded-pill border border-hairline bg-paper px-4 py-2 text-accent-ink"
            >
              {cameraWords.stop}
            </button>
          ) : (
            <button
              type="button"
              onClick={camera.ask}
              className="min-h-11 rounded-pill border border-hairline bg-paper px-4 py-2 text-accent-ink"
            >
              {cameraWords.use}
            </button>
          )}
          <p className="text-ink-soft" data-camera={state}>
            {cameraWords.states[state]}
          </p>
        </div>
      )}
    </div>
  );
}

const chip =
  "flex min-h-11 flex-col items-center gap-1 rounded-card border p-1 text-xs focus-visible:outline-2 focus-visible:outline-offset-2";

/**
 * Sample photos to pick from and, where a lesson allows it, the learner's camera. The camera is
 * asked for only after the learner agrees to a plain question on the page; saying no, a blocked
 * camera or no camera at all leaves the photos working as before.
 */
export function PicturePicker({ photos, value, onPick, words, camera, onCamera }: Props) {
  const cameraWords = words.camera;
  const showing = value === "camera";
  return (
    <div className="flex flex-col gap-2">
      <div role="radiogroup" aria-label={words.label} className="flex flex-wrap gap-2">
        {photos.map(({ name, label }) => {
          const chosen = value === name;
          return (
            <button
              key={name}
              type="button"
              role="radio"
              aria-checked={chosen}
              onClick={() => {
                if (showing) {
                  camera?.stop();
                  onCamera?.(false);
                }
                onPick(name);
              }}
              className={`${chip} ${chosen ? "border-ink bg-card font-medium" : "border-hairline bg-paper"}`}
            >
              <span
                aria-hidden
                className="size-12 rounded-sm bg-cover bg-center"
                style={{ backgroundImage: `url(${photoUrl(name)})` }}
              />
              <span>{label}</span>
              {chosen && <span className="sr-only">✓</span>}
            </button>
          );
        })}
      </div>
      {camera && cameraWords && (
        <CameraChoice camera={camera} words={cameraWords} onCamera={onCamera} />
      )}
    </div>
  );
}
