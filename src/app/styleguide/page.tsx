import type { Metadata } from "next";
import { Robot } from "@/ui/illustrations/Robot";
import { ThemeSwitch } from "@/ui/ThemeSwitch";
import { MotionDemo } from "./MotionDemo";
import { PrimitiveDemos } from "./PrimitiveDemos";
import { readTokens } from "./read-tokens";
import { Section } from "./Section";
import { TokenSections } from "./TokenSections";

export const metadata: Metadata = { title: "Style guide · Neural Atlas" };

export default function StyleguidePage() {
  return (
    <main className="mx-auto max-w-5xl px-6 pb-24">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-hairline bg-paper py-4">
        <p className="font-serif text-lg">Neural Atlas · style guide</p>
        <div className="flex items-center gap-4">
          <a
            href="/styleguide/engines"
            className="text-sm text-accent underline-offset-4 hover:underline"
          >
            Engines
          </a>
          <ThemeSwitch />
        </div>
      </header>

      <div className="flex flex-col items-start gap-6 py-14 sm:flex-row sm:items-center">
        <Robot />
        <div className="flex flex-col gap-3">
          <h1 className="text-5xl leading-tight">A book that moves</h1>
          <p className="max-w-prose text-ink-soft">
            Warm paper, one clay accent, gentle motion. Every token and building block lives here,
            in day and night.
          </p>
        </div>
      </div>

      <TokenSections tokens={readTokens()} />

      <Section
        title="Motion"
        note="Springs settle rather than snap. Reduced motion makes every change instant."
      >
        <MotionDemo />
      </Section>

      <Section
        title="Illustration"
        note="Cut-paper shapes with slightly uneven edges. The robot learner returns in every world."
      >
        <div className="flex gap-6">
          <Robot className="size-28" />
          <Robot className="size-20" title="Robot learner, small" />
        </div>
      </Section>

      <PrimitiveDemos />
    </main>
  );
}
