import type { Metadata } from "next";
import { MuseumPage } from "@/experiences/museum/MuseumPage";
import { pages } from "@/experiences/shell/captions";
import { platformCaptions } from "@/platform/captions";

export const metadata: Metadata = {
  title: platformCaptions.site.pageTitle(pages.museum.title),
  description: pages.museum.opening,
};

export default function Page() {
  return <MuseumPage />;
}
