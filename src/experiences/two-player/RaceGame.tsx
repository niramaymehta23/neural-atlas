"use client";

import { RACE_GOAL, type RaceMoment } from "@/engine/lab/race-run";
import type { Point } from "@/data/datasets";
import { ClassicGarden } from "@/features/classic/ClassicGarden";
import { paintWords } from "@/features/classic/paint-words";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { NetworkView } from "@/visuals/NetworkView";
import { sandboxCaptions } from "../sandbox/captions";
import { twoPlayerCaptions as words } from "./captions";
import { PACE_NAMES, RESOLUTION, sizesOf, TEAM_NAMES, type Player, type TwoState } from "./model";
import { ScoreBar } from "./ScoreBar";

const PAINT = paintWords(sandboxCaptions.garden.paint);
const still = () => undefined;
const PLAYERS: readonly Player[] = [0, 1];

const swap = <T,>(list: readonly T[], at: Player, value: T): T[] =>
  list.map((kept, index) => (index === at ? value : kept));

type PickProps = {
  state: TwoState;
  player: Player;
  onPick: (change: Partial<TwoState>) => void;
};

/** One player's secret choice of team. */
export function RacePick({ state, player, onPick }: PickProps) {
  const team = state.teams[player] ?? "middle";
  const pace = state.paces[player] ?? "steady";
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="flex flex-col gap-2">
        <SegmentedControl
          label={words.race.size}
          showLabel
          vertical
          options={TEAM_NAMES.map((value) => ({ value, label: words.race.sizes[value] }))}
          value={team}
          onChange={(next) => onPick({ teams: swap(state.teams, player, next) })}
        />
        <p className="min-h-[2lh] text-sm text-ink-soft">{words.race.sizeNotes[team]}</p>
      </div>
      <div className="flex flex-col gap-2">
        <SegmentedControl
          label={words.race.pace}
          showLabel
          vertical
          options={PACE_NAMES.map((value) => ({ value, label: words.race.paces[value] }))}
          value={pace}
          onChange={(next) => onPick({ paces: swap(state.paces, player, next) })}
        />
        <p className="min-h-[2lh] text-sm text-ink-soft">{words.race.paceNotes[pace]}</p>
      </div>
    </div>
  );
}

type RunProps = { state: TwoState; dots: readonly Point[]; moment: RaceMoment | null };

/** Both teams practising, side by side. */
export function RaceRun({ state, dots, moment }: RunProps) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {PLAYERS.map((player) => {
        const name = words.players[player];
        const runner = moment?.teams[player];
        const team = state.teams[player] ?? "middle";
        return (
          <section
            key={player}
            aria-label={name}
            data-racer={player}
            data-right={runner?.right ?? 0}
            className="flex min-w-0 flex-col gap-3"
          >
            <h3 className="text-xl">{name}</h3>
            <p className="text-sm text-ink-soft">
              {words.race.team(
                words.race.sizes[team],
                words.race.paces[state.paces[player] ?? "steady"],
              )}
            </p>
            <ScoreBar right={runner?.right ?? 0} goal={RACE_GOAL} label={words.race.bar(name)} />
            <p className="min-h-[2lh] text-sm">
              {runner
                ? `${words.race.right(runner.right)} ${words.race.rounds(runner.rounds)}`
                : ""}
            </p>
            <ClassicGarden
              dots={dots}
              onChange={still}
              brush={0}
              editable={false}
              field={runner?.field ?? null}
              resolution={RESOLUTION}
              words={{
                label: words.race.garden(name),
                paint: PAINT,
                full: sandboxCaptions.garden.full,
              }}
            />
            <NetworkView
              sizes={sizesOf(team)}
              params={runner?.params ?? null}
              label={words.race.sizes[team]}
              flowing={state.running}
              backward
              height={200}
              className="w-full"
            />
          </section>
        );
      })}
    </div>
  );
}
