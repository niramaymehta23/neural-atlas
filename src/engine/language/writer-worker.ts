/// <reference lib="webworker" />
import { createWriterHost } from "./writer-host";
import type { WriterCommand, WriterEvent } from "./writer-protocol";

const scope = self as unknown as DedicatedWorkerGlobalScope;
const handle = createWriterHost((event: WriterEvent) => scope.postMessage(event));
scope.onmessage = (message: MessageEvent<WriterCommand>) => handle(message.data);
