/**
 * A picture reader for tests that never starts a worker: `answer` says what the model would make
 * of each command, and the answer arrives a moment later, like a real worker's.
 */
import type { VisionCommand, VisionEvent } from "../protocol";
import type { Fooled, Seen } from "../seeing";
import { VisionReader, type VisionPort } from "../vision-client";

export type FakeAnswer = {
  see?: (command: Extract<VisionCommand, { type: "see" }>) => Seen;
  fool?: (command: Extract<VisionCommand, { type: "fool" }>) => Fooled;
};

export function fakeVisionReader(answer: FakeAnswer): VisionReader & { asked: VisionCommand[] } {
  const asked: VisionCommand[] = [];
  const reader = new VisionReader(() => {
    let ready = false;
    const port: VisionPort = {
      onmessage: null,
      postMessage(command) {
        asked.push(command);
        const reply = (event: VisionEvent) =>
          setTimeout(() => port.onmessage?.({ data: event } as MessageEvent<VisionEvent>), 0);
        if (!ready) {
          ready = true;
          reply({ type: "ready", device: "fake" });
        }
        try {
          if (command.type === "see" && answer.see) {
            reply({ type: "seen", id: command.id, seen: answer.see(command) });
          } else if (command.type === "fool" && answer.fool) {
            reply({ type: "fooled", id: command.id, fooled: answer.fool(command) });
          } else reply({ type: "error", id: command.id, stage: "see", message: "No answer." });
        } catch (error) {
          reply({ type: "error", id: command.id, stage: "see", message: String(error) });
        }
      },
      terminate() {},
    };
    return port;
  });
  return Object.assign(reader, { asked });
}
