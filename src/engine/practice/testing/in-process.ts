/**
 * Runs a practice worker's side in the test's own process, so tests need no real worker. Practice
 * runs flat out here (the watching pace is dropped): the moments are the same, since a run never
 * depends on its pace.
 */
import type { PracticePort } from "../client";
import { createPracticeHost } from "../host";
import type { PracticeEvent, PracticeRun } from "../protocol";

export function inProcessPractice<Config, Moment extends object>(
  begin: (config: Config) => PracticeRun<Moment>,
): PracticePort<Config, Moment> {
  let ended = false;
  const port: PracticePort<Config, Moment> = {
    onmessage: null,
    postMessage: (command) =>
      handle(command.type === "go" ? { ...command, perSecond: undefined } : command),
    terminate: () => {
      ended = true;
    },
  };
  const handle = createPracticeHost(begin, (event) => {
    if (!ended)
      setTimeout(() => port.onmessage?.({ data: event } as MessageEvent<PracticeEvent<Moment>>), 0);
  });
  return port;
}
