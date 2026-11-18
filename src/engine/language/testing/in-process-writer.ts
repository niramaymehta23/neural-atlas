/** Runs baby GPT's worker side in the test's own process, so lesson tests need no real worker. */
import type { WriterPort } from "../writer-client";
import { writerConnection } from "../writer-client";
import { createWriterHost } from "../writer-host";
import type { WriterEvent } from "../writer-protocol";

export function inProcessWriter(): WriterPort {
  let ended = false;
  const port: WriterPort = {
    onmessage: null,
    postMessage: (command) => handle(command),
    terminate: () => {
      ended = true;
    },
  };
  const handle = createWriterHost((event: WriterEvent) => {
    if (!ended) setTimeout(() => port.onmessage?.({ data: event } as MessageEvent<WriterEvent>), 0);
  });
  return port;
}

/** Points every new practice run at the in-process host until the test file ends. */
export function practiseInProcess() {
  const original = writerConnection.connect;
  beforeAll(() => {
    writerConnection.connect = inProcessWriter;
  });
  afterAll(() => {
    writerConnection.connect = original;
  });
}
