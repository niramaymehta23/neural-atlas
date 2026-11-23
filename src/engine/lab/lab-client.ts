/** The page's handle on the lab: one worker per page that practises, so nothing holds up a frame. */
import { PracticeClient, type PracticeClientOptions, type PracticePort } from "../practice/client";
import type { LabConfig, LabMoment } from "./lab-run";

export type LabPort = PracticePort<LabConfig, LabMoment>;

const startWorker = (): LabPort =>
  new Worker(new URL("./lab-worker.ts", import.meta.url), {
    type: "module",
  }) as unknown as LabPort;

/** How a client reaches its worker; tests swap `connect` for an in-process host. */
export const labConnection = { connect: startWorker };

export class LabClient extends PracticeClient<LabConfig, LabMoment> {
  constructor(options: PracticeClientOptions<LabMoment>) {
    super(labConnection.connect, options);
  }
}
