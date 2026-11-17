/** A dot on the −1…1 square with its group (0, 1 or 2). Shaped like DataKit's `Point`. */
export type Dot = { x: number; y: number; label: number };

/** Something that gives, for a spot, a share per group (they add up to 1). */
export type Classifier = (x: number, y: number) => readonly number[];
