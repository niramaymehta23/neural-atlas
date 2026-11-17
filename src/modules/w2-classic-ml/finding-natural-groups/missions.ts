import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { wrongGroups, type GroupsFrame, type GroupsState } from "./model";

export const missions = [
  {
    id: "groups-that-are-not-there",
    ...missionWords.fakeGroups,
    replay: { before: 4, after: 0 },
    when: (state) => wrongGroups(state),
  },
] as const satisfies readonly [
  Mission<GroupsState, GroupsFrame>,
  ...Mission<GroupsState, GroupsFrame>[],
];
