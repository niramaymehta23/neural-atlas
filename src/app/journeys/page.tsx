import type { Metadata } from "next";
import { JourneysPage } from "@/experiences/journeys/JourneysPage";
import { pages } from "@/experiences/shell/captions";
import { platformCaptions } from "@/platform/captions";

export const metadata: Metadata = {
  title: platformCaptions.site.pageTitle(pages.journeys.title),
  description: pages.journeys.opening,
};

export default function Page() {
  return <JourneysPage />;
}
