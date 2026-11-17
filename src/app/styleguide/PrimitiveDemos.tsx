"use client";

import { useState } from "react";
import { count, outOf } from "@/design/copy";
import { CompareSplit } from "@/ui/CompareSplit";
import { Dial } from "@/ui/Dial";
import { HoverNote } from "@/ui/HoverNote";
import { MissionCard } from "@/ui/MissionCard";
import { PaperCard } from "@/ui/PaperCard";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { Slider } from "@/ui/Slider";
import { StoryCaption } from "@/ui/StoryCaption";
import { TermTag } from "@/ui/TermTag";
import { Toggle } from "@/ui/Toggle";
import { UnderTheHoodDrawer } from "@/ui/UnderTheHoodDrawer";
import { Section } from "./Section";

const STEP_WORDS = ["tiny", "small", "medium", "big", "huge"];
const SHAPES = [
  { value: "round", label: "Round" },
  { value: "pointy", label: "Pointy" },
  { value: "wobbly", label: "Wobbly" },
] as const;

function stepWords(value: number): string {
  return `a ${STEP_WORDS[Math.min(STEP_WORDS.length - 1, Math.floor(value * STEP_WORDS.length))]} step`;
}

function Dots({ tone }: { tone: "bg-flow" | "bg-good" }) {
  return (
    <div className="grid h-full grid-cols-6 place-items-center gap-2 p-10">
      {Array.from({ length: 18 }, (_, index) => (
        <span
          key={index}
          className={`size-3 rounded-pill ${tone}`}
          style={{ opacity: 0.35 + ((index * 7) % 10) / 15 }}
        />
      ))}
    </div>
  );
}

export function PrimitiveDemos() {
  const [lifted, setLifted] = useState(false);
  const [stepSize, setStepSize] = useState(0.4);
  const [examples, setExamples] = useState(0.6);
  const [forgetting, setForgetting] = useState(false);
  const [shape, setShape] = useState<(typeof SHAPES)[number]["value"]>("round");
  const [touched, setTouched] = useState(false);
  const [missionDone, setMissionDone] = useState(false);

  return (
    <>
      <Section
        title="PaperCard"
        note="Flat paper with a hairline edge. It lifts only while dragged."
      >
        <PaperCard lifted={lifted} className="max-w-sm">
          <p className="mb-4 text-sm text-ink-soft">
            {lifted ? "Being dragged: a soft shadow." : "Resting: flat."}
          </p>
          <Toggle label="Pretend it is being dragged" checked={lifted} onChange={setLifted} />
        </PaperCard>
      </Section>

      <Section
        title="Dial"
        note="A knob with a plain name. Drag up or down, or use the arrow keys."
      >
        <Dial label="How big a step" value={stepSize} onChange={setStepSize} describe={stepWords} />
      </Section>

      <Section title="Slider" note="For settings that read naturally left to right.">
        <div className="w-full max-w-sm">
          <Slider
            label="How many examples"
            value={examples}
            onChange={setExamples}
            describe={(value) => count(Math.round(value * 1000))}
          />
        </div>
      </Section>

      <Section title="Toggle" note="On or off, with a plain name.">
        <Toggle label="Let it forget a little" checked={forgetting} onChange={setForgetting} />
      </Section>

      <Section title="SegmentedControl" note="Pick one of a few choices.">
        <SegmentedControl label="Fruit shape" options={SHAPES} value={shape} onChange={setShape} />
      </Section>

      <Section title="HoverNote" note="One plain sentence on hover or focus.">
        <HoverNote note="This dot is one tiny voter. Right now it is fairly sure the fruit is an apple.">
          <button type="button" aria-label="A neuron" className="size-8 rounded-pill bg-flow" />
        </HoverNote>
      </Section>

      <Section title="StoryCaption" note="Appears only after the first touch.">
        <PaperCard className="flex w-full max-w-lg flex-col gap-4">
          <button
            type="button"
            onClick={() => setTouched(true)}
            className="self-start rounded-pill border border-hairline bg-paper px-4 py-2 text-sm text-accent-ink"
          >
            Nudge the dot
          </button>
          <StoryCaption shown={touched}>
            You nudged it, and the whole line leaned with it.
          </StoryCaption>
        </PaperCard>
      </Section>

      <Section title="TermTag" note="The real name, shown only at the end.">
        <TermTag term="gradient descent" />
      </Section>

      <Section
        title="MissionCard"
        note="A goal in the corner, a hint on request, a quiet tick when done."
      >
        <div className="flex flex-col gap-4">
          <MissionCard
            goal="Make it forget everything it learned"
            done={missionDone}
            hint="Try a really big step and watch what happens."
          />
          <Toggle label="Mark the mission done" checked={missionDone} onChange={setMissionDone} />
        </div>
      </Section>

      <Section title="UnderTheHoodDrawer" note="Closed by default, for the curious.">
        <div className="w-full max-w-lg">
          <UnderTheHoodDrawer>
            Each step, the ball checks which way is downhill and rolls a little that way. The step
            size decides how far.
          </UnderTheHoodDrawer>
        </div>
      </Section>

      <Section
        title="CommandPalette"
        note="It lives on every page, fed by the catalog: press Ctrl K (⌘ K on a Mac) or use the button in the corner, then type an everyday name or a real term."
      >
        <p className="text-sm text-ink-soft">Try “downhill” or “attention”.</p>
      </Section>

      <Section
        title="CompareSplit"
        note="Two settings side by side. Drag the divider or use the arrow keys."
      >
        <CompareSplit
          label="Compare a small step with a big step"
          leftLabel="Small step"
          rightLabel="Big step"
          left={<Dots tone="bg-flow" />}
          right={<Dots tone="bg-good" />}
          className="h-56 w-full max-w-2xl"
        />
        <p className="text-sm text-ink-soft">
          {outOf(0.92, { noun: "sorted right" })} on the left.
        </p>
      </Section>
    </>
  );
}
