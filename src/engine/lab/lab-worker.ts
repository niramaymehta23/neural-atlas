/// <reference lib="webworker" />
import { createPracticeHost } from "../practice/host";
import type { PracticeCommand, PracticeEvent } from "../practice/protocol";
import { createLabRun, type LabConfig, type LabMoment } from "./lab-run";

const scope = self as unknown as DedicatedWorkerGlobalScope;
const handle = createPracticeHost(createLabRun, (event: PracticeEvent<LabMoment>) =>
  scope.postMessage(event),
);
scope.onmessage = (message: MessageEvent<PracticeCommand<LabConfig>>) => handle(message.data);
