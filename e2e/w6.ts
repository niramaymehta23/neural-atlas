/**
 * World 6's browser tests. `test` and `slowed` can run on a slowed CPU (see `e2e/slowed.ts`).
 * The shared steps (open, turn a dial, the star, a link) are World 5's, in `e2e/w5.ts`.
 */
export { expect, slowed, test } from "./slowed";
export { attributeOf, dialSays, dock, linkKeeps, open, starred, textOf, turn } from "./w5";
export type { Reader } from "./w5";
