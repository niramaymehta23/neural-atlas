import type { Metadata } from "next";
import { journeyById, JOURNEYS } from "@/experiences/journeys/journeys";
import { JourneyById } from "@/experiences/journeys/JourneysPage";
import { platformCaptions } from "@/platform/captions";

type Props = { params: Promise<{ id: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return JOURNEYS.map((id) => ({ id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const journey = journeyById((await params).id);
  if (!journey) return {};
  return { title: platformCaptions.site.pageTitle(journey.title), description: journey.line };
}

export default async function Page({ params }: Props) {
  return <JourneyById id={(await params).id} />;
}
