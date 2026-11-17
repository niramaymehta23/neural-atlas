/** The typed conversation between VisionReader (main thread) and the vision worker. */
import type { Fooled, Seen } from "./seeing";

export type VisionCommand =
  | {
      type: "see";
      id: number;
      /** 224 × 224 RGBA bytes; transferred, so the sender's copy is emptied. */
      pixels: Uint8ClampedArray;
      maps: boolean;
      features: boolean;
    }
  | { type: "fool"; id: number; pixels: Uint8ClampedArray; strength: number };

/** Where a request failed: starting the model ("load", the next request tries again) or this one. */
export type VisionStage = "load" | "see";

export type VisionEvent =
  | { type: "seen"; id: number; seen: Seen }
  | { type: "fooled"; id: number; fooled: Fooled }
  | { type: "error"; id: number; stage: VisionStage; message: string }
  /** Which device the model runs on, once it is ready. */
  | { type: "ready"; device: string };
