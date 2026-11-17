import type { Metadata } from "next";
import { platformCaptions } from "@/platform/captions";
import { PuzzlePage } from "./PuzzlePage";

export const metadata: Metadata = {
  title: platformCaptions.site.pageTitle(platformCaptions.puzzle.title),
};

export default function Page() {
  return <PuzzlePage />;
}
