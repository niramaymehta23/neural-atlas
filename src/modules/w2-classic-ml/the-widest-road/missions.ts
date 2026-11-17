import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { pulledPost, roadMoved, type RoadState } from "./model";

export const missions = [
  {
    id: "pull-a-lamp-post",
    ...missionWords.post,
    replay: { before: 0, after: 0 },
    when: (state) => pulledPost(state) === true && roadMoved(state) === true,
  },
] as const satisfies readonly [Mission<RoadState>, ...Mission<RoadState>[]];
