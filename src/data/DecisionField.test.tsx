import { render } from "@testing-library/react";
import { DecisionField } from "./DecisionField";

describe("DecisionField", () => {
  it("clears the old fences when there is no opinion yet (MLP-02)", () => {
    const context = {
      clearRect: vi.fn(),
      createImageData: (width: number, height: number) => ({
        data: new Uint8ClampedArray(width * height * 4),
      }),
      putImageData: vi.fn(),
      // The colour table resolves its tokens on a one-pixel canvas.
      fillStyle: "",
      fillRect: () => undefined,
      getImageData: () => ({ data: new Uint8ClampedArray([200, 100, 50, 255]) }),
    };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context as never);
    const outputs = new Float32Array(4 * 4).fill(0.9);
    const { rerender } = render(<DecisionField outputs={outputs} groups={2} resolution={4} />);
    expect(context.putImageData).toHaveBeenCalledTimes(1);
    expect(context.clearRect).not.toHaveBeenCalledWith(0, 0, 4, 4);
    rerender(<DecisionField outputs={null} groups={2} resolution={4} />);
    expect(context.clearRect).toHaveBeenCalledWith(0, 0, 4, 4);
    expect(context.putImageData).toHaveBeenCalledTimes(1);
  });
});
