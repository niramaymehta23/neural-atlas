import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Clay is for things you can touch, or the one to try next. On the map that is links and
 * buttons only; a label's words or a decoration in clay would read as touchable.
 */
const ALLOWED: Record<string, number> = {
  // The skip link.
  "HomeMap.tsx": 1,
  // The "next" lesson link in the plain list.
  "LessonList.tsx": 1,
  // The Open button on a tapped label.
  "StarLabel.tsx": 2,
};

describe("clay on the home map", () => {
  it("is only used on links and buttons", () => {
    const dir = __dirname;
    for (const file of readdirSync(dir).filter(
      (name) => /\.tsx$/.test(name) && !name.includes(".test."),
    )) {
      const uses =
        readFileSync(join(dir, file), "utf8").match(
          /\b(?:text|bg|border|fill|stroke)-accent[\w-]*/g,
        ) ?? [];
      expect({ file, uses: uses.length }).toEqual({ file, uses: ALLOWED[file] ?? 0 });
    }
  });
});
