"use client";

import Link from "next/link";
import { useRef, useSyncExternalStore } from "react";
import type { Timeline } from "@/engine/timeline/timeline";
import { MissionCard } from "@/ui/MissionCard";
import { platformCaptions } from "./captions";
import type { Mission, ModuleState, TimelineFrame } from "./contract";
import { canReplay, type ReplayWindow } from "./missions/missions";

type MissionPanelProps = {
  mission: Mission<ModuleState>;
  done: boolean;
  /** True right after it fired in this visit: shows why, and the replay. */
  justFired: boolean;
  timeline: Timeline<TimelineFrame>;
  /** The moments around the one it fired on, when the lesson records any. */
  replay: ReplayWindow | null;
  onReplay: (window: ReplayWindow) => void;
  /** Present when another mission is waiting. */
  onNext?: () => void;
  /** The lesson to try next, offered once every mission here is done. */
  nextIdea?: { id: string; title: string } | null;
};

const LINK =
  "min-h-11 text-accent-ink underline-offset-4 hover:underline md:min-h-0 inline-flex items-center";

/** The mission card, and once the mission fires, the reason it broke and a replay. */
export function MissionPanel({
  mission,
  done,
  justFired,
  timeline,
  replay,
  onReplay,
  onNext,
  nextIdea,
}: MissionPanelProps) {
  const panel = useRef<HTMLDivElement>(null);
  // Subscribes here, not in the shell: whether the replay can still play changes as frames arrive.
  useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  const playable = replay && canReplay(timeline, replay);
  return (
    <div
      ref={panel}
      tabIndex={-1}
      className="flex flex-col gap-3 outline-none"
      data-mission={mission.id}
      data-done={done}
    >
      <MissionCard goal={mission.goal} done={done} hint={mission.hint} />
      {justFired && (
        <div className="flex flex-col items-start gap-2 px-1 text-sm text-ink" data-fired>
          <p>{mission.success}</p>
          <p className="text-ink-soft">{platformCaptions.star}</p>
          {playable && (
            <button type="button" onClick={() => onReplay(replay)} className={LINK}>
              {platformCaptions.replay}
            </button>
          )}
          {onNext && (
            <button
              type="button"
              onClick={() => {
                onNext();
                requestAnimationFrame(() => panel.current?.focus());
              }}
              className={LINK}
            >
              {platformCaptions.nextMission}
            </button>
          )}
        </div>
      )}
      {nextIdea && (
        <Link href={`/learn/${nextIdea.id}`} className={`px-1 text-sm ${LINK}`} data-next-idea>
          {platformCaptions.nextIdea(nextIdea.title)}
        </Link>
      )}
    </div>
  );
}
