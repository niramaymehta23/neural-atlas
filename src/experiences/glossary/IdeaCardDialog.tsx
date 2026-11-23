"use client";

import Link from "next/link";
import { Dialog } from "radix-ui";
import { useState } from "react";
import { lessonById, lessons } from "@/catalog";
import { LessonErrorBoundary } from "@/platform/LessonErrorBoundary";
import { TermTag } from "@/ui/TermTag";
import { BUTTON, LINK } from "../shell/buttons";
import { shellCaptions } from "../shell/captions";
import { glossaryCaptions as words, ideaCards } from "./captions";
import { Mini } from "./Mini";

/** Ideas close by: what this one rests on, then what rests on it. */
export function nearby(id: string): string[] {
  const before = lessonById(id)?.prerequisites ?? [];
  const after = lessons.filter(({ prerequisites }) => prerequisites.includes(id));
  return [...new Set([...before, ...after.map((lesson) => lesson.id)])].slice(0, 4);
}

type IdeaCardDialogProps = {
  id: string;
  onOpen: (id: string) => void;
  onClose: () => void;
};

/** One idea on a card: a line about it, a small thing to try, and then its real name. */
export function IdeaCardDialog({ id, onOpen, onClose }: IdeaCardDialogProps) {
  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-scrim" />
        <Dialog.Content
          aria-describedby={undefined}
          data-card={id}
          className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-card border border-hairline bg-card p-5 text-ink outline-none sm:top-[8vh] sm:bottom-auto sm:max-h-[84vh] sm:rounded-card"
        >
          <Card key={id} id={id} onOpen={onOpen} onClose={onClose} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Card({ id, onOpen, onClose }: IdeaCardDialogProps) {
  const [touched, setTouched] = useState(false);
  const lesson = lessonById(id);
  const card = ideaCards[id];
  if (!lesson || !card) return null;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <Dialog.Title className="text-2xl leading-tight">{lesson.title}</Dialog.Title>
        <Dialog.Close
          aria-label={shellCaptions.card.close}
          className="grid size-11 shrink-0 place-items-center rounded-pill border border-hairline bg-paper"
        >
          <span aria-hidden>✕</span>
        </Dialog.Close>
      </div>
      <p className="text-lg">{card.idea}</p>
      <section aria-label={words.tryIt} className="flex flex-col gap-3">
        <LessonErrorBoundary className="min-h-40">
          <Mini spec={card.mini} onTouch={() => setTouched(true)} />
        </LessonErrorBoundary>
      </section>
      <div className="min-h-9">
        {touched && <TermTag lead={words.lead} term={lesson.realTerm} />}
      </div>
      <Link
        href={`/learn/${id}`}
        onClick={onClose}
        className={`inline-flex min-h-11 items-center self-start text-sm ${LINK}`}
      >
        {words.open(lesson.title)}
      </Link>
      <nav aria-label={words.nearby} className="flex flex-col gap-2">
        <p className="text-sm text-ink-soft">{words.nearby}</p>
        <div className="flex flex-wrap gap-2">
          {nearby(id).map((near) => (
            <button key={near} type="button" className={BUTTON} onClick={() => onOpen(near)}>
              {lessonById(near)?.title}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
