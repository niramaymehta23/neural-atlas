"use client";

import { pages } from "../shell/captions";
import { PageFrame } from "../shell/ExperiencePage";
import { JourneyCards, JourneyPage } from "./JourneyPage";
import { journeyById, journeys } from "./journeys";

export function JourneysPage() {
  return (
    <PageFrame title={pages.journeys.title} opening={pages.journeys.opening}>
      <JourneyCards list={journeys} />
    </PageFrame>
  );
}

/** One journey by its id. */
export function JourneyById({ id }: { id: string }) {
  const journey = journeyById(id);
  return journey ? <JourneyPage journey={journey} /> : null;
}
