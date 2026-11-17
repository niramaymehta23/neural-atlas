/// <reference lib="webworker" />
import { createMapHost } from "./tsne-host";
import type { MapCommand, MapEvent } from "./tsne-protocol";

const scope = self as unknown as DedicatedWorkerGlobalScope;
const handle = createMapHost((event: MapEvent, transfer?: Transferable[]) =>
  scope.postMessage(event, { transfer: transfer ?? [] }),
);
scope.onmessage = (message: MessageEvent<MapCommand>) => handle(message.data);
