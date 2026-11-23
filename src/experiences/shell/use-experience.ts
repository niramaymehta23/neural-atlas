"use client";

import { useCallback, useEffect, useState } from "react";
import { useStore } from "zustand";
import type { LessonModule, ModuleState, Update } from "@/platform/contract";
import { createModuleStore, type ModuleStore } from "@/platform/module-store";
import { decodeSnapshot, snapshotFromHash, type DecodeFailure } from "@/platform/snapshot/snapshot";

/** What an experience keeps, and how a link's copy of it is made safe. */
export type ExperienceSpec<S extends ModuleState> = {
  /** Its name in links; a link made on another page opens as a fresh start. */
  id: string;
  initialState: S;
  parseState: (saved: S, initial: S) => S;
};

export type ExperienceView<S extends ModuleState> = {
  state: S;
  update: Update<S>;
};

type Opened = {
  /** The link this came from (null: none), so the same link is not opened twice. */
  link: string | null;
  problem: DecodeFailure | null;
  theirs: boolean;
};

/** The URL without its snapshot, keeping anything else in the hash. */
function dropSnapshot() {
  const params = new URLSearchParams(window.location.hash.slice(1));
  if (!params.has("s")) return;
  params.delete("s");
  const rest = params.toString();
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${window.location.search}${rest ? `#${rest}` : ""}`,
  );
}

/**
 * An experience's state: opened from the link in the address (decoded and clamped like a
 * lesson's), shown as somebody else's until it is changed, and shareable the same way. Links are
 * read again when the address changes under an open page.
 */
export function useExperience<S extends ModuleState>(spec: ExperienceSpec<S>) {
  const [store] = useState<ModuleStore<S>>(() => createModuleStore(spec.initialState));
  const state = useStore(store, (view) => view.state);
  const [opened, setOpened] = useState<Opened | null>(null);
  const [edits, setEdits] = useState(0);
  /** Counts fresh starts, so the page's parts can be mounted anew. */
  const [visit, setVisit] = useState(0);

  useEffect(() => {
    let latest = 0;
    const open = async () => {
      latest += 1;
      const turn = latest;
      const link = snapshotFromHash(window.location.hash);
      if (!link) {
        setOpened((now) => now ?? { link: null, problem: null, theirs: false });
        return;
      }
      const decoded = await decodeSnapshot(link, spec.id, {
        initialState: spec.initialState,
        // Experiences ask for no guesses; the decoder only looks guesses up in this list.
        predictions: [] as unknown as LessonModule["predictions"],
        parseState: spec.parseState as unknown as LessonModule["parseState"],
      });
      if (turn !== latest) return;
      store.restore({
        state: decoded.ok ? (decoded.snapshot.state as S) : spec.initialState,
        touched: false,
        guesses: {},
      });
      setVisit((count) => count + 1);
      setOpened({
        link,
        problem: decoded.ok ? null : decoded.reason,
        theirs: decoded.ok,
      });
    };
    void open();
    const onHash = () => void open();
    window.addEventListener("hashchange", onHash);
    return () => {
      latest = -1;
      window.removeEventListener("hashchange", onHash);
    };
  }, [spec, store]);

  const update = useCallback<Update<S>>(
    (change, options) => {
      if (options?.touch !== false) {
        dropSnapshot();
        setEdits((count) => count + 1);
        setOpened((now) =>
          now?.theirs || now?.problem ? { ...now, theirs: false, problem: null } : now,
        );
      }
      store.update(change, options);
    },
    [store],
  );

  const startOwn = useCallback(() => {
    dropSnapshot();
    store.restore({ state: spec.initialState, touched: false, guesses: {} });
    setVisit((count) => count + 1);
    setOpened({ link: null, problem: null, theirs: false });
  }, [spec, store]);

  return {
    ready: opened !== null,
    problem: opened?.problem ?? null,
    theirs: opened?.theirs ?? false,
    state,
    update,
    store,
    edits,
    visit,
    startOwn,
  };
}
