/** Runs the lab worker's side in the test's own process, so tests need no real worker. */
import { inProcessPractice } from "../../practice/testing/in-process";
import { labConnection, type LabPort } from "../lab-client";
import { createLabRun } from "../lab-run";

export const inProcessLab = (): LabPort => inProcessPractice(createLabRun);

/** Points every new run at the in-process host until the test file ends. */
export function practiseLabInProcess() {
  const original = labConnection.connect;
  beforeAll(() => {
    labConnection.connect = inProcessLab;
  });
  afterAll(() => {
    labConnection.connect = original;
  });
}
