"use client";

import {
  useCallback,
  useRef,
  useState,
  type ComponentProps,
  type ComponentType,
  type ReactNode,
} from "react";
import { platformCaptions } from "@/platform/captions";
import { IdeaCardScope } from "@/ui/glossary/idea-cards";
import { award } from "../achievements/achievements";
import { BUTTON } from "../shell/buttons";
import { shellCaptions } from "../shell/captions";
import type { IdeaCardDialog } from "./IdeaCardDialog";

const words = shellCaptions.card;

type Dialog = ComponentType<ComponentProps<typeof IdeaCardDialog>>;

/** Where the dialog's code comes from; tests make it fail. */
export const cardConnection = {
  load: (): Promise<Dialog> => import("./IdeaCardDialog").then((loaded) => loaded.IdeaCardDialog),
};

/** Different cards to open before the visit earns its star. */
export const CARDS_FOR_STAR = 3;

/**
 * Idea cards for everything beneath: captions open them, and the cards' code arrives with the
 * first one opened, so pages that open none pay nothing.
 */
export function IdeaCards({ children }: { children: ReactNode }) {
  const [id, setId] = useState<string | null>(null);
  const [Loaded, setLoaded] = useState<Dialog | null>(null);
  const [failed, setFailed] = useState(false);
  const seen = useRef(new Set<string>());

  const load = useCallback(() => {
    setFailed(false);
    cardConnection.load().then(
      (dialog) => setLoaded(() => dialog),
      () => setFailed(true),
    );
  }, []);
  const open = useCallback(
    (next: string) => {
      setId(next);
      seen.current.add(next);
      if (seen.current.size >= CARDS_FOR_STAR) void award("words");
      load();
    },
    [load],
  );
  const close = useCallback(() => setId(null), []);

  return (
    <IdeaCardScope open={open}>
      {children}
      {id && Loaded && <Loaded id={id} onOpen={open} onClose={close} />}
      {id && !Loaded && (
        <div
          role={failed ? "alert" : "status"}
          className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-md flex-wrap items-center gap-3 rounded-card border border-hairline bg-card p-4 text-sm text-ink"
        >
          <p>{failed ? words.failed : words.loading}</p>
          {failed && (
            <>
              <button type="button" className={BUTTON} onClick={load}>
                {platformCaptions.problem.retry}
              </button>
              <button type="button" className={BUTTON} onClick={close}>
                {words.close}
              </button>
            </>
          )}
        </div>
      )}
    </IdeaCardScope>
  );
}
