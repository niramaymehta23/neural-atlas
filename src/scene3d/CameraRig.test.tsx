import { render } from "@testing-library/react";
import { PerspectiveCamera } from "three";
import { CameraRig, type Vec3 } from "./CameraRig";

const three = vi.hoisted(() => ({
  state: null as null | {
    camera: PerspectiveCamera;
    invalidate: () => void;
    size: { width: number; height: number };
  },
}));

vi.mock("@react-three/fiber", () => ({
  useThree: <T,>(select: (state: NonNullable<typeof three.state>) => T) => select(three.state!),
}));

const near: Vec3 = [0, 1, 2];
const far: Vec3 = [0, 4, 8];
const at = () => three.state!.camera.position.toArray();

function setSize(width: number, height: number) {
  three.state = { ...three.state!, size: { width, height } };
}

describe("CameraRig", () => {
  beforeEach(() => {
    three.state = {
      camera: new PerspectiveCamera(),
      invalidate: vi.fn(),
      size: { width: 800, height: 600 },
    };
  });

  it("is simply there on first view", () => {
    render(<CameraRig position={near} />);
    expect(at()).toEqual([...near]);
  });

  it("glides when the framing changes on its own", () => {
    const { rerender } = render(<CameraRig position={near} />);
    rerender(<CameraRig position={far} />);
    expect(at()).toEqual([...near]);
  });

  it("snaps when the view changes shape with the framing", () => {
    const { rerender } = render(<CameraRig position={near} />);
    setSize(400, 800);
    rerender(<CameraRig position={far} />);
    expect(at()).toEqual([...far]);
  });

  it("snaps when the canvas reports the new shape just after the framing moved", () => {
    const { rerender } = render(<CameraRig position={near} />);
    rerender(<CameraRig position={far} />);
    setSize(400, 800);
    rerender(<CameraRig position={far} />);
    expect(at()).toEqual([...far]);
  });
});
