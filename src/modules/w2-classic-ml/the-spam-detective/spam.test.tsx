import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Timeline } from "@/engine/timeline/timeline";
import { definition } from "./index";
import { words } from "./captions";
import { missions } from "./missions";
import { cleanMessage, MOST_LETTERS, reading, saysSpam, type SpamState } from "./model";
import { predictions } from "./predictions";
import { SpamScene } from "./scene";

const state = (change: Partial<SpamState> = {}) =>
  ({ ...definition.initialState, ...change }) as SpamState;
const [mission] = missions;
const [prediction] = predictions;

describe("the spam detective", () => {
  it("calls an obvious offer spam and a note about practice normal", () => {
    expect(saysSpam(state())).toBe(true);
    expect(saysSpam(state({ message: "Is football practice after school tomorrow" }))).toBe(false);
    const { verdict } = reading(state({ message: "free banana" }));
    expect(verdict.clues[0]).toBeGreaterThan(0);
    expect(verdict.clues[1]).toBe(0);
  });

  it("is fooled when spammy words hide among friendly ones", () => {
    expect(mission.when(state())).toBe(false);
    const salad = state({
      message:
        "free win prize see you at the school library after lunch thanks for the birthday cake",
    });
    expect(mission.when(salad)).toBe(true);
    // Saying "not spam" only because it barely ever says spam does not count.
    expect(mission.when(state({ message: "free win prize", suspicion: 1 }))).toBe(false);
  });

  it("tells the guess only for Grandma's message, the same whatever the dials", () => {
    expect(prediction.answer(state())).toBeNull();
    const gran = prediction.answer(state({ message: words.grandma }));
    expect(gran).toBe("normal");
    expect(prediction.answer(state({ message: words.grandma, caution: 1, suspicion: 1 }))).toBe(
      gran,
    );
  });

  it("makes a hand-made link safe", () => {
    const parse = definition.parseState;
    if (!parse) throw new Error("parseState is required");
    const saved = { message: `a\u0000b${"x".repeat(400)}`, caution: 9, suspicion: -2 };
    const safe = parse(saved as never, definition.initialState) as SpamState;
    expect(safe.message.length).toBe(MOST_LETTERS);
    expect(safe.message.startsWith("a b")).toBe(true);
    expect(safe.caution).toBe(1);
    expect(safe.suspicion).toBe(0);
    expect(cleanMessage("hi\nthere")).toBe("hi there");
  });

  it("describes itself in words", () => {
    const describe = definition.describe;
    if (!describe) throw new Error("describe is required");
    expect(describe(state({ message: "" }), undefined)).toBe(words.describe.empty);
    expect(describe(state(), undefined)).toContain(words.verdict.spam);
  });

  it("marks each word with a sign, not only a shade, and reads typing", async () => {
    let now = state({ message: "" });
    const update = (change: Partial<SpamState> | ((s: SpamState) => Partial<SpamState>)) => {
      now = { ...now, ...(typeof change === "function" ? change(now) : change) };
    };
    const { rerender } = render(
      <SpamScene state={now} update={update as never} timeline={new Timeline()} side="main" />,
    );
    expect(screen.getByText(words.noWords)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(words.message), "f");
    expect(now.message).toBe("f");
    rerender(
      <SpamScene
        state={state({ message: "free lunch" })}
        update={update as never}
        timeline={new Timeline()}
        side="main"
      />,
    );
    expect(screen.getByLabelText(words.leans.spam("free", words.strength[3]))).toHaveTextContent(
      "+",
    );
    expect(screen.getByRole("list").textContent).toContain("−");
  });
});
