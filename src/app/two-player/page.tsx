import type { Metadata } from "next";
import { pages } from "@/experiences/shell/captions";
import { TwoPlayerPage } from "@/experiences/two-player/TwoPlayerPage";
import { platformCaptions } from "@/platform/captions";

export const metadata: Metadata = {
  title: platformCaptions.site.pageTitle(pages.twoPlayer.title),
  description: pages.twoPlayer.opening,
};

export default function Page() {
  return <TwoPlayerPage />;
}
