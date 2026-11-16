import type { Metadata } from "next";
import { ThemeSwitch } from "@/ui/ThemeSwitch";
import { Section } from "../Section";
import { CompanionDemo } from "./CompanionDemo";
import { FixtureLesson, FixturePuzzle } from "./FixtureDemos";

export const metadata: Metadata = { title: "Platform · Neural Atlas" };

export default function PlatformPage() {
  return (
    <div className="pb-24">
      <header className="sticky top-0 z-10 mx-auto flex max-w-6xl items-center justify-between gap-4 border-b border-hairline bg-paper px-6 py-4">
        <p className="font-serif text-lg">Neural Atlas · platform</p>
        <ThemeSwitch />
      </header>
      <FixtureLesson />
      <div className="mx-auto max-w-6xl px-6">
        <Section
          title="Companion model"
          note="The learner's own network. Lessons upgrade it, and it stays put across pages and reloads."
        >
          <CompanionDemo />
        </Section>
        <Section
          title="Daily puzzle"
          note="One break-it mission a day, picked by date from the built lessons (here, the fixture)."
        >
          <FixturePuzzle />
        </Section>
      </div>
    </div>
  );
}
