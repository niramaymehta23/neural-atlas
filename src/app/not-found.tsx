import type { Metadata } from "next";
import { platformCaptions } from "@/platform/captions";
import { ProblemPage } from "@/platform/ProblemPage";

const words = platformCaptions.notFound;

export const metadata: Metadata = { title: platformCaptions.site.pageTitle(words.pageTitle) };

export default function NotFound() {
  return <ProblemPage title={words.title} note={words.note} />;
}
