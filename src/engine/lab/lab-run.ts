/** Everything the lab worker can practise, behind one `createLabRun`. */
import type { PracticeRun } from "../practice/protocol";
import { createBoardRun, type BoardConfig, type BoardMoment } from "./board-run";
import { createGardenRun, type GardenConfig, type GardenMoment } from "./garden-run";
import { createMendRun, type MendConfig, type MendMoment } from "./mend-run";
import { createRaceRun, type RaceConfig, type RaceMoment } from "./race-run";

export type LabConfig = GardenConfig | BoardConfig | RaceConfig | MendConfig;
export type LabMoment = GardenMoment | BoardMoment | RaceMoment | MendMoment;

export function createLabRun(config: LabConfig): PracticeRun<LabMoment> {
  if (config.kind === "garden") return createGardenRun(config);
  if (config.kind === "board") return createBoardRun(config);
  if (config.kind === "race") return createRaceRun(config);
  return createMendRun(config);
}
