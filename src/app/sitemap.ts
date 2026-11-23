import type { MetadataRoute } from "next";
import { lessons } from "@/catalog";
import { JOURNEYS } from "@/experiences/journeys/journeys";
import { pages } from "@/experiences/shell/captions";

export const dynamic = "force-static";

/** The site's address; set NEXT_PUBLIC_SITE_URL to the real host when it is chosen. */
const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:4173").replace(/\/$/, "");

/** Every page worth finding: the map, today's puzzle, the experiences and each lesson. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    "/",
    "/puzzle",
    ...Object.values(pages).map(({ path }) => path),
    ...JOURNEYS.map((id) => `${pages.journeys.path}/${id}`),
    ...lessons.map(({ id }) => `/learn/${id}`),
  ].map((path) => ({
    url: `${SITE}${path === "/" ? "" : path}`,
  }));
}
