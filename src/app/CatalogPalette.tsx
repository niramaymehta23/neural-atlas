"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { lessons, worlds } from "@/catalog";
import { isMastered, useProgress } from "@/platform/progress/progress";
import { CommandPalette } from "@/ui/CommandPalette";

const worldTitle = (world: number) => worlds.find((entry) => entry.world === world)?.title ?? "";

/**
 * Cmd/Ctrl+K on every page: jump to any lesson. Found by everyday name, idea, what you play
 * with, world or real term; the real term shows only when it is what matched, or once learned.
 */
export function CatalogPalette() {
  const router = useRouter();
  const progress = useProgress(({ lessons }) => lessons);
  const items = useMemo(
    () =>
      lessons.map(({ id, title, realTerm, idea, playWith, world }) => ({
        id,
        label: title,
        hint: realTerm,
        keywords: [idea, playWith, worldTitle(world)],
        showHint: isMastered(progress[id]),
      })),
    [progress],
  );
  return <CommandPalette items={items} onSelect={(id) => router.push(`/learn/${id}`)} />;
}
