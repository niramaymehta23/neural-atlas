/** The single training worker. All logic lives in the trainer; this file only wires messages. */
import type { Command } from "./protocol";
import { createTrainer } from "./trainer";

const trainer = createTrainer((event, transfer = []) => self.postMessage(event, { transfer }));
self.onmessage = (message: MessageEvent<Command>) => void trainer.handle(message.data);
