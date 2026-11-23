import type { Metadata } from "next";
import { pages } from "@/experiences/shell/captions";
import { TheatrePage } from "@/experiences/theatre/TheatrePage";
import { platformCaptions } from "@/platform/captions";

export const metadata: Metadata = {
  title: platformCaptions.site.pageTitle(pages.theatre.title),
  description: pages.theatre.opening,
};

export default function Page() {
  return <TheatrePage />;
}
