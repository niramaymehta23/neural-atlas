import type { Metadata } from "next";
import { ExplorePage } from "@/experiences/explore/ExplorePage";
import { pages } from "@/experiences/shell/captions";
import { platformCaptions } from "@/platform/captions";

export const metadata: Metadata = {
  title: platformCaptions.site.pageTitle(pages.explore.title),
  description: pages.explore.opening,
};

export default function Page() {
  return <ExplorePage />;
}
