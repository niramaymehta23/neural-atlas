// @vitest-environment node
import { collectStrings, main } from "./check-captions";

const FIXTURE = "scripts/fixtures/jargon-captions.ts";

function quietLog() {
  return { log: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

/** A stand-in for Gemini that says "no" to any line containing one of the given words. */
function geminiRejecting(words: string[]) {
  return vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    const prompt = JSON.parse(String(init?.body)).contents[0].parts[0].text as string;
    const lines = prompt.split("\n").filter((line) => /^\d+: "/.test(line));
    const verdicts = lines.map((line) => {
      const index = Number(line.slice(0, line.indexOf(":")));
      const jargon = words.some((word) => line.includes(word));
      return { index, verdict: jargon ? "no" : "yes", reason: jargon ? "Uses jargon." : "Clear." };
    });
    return new Response(
      JSON.stringify({
        candidates: [{ content: { parts: [{ text: JSON.stringify(verdicts) }] } }],
      }),
    );
  });
}

describe("check-captions", () => {
  it("fails the jargon-heavy fixture and names each failing line", async () => {
    const log = quietLog();
    const fetchImpl = geminiRejecting(["Backpropagation", "ReLU", "learning rate"]);
    const code = await main(["--file", FIXTURE], { GEMINI_API_KEY: "test-key" }, fetchImpl, log);
    expect(code).toBe(1);
    expect(log.error).toHaveBeenCalledTimes(3);
    expect(fetchImpl.mock.calls[0]?.[1]?.headers).toMatchObject({ "x-goog-api-key": "test-key" });
  });

  it("passes when every line is plain", async () => {
    const log = quietLog();
    const code = await main(
      ["--file", FIXTURE],
      { GEMINI_API_KEY: "test-key" },
      geminiRejecting([]),
      log,
    );
    expect(code).toBe(0);
    expect(log.log).toHaveBeenCalledWith("check-captions: 3 of 3 strings pass.");
  });

  it("treats a line Gemini skipped as a failure", async () => {
    const empty = vi.fn(
      async () =>
        new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "[]" }] } }] })),
    );
    expect(await main(["--file", FIXTURE], { GEMINI_API_KEY: "k" }, empty, quietLog())).toBe(1);
  });

  it("skips with a warning when the key is missing locally", async () => {
    const log = quietLog();
    const fetchImpl = vi.fn();
    expect(await main(["--file", FIXTURE], {}, fetchImpl, log)).toBe(0);
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining("GEMINI_API_KEY is not set"));
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("fails when the key is missing in CI", async () => {
    expect(await main(["--file", FIXTURE], { CI: "true" }, vi.fn(), quietLog())).toBe(1);
  });

  it("collects plain-language strings but not identifiers or real terms", () => {
    const strings = collectStrings({
      world1: [
        {
          id: "w1-neuron",
          title: "A tiny voter",
          realTerm: "perceptron",
          idea: "One dot decides.",
        },
      ],
      caption: "  You nudged it.  ",
    });
    expect(strings).toEqual(["A tiny voter", "One dot decides.", "You nudged it."]);
  });

  it("rates templated captions with a stand-in value", () => {
    const captions = { shrank: (amount: string) => `The mistake shrank by ${amount}.` };
    expect(collectStrings(captions)).toEqual(["The mistake shrank by a few."]);
  });
});

describe.runIf(process.env.GEMINI_API_KEY)("check-captions against live Gemini", () => {
  it("rejects the jargon-heavy fixture", async () => {
    expect(await main(["--file", FIXTURE], process.env, fetch, quietLog())).toBe(1);
  }, 60_000);
});
