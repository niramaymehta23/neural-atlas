import type { Metadata } from "next";
import { PuzzlePage } from "./PuzzlePage";

export const metadata: Metadata = { title: "Today’s puzzle · Neural Atlas" };

export default function Page() {
  return <PuzzlePage />;
}
