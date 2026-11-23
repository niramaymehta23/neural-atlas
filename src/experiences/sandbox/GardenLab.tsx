"use client";

import type { Point } from "@/data/datasets";
import { GARDEN_MODELS, TEAM_SIZES, teamWeights, type GardenMoment } from "@/engine/lab/garden-run";
import { BrushPicker } from "@/features/classic/BrushPicker";
import { ClassicGarden } from "@/features/classic/ClassicGarden";
import { paintWords } from "@/features/classic/paint-words";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { IdeaCardButton } from "@/ui/glossary/idea-cards";
import { NetworkView } from "@/visuals/NetworkView";
import type { ExperienceView } from "../shell/use-experience";
import { sandboxCaptions as words } from "./captions";
import { afresh, dotsOf, GARDENS, IDEAS, RESOLUTION, type SandboxState } from "./model";

type Props = ExperienceView<SandboxState>;

const PAINT = paintWords(words.garden.paint);

type StageProps = Props & {
  dots: readonly Point[];
  /** The newest moment, even from the run before, so the picture never blinks out. */
  moment: GardenMoment | null;
  note: string;
};

/** The garden, coloured by what the learner thinks of every spot; tap to plant. */
export function GardenStage({ state, update, dots, moment, note }: StageProps) {
  return (
    <div className="w-full max-w-md self-center">
      <ClassicGarden
        dots={dots}
        onChange={(change) =>
          update((now) => afresh({ garden: "own" as const, points: change(dotsOf(now)) }))
        }
        brush={state.brush}
        field={moment?.field ?? null}
        resolution={RESOLUTION}
        words={{ label: words.garden.label, paint: PAINT, full: words.garden.full }}
        footer={<p>{note}</p>}
      />
    </div>
  );
}

/** The team's cells and threads, for the learners that are teams. */
export function TeamView({ state, moment }: { state: SandboxState; moment: GardenMoment | null }) {
  const sizes = TEAM_SIZES[state.model];
  if (!sizes) return null;
  return (
    <div className="h-40 w-full" data-team>
      <NetworkView
        sizes={sizes}
        params={moment?.params?.length === teamWeights(state.model) ? moment.params : null}
        label={words.garden.network}
        flowing={state.running}
        className="size-full"
        height={200}
      />
    </div>
  );
}

export function GardenDials({ state, update }: Props) {
  return (
    <>
      <SegmentedControl
        label={words.gardens.label}
        showLabel
        options={GARDENS.map((value) => ({ value, label: words.gardens.names[value] }))}
        value={state.garden}
        onChange={(garden) =>
          update((now) =>
            afresh(
              // Your own garden starts from the dots on screen, so there is something to change.
              garden === "own" && now.points.length === 0
                ? { garden, points: dotsOf(now) }
                : { garden },
            ),
          )
        }
      />
      <SegmentedControl
        label={words.models.label}
        showLabel
        options={GARDEN_MODELS.map((value) => ({ value, label: words.models.names[value] }))}
        value={state.model}
        onChange={(model) => update(afresh({ model }))}
      />
      <p className="min-h-[4lh] text-sm text-ink-soft">{words.models.notes[state.model]}</p>
      <IdeaCardButton about={IDEAS[state.model]} className="self-start" />
      <BrushPicker
        value={state.brush}
        onChange={(brush) => update({ brush })}
        words={words.garden.brush}
      />
    </>
  );
}
