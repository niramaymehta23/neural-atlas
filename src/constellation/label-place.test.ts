import { DROP_GAP, EDGE_GAP, keepInside, labelShift } from "./label-place";

const map = { left: 0, right: 375, top: 0, bottom: 700 };

describe("labelShift", () => {
  it("leaves a label that fits where it is", () => {
    expect(labelShift({ left: 60, right: 300, top: 200, bottom: 280 }, map)).toEqual({
      x: 0,
      y: 0,
    });
  });

  it("slides a label in from the left and right edges", () => {
    expect(labelShift({ left: -100, right: 140, top: 200, bottom: 280 }, map).x).toBe(
      100 + EDGE_GAP,
    );
    expect(labelShift({ left: 300, right: 540, top: 200, bottom: 280 }, map).x).toBe(
      375 - EDGE_GAP - 540,
    );
  });

  it("drops a label below its star when it would leave the top", () => {
    expect(labelShift({ left: 60, right: 300, top: -30, bottom: 50 }, map).y).toBe(80 + DROP_GAP);
  });
});

describe("keepInside", () => {
  it("measures from the unshifted spot, so repeated calls settle", () => {
    const outer = document.createElement("div");
    const card = document.createElement("div");
    let shift = 0;
    vi.spyOn(card, "getBoundingClientRect").mockImplementation(
      () => ({ left: -100 + shift, right: 140 + shift, top: 200, bottom: 280 }) as DOMRect,
    );
    keepInside(outer, card, map);
    shift = Number(outer.dataset.x);
    expect(shift).toBe(100 + EDGE_GAP);
    expect(outer.style.transform).toBe(`translate(${shift}px, 0px)`);
    keepInside(outer, card, map);
    expect(Number(outer.dataset.x)).toBe(shift);
  });
});
