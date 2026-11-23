/** The tiny things to play with on idea cards. Each is drawn by `Mini`, from the words given. */
export type MiniSpec =
  /** Tilt a line until it fits the dots. */
  | { kind: "line" }
  /** A ball stepping down a slope; `bumpy` has a wrong valley to get stuck in. */
  | { kind: "valley"; bumpy?: boolean }
  /** How likely each thing is, from even to one clear favourite. */
  | { kind: "bars"; labels: readonly string[]; low: string; high: string }
  /** Places on a map; tap one to see which are close. */
  | { kind: "map"; places: readonly (readonly [word: string, x: number, y: number])[] }
  /** Inputs switched on and off, an answer that lights up. */
  | { kind: "cells"; ins: readonly string[]; out: string }
  /** A curve following dots, from stiff to wiggly. */
  | { kind: "curve"; low: string; high: string }
  /** A small picture, changed more and more. */
  | { kind: "picture"; effect: "shrink" | "fog" | "edges"; low: string; high: string }
  /** Words joined by threads; tap one to see where it looks. */
  | { kind: "threads"; words: readonly string[]; links: readonly (readonly number[])[] }
  /** A line of words of which only the newest can be seen. */
  | { kind: "window"; words: readonly string[]; low: string; high: string }
  /** A glow spreading over squares from a bowl. */
  | { kind: "glow"; low: string; high: string }
  /** Things to try, each paying out at its own hidden rate. */
  | {
      kind: "tries";
      options: readonly string[];
      odds: readonly number[];
      hit: string;
      miss: string;
    }
  /** A fence to slide between two groups. */
  | { kind: "fence" }
  /** Steps that go round and round. */
  | { kind: "loop"; steps: readonly string[] };
export type MiniKind = MiniSpec["kind"];
export type IdeaCard = { idea: string; mini: MiniSpec };
