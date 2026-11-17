import type { Mission } from "@/platform/contract";
import { missionWords } from "./captions";
import { chasingNoise, type RelayFrame, type RelayState } from "./model";

export const missions = [
  {
    id: "chase-the-noise",
    ...missionWords.noise,
    replay: { before: 20, after: 0 },
    // Worked out from the relay in state, so a scrubbed moment cannot fire it.
    when: (state) => chasingNoise(state),
  },
] as const satisfies readonly [
  Mission<RelayState, RelayFrame>,
  ...Mission<RelayState, RelayFrame>[],
];
