import { MissionCard } from "@/ui/MissionCard";
import { platformCaptions } from "./captions";
import type { Mission, ModuleState } from "./contract";

type MissionPanelProps = {
  mission: Mission<ModuleState>;
  done: boolean;
  /** True right after it fired in this visit: shows why, and the replay. */
  justFired: boolean;
  onReplay?: () => void;
  /** Present when another mission is waiting. */
  onNext?: () => void;
};

/** The mission card, and once the mission fires, the reason it broke and a replay. */
export function MissionPanel({ mission, done, justFired, onReplay, onNext }: MissionPanelProps) {
  return (
    <div className="flex flex-col gap-3" data-mission={mission.id} data-done={done}>
      <MissionCard goal={mission.goal} done={done} hint={mission.hint} />
      {justFired && (
        <div role="status" className="flex flex-col items-start gap-2 px-1 text-sm text-ink">
          <p>{mission.success}</p>
          <p className="text-ink-soft">{platformCaptions.star}</p>
          {onReplay && (
            <button
              type="button"
              onClick={onReplay}
              className="text-accent-ink underline-offset-4 hover:underline"
            >
              {platformCaptions.replay}
            </button>
          )}
          {onNext && (
            <button
              type="button"
              onClick={onNext}
              className="text-accent-ink underline-offset-4 hover:underline"
            >
              {platformCaptions.nextMission}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
