"use client";

import { useMemo, type DragEvent } from "react";
import { loadMatcher, loadWordPlaces } from "@/engine/language/files";
import { PHOTOS_PATH } from "@/engine/language/picture-words";
import { LanguageFileStatus } from "@/features/language/LanguageFileStatus";
import { both, useLanguageFile } from "@/features/language/use-language-file";
import { useShownFrame } from "@/features/language/use-shown-frame";
import type { ModuleViewProps } from "@/platform/contract";
import { CAPTIONS, PHOTOS, words } from "./captions";
import { fooled, frameOf, place, type PicturesFrame, type PicturesState } from "./model";

type Props = ModuleViewProps<PicturesState, PicturesFrame>;

const CHIP = "min-h-11 rounded-pill border px-3 py-1.5 text-sm md:min-h-0";

/** Caption chips to pick up, and the photos with the caption on each and the matcher's verdict. */
export function PicturesScene({ state, update, timeline, side }: Props) {
  const matcher = useLanguageFile(loadMatcher);
  const places = useLanguageFile(loadWordPlaces);
  const loaded = both(matcher, places);
  const ready = loaded.status === "ready" ? loaded.value : null;
  const frame = useMemo(() => (ready ? frameOf(ready[0], ready[1], state) : null), [ready, state]);
  useShownFrame(timeline, frame);
  const editable = side === "main";
  const holding = CAPTIONS[state.holding]?.text ?? null;

  const drop = (photo: number, caption: number) =>
    update(({ placed }) => ({ placed: place(placed, photo, caption), holding: -1 }));
  const onDrop = (photo: number) => (event: DragEvent) => {
    event.preventDefault();
    const caption = Number(event.dataTransfer.getData("text/plain"));
    if (Number.isInteger(caption) && CAPTIONS[caption]) drop(photo, caption);
  };

  return (
    <div className="flex grow flex-col gap-3" data-testid="pictures-and-words-together">
      {editable && (
        <section className="flex flex-col gap-1 text-sm">
          <p className="text-ink-soft">{words.captions}</p>
          <ul className="flex flex-wrap gap-2">
            {CAPTIONS.map((caption, at) => (
              <li key={caption.text}>
                <button
                  type="button"
                  draggable
                  aria-pressed={state.holding === at}
                  aria-label={words.pickUp(caption.text)}
                  data-caption={at}
                  onDragStart={(event) => event.dataTransfer.setData("text/plain", String(at))}
                  onClick={() => update({ holding: state.holding === at ? -1 : at })}
                  className={`${CHIP} ${state.holding === at ? "border-2 border-ink bg-card font-semibold" : "border-hairline bg-paper text-accent-ink"}`}
                >
                  {caption.text}
                </button>
              </li>
            ))}
          </ul>
          <p className="min-h-5 text-ink-soft">{holding ? words.holding(holding) : ""}</p>
        </section>
      )}
      {!ready || !frame ? (
        <LanguageFileStatus
          loaded={loaded.status === "ready" ? { status: "loading" } : loaded}
          words={words.model}
          className="min-h-96"
        />
      ) : (
        <ul className="grid min-h-96 grid-cols-2 gap-3 sm:grid-cols-3" data-photos>
          {PHOTOS.map((photo, at) => {
            const placement = frame.placements.find((entry) => entry.photo === at);
            const caption = placement ? CAPTIONS[placement.caption]?.text : undefined;
            return (
              <li
                key={photo.file}
                className="flex flex-col gap-1 text-sm"
                data-photo={at}
                data-match={placement?.match ? "" : undefined}
              >
                <button
                  type="button"
                  disabled={!editable || !holding}
                  aria-label={words.placeOn(photo.alt, holding)}
                  onClick={() => drop(at, state.holding)}
                  onDragOver={(event) => editable && event.preventDefault()}
                  onDrop={onDrop(at)}
                  className="aspect-square w-full rounded-card border border-hairline bg-inset bg-cover bg-center disabled:cursor-default"
                  style={{ backgroundImage: `url(${PHOTOS_PATH}${photo.file})` }}
                />
                <div className="flex min-h-20 flex-col gap-0.5">
                  {caption && placement ? (
                    <>
                      <p className="font-semibold">“{caption}”</p>
                      <p>
                        {words.verdict(placement.match)},{" "}
                        {words.truth(placement.match === placement.right)}
                      </p>
                      <p className="text-ink-soft">{words.closeness(placement.likeness)}</p>
                      {editable && (
                        <button
                          type="button"
                          aria-label={words.removeLabel(photo.alt)}
                          onClick={() =>
                            update(({ placed }) => ({
                              placed: placed.map((value, index) => (index === at ? -1 : value)),
                            }))
                          }
                          className="min-h-11 self-start text-xs text-accent-ink underline md:min-h-0"
                        >
                          {words.remove}
                        </button>
                      )}
                    </>
                  ) : (
                    <p className="text-ink-soft">{words.empty}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p
        className="min-h-5 text-sm font-semibold"
        data-fooled={frame && fooled(frame) ? "" : undefined}
      >
        {frame && fooled(frame) ? words.fooled : ""}
      </p>
    </div>
  );
}
