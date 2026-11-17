import { lessons } from "../src/catalog";

/** Every lesson with a module, read from the catalog so a newly built lesson needs no edit in a spec. */
export const BUILT_IDS = lessons.filter(({ load }) => load).map(({ id }) => id);

/** A path to a built lesson, followed by `after` (a regular expression source). */
export const builtPath = (after = "") => new RegExp(`/learn/(${BUILT_IDS.join("|")})${after}`);
