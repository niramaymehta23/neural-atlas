"use client";

import { lessons } from "@/catalog";
import { PuzzleView } from "@/platform/puzzle/PuzzleView";

export function PuzzlePage() {
  return <PuzzleView lessons={lessons} />;
}
