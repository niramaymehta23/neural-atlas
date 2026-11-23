"use client";

import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
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
  const path = usePathname();
  /** The card asked for, and the page it was asked for on: it never follows you to another. */
  const [asked, setAsked] = useState<{ id: string; path: string } | null>(null);
  const id = asked?.path === path ? asked.id : null;
  const [Loaded, setLoaded] = useState<Dialog | null>(null);
  const [failed, setFailed] = useState(false);
  const seen = useRef(new Set<string>());
  /** What had the focus when the first card opened, and gets it back when the last one closes. */
  const opener = useRef<Element | null>(null);

  const load = useCallback(() => {
    setFailed(false);
    cardConnection.load().then(
      (dialog) => setLoaded(() => dialog),
      () => setFailed(true),
    );
  }, []);
  const open = useCallback(
    (next: string) => {
      if (id === null) opener.current = document.activeElement;
      setAsked({ id: next, path });
      seen.current.add(next);
      load();
    },
    [load, id, path],
  );
  const close = useCallback(() => {
    setAsked(null);
    // Said once the card is out of the way, so the note is not hidden beneath it.
    if (seen.current.size >= CARDS_FOR_STAR) void award("words");
  }, []);
  const giveFocusBack = useCallback(() => {
    if (opener.current instanceof HTMLElement && opener.current.isConnected) opener.current.focus();
  }, []);

  // Back or Forward puts the card away, on the same page too (a journey's stops).
  useEffect(() => {
    window.addEventListener("popstate", close);
    return () => window.removeEventListener("popstate", close);
  }, [close]);

  return (
    <IdeaCardScope open={open}>
      {children}
      {id && Loaded && <Loaded id={id} onOpen={open} onClose={close} onClosed={giveFocusBack} />}
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
