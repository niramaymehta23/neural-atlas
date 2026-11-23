import { render } from "@testing-library/react";
import { boardGlow, glowScale } from "./board-values";
import { keepTiles, painted, tilesFrom } from "./boards";
import { PolicyArrows } from "./PolicyArrows";

const square = { index: 0, x: 0, y: 0, size: 44 };

describe("the shared board pieces", () => {
  it("draws longer wedges for favoured moves, the favourite in ink", () => {
    const { container } = render(
      <svg>
        <PolicyArrows square={square} shares={[0.7, 0.1, 0.2, 0]} best={0} />
      </svg>,
    );
    const wedges = [...container.querySelectorAll("[data-arrow]")];
    expect(wedges).toHaveLength(3);
    expect(container.querySelector("[data-arrow=best]")?.getAttribute("data-reach")).toBe("13.8");
    expect(container.querySelectorAll("[data-arrow=best]")).toHaveLength(1);
  });

  it("draws nothing for a square with no lean", () => {
    const { container } = render(
      <svg>
        <PolicyArrows square={square} shares={[0, 0, 0, 0]} best={-1} />
      </svg>,
    );
    expect(container.querySelector("path")).toBeNull();
  });

  it("tints floors by value on a shared scale and leaves special squares plain", () => {
    const glow = boardGlow([2, -1, 5, 0], ["floor", "floor", "goal", "wall"], {
      scale: 2,
      strength: 0.5,
    });
    expect(glow.floorValues).toEqual([0.5, -0.25, 0, 0]);
    expect(glow.floorTones[0]).toContain("var(--color-good)");
    expect(glowScale([0.5, -3, 1])).toBe(3);
    expect(glowScale([])).toBeGreaterThan(0);
  });

  it("reads boards from marks, keeps a link's board safe and paints one square", () => {
    const tiles = tilesFrom(["S#", "~G", "c."]);
    expect(tiles).toEqual(["floor", "wall", "trap", "goal", "coin", "floor"]);
    expect(keepTiles(["goal", "lava", "wall"], tiles, 0)).toEqual([
      "floor",
      "wall",
      "wall",
      "goal",
      "coin",
      "floor",
    ]);
    expect(keepTiles(tiles, tiles, 0, ["floor", "wall"])).toEqual([
      "floor",
      "wall",
      "trap",
      "goal",
      "coin",
      "floor",
    ]);
    expect(keepTiles(["floor", "coin", "coin"], tiles, 0, ["floor", "wall"])[2]).toBe("trap");
    expect(painted(tiles, 1, "goal", 0)?.[1]).toBe("goal");
    expect(painted(tiles, 0, "goal", 0)).toBeNull();
    expect(painted(tiles, 1, "wall", 0)).toBeNull();
    expect(painted(tiles, 9, "wall", 0)).toBeNull();
  });
});
