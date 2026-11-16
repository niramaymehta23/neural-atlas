import type { Metadata } from "next";
import { ThemeSwitch } from "@/ui/ThemeSwitch";
import { Section } from "../Section";
import { BoardDemo, IdeaSpaceDemo, LandscapeDemo } from "./SceneDemos";
import { TrainingLab } from "./TrainingLab";
import { WiggleNetwork } from "./WiggleNetwork";

export const metadata: Metadata = { title: "Engines · Neural Atlas" };

export default function EnginesPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 pb-24">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-hairline bg-paper py-4">
        <p className="font-serif text-lg">Neural Atlas · engines</p>
        <ThemeSwitch />
      </header>
      <Section
        title="Training"
        note="Learning happens in a background worker; the page only draws. Scrub back, replay, or start a new try and race your ghost."
      >
        <TrainingLab />
      </Section>
      <Section
        title="NetworkView"
        note="Thicker threads pull harder; sage pushes up, rose pushes down. Dots flow faster on stronger threads."
      >
        <WiggleNetwork />
      </Section>
      <Section title="Board" note="Learning worlds are cosy board games, not 3D levels.">
        <BoardDemo />
      </Section>
      <Section
        title="LossLandscape"
        note="3D only where depth is the idea: higher and warmer means a bigger mistake."
      >
        <LandscapeDemo />
      </Section>
      <Section
        title="IdeaSpace"
        note="Similar ideas float close together. The view glides; nothing needs rotating."
      >
        <IdeaSpaceDemo />
      </Section>
    </main>
  );
}
