import { Object3D, PerspectiveCamera } from "three";
import { LINK_SLACK, steadyPlace } from "./link-place";

const VIEW = { width: 800, height: 400 };

const setUp = () => {
  const camera = new PerspectiveCamera(40, 2, 0.1, 100);
  camera.position.set(0, 0, 5);
  camera.updateMatrixWorld();
  const star = new Object3D();
  const at = (x: number, y: number) => {
    star.position.set(x, y, 0);
    star.updateMatrixWorld();
    return star;
  };
  return { camera, at, place: steadyPlace(LINK_SLACK) };
};

describe("where a star's link lies", () => {
  it("is over the star", () => {
    const { camera, at, place } = setUp();
    expect(place(at(0, 0), camera, VIEW)).toEqual([400, 200]);
    const [x, y] = place(at(1, 0.5), camera, VIEW);
    expect(x).toBeGreaterThan(500);
    expect(y).toBeLessThan(150);
  });

  it("holds still while the star drifts less than the slack, and never strays further", () => {
    const { camera, at, place } = setUp();
    const exact = steadyPlace(0);
    const first = place(at(0, 0), camera, VIEW);
    expect(place(at(0.001, 0), camera, VIEW)).toBe(first);
    for (let step = 0; step < 200; step += 1) {
      const star = at(step * 0.002, Math.sin(step / 20) * 0.1);
      const [x, y] = place(star, camera, VIEW);
      const [trueX, trueY] = exact(star, camera, VIEW);
      expect(Math.hypot(x - trueX, y - trueY)).toBeLessThan(LINK_SLACK);
    }
  });

  it("follows at once when the view changes shape", () => {
    const { camera, at, place } = setUp();
    place(at(1, 0), camera, VIEW);
    expect(place(at(1, 0), camera, { width: 400, height: 400 })[0]).toBeLessThan(400);
  });
});
