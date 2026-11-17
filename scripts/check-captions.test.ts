// @vitest-environment node
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { collectStrings, defaultFiles, type Lock, lockKey, main } from "./check-captions";

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

  it("never runs code held under load, when or answer", () => {
    const code = vi.fn(() => "Should not be read.");
    const strings = collectStrings({
      lessons: [{ title: "Rolling downhill", load: code }],
      missions: [{ goal: "Make it fly off", when: code }],
      predictions: [{ question: "Where will it stop?", answer: code }],
    });
    expect(strings).toEqual(["Rolling downhill", "Make it fly off", "Where will it stop?"]);
    expect(code).not.toHaveBeenCalled();
  });

  it("reads the catalog and the ui and platform captions by default", async () => {
    const files = await defaultFiles();
    expect(files).toEqual(
      expect.arrayContaining([
        "src/catalog/world-1.ts",
        "src/ui/captions.ts",
        "src/platform/captions.ts",
      ]),
    );
    expect(files.some((file) => file.endsWith(".test.ts"))).toBe(false);
  });

  it("reads catalog titles and ideas but not real terms or slugs", async () => {
    const strings = collectStrings((await import("../src/catalog")).worlds);
    expect(strings).toContain("Rolling downhill");
    expect(strings).toContain("Learning is walking downhill in a valley of mistakes");
    expect(strings).toContain("Learning from examples");
    expect(strings).not.toContain("Gradient descent");
    expect(strings).not.toContain("rolling-downhill");
  });

  it("finds the ui words", async () => {
    const { uiCaptions } = await import("../src/ui/captions");
    const strings = collectStrings(uiCaptions);
    expect(strings).toEqual(
      expect.arrayContaining(["Peek under the hood", "Moment a few of a few"]),
    );
  });

  it("rates templated captions with a stand-in value", () => {
    const captions = { shrank: (amount: string) => `The mistake shrank by ${amount}.` };
    expect(collectStrings(captions)).toEqual(["The mistake shrank by a few."]);
  });
});

describe("check-captions in CI", () => {
  const noWait = { sleep: vi.fn(async () => {}) };
  const tempLock = async () => join(await mkdtemp(join(tmpdir(), "captions-")), "lock.json");

  it("retries a 429 with backoff, then rates the batch", async () => {
    const plain = geminiRejecting([]);
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response("slow down", { status: 429 }))
      .mockImplementation(plain);
    const sleep = vi.fn(async () => {});
    const code = await main(["--file", FIXTURE], { GEMINI_API_KEY: "k" }, fetchImpl, quietLog(), {
      sleep,
    });
    expect(code).toBe(0);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(1000);
    expect(fetchImpl.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("gives up with a clear message after a request keeps timing out", async () => {
    const timeout = vi.fn(async () => {
      throw new DOMException("The operation timed out.", "TimeoutError");
    });
    await expect(
      main(["--file", FIXTURE], { GEMINI_API_KEY: "k" }, timeout, quietLog(), noWait),
    ).rejects.toThrow("no answer within 30 s (after 3 retries)");
    expect(timeout).toHaveBeenCalledTimes(4);
  });

  it("names the model when Gemini does not know it", async () => {
    const missing = vi.fn(async () => new Response("not found", { status: 404 }));
    await expect(
      main(
        ["--file", FIXTURE],
        { GEMINI_API_KEY: "k", GEMINI_MODEL: "gemini-0" },
        missing,
        quietLog(),
        noWait,
      ),
    ).rejects.toThrow('Gemini has no model "gemini-0" (404)');
  });

  it("keeps verdicts in the lock file and sends nothing for strings it already knows", async () => {
    const lockPath = await tempLock();
    const first = geminiRejecting(["ReLU"]);
    const options = { ...noWait, lockPath, today: "2026-11-17" };
    expect(
      await main(["--file", FIXTURE], { GEMINI_API_KEY: "k" }, first, quietLog(), options),
    ).toBe(1);
    const lock = JSON.parse(await readFile(lockPath, "utf8")) as Lock;
    expect(Object.values(lock.verdicts)).toHaveLength(3);
    expect(Object.values(lock.verdicts)[0]).toMatchObject({
      model: "gemini-2.5-flash",
      date: "2026-11-17",
    });

    // Same strings, no key, on main: the lock answers, so nothing is sent and the verdicts hold.
    const again = vi.fn();
    const log = quietLog();
    expect(
      await main(
        ["--file", FIXTURE],
        { CI: "true", GITHUB_EVENT_NAME: "push" },
        again,
        log,
        options,
      ),
    ).toBe(1);
    expect(again).not.toHaveBeenCalled();
    expect(log.error).toHaveBeenCalledWith(expect.stringContaining("ReLU"));
  });

  it("sends only the string that changed", async () => {
    const lockPath = await tempLock();
    const strings = collectStrings(await import("./fixtures/jargon-captions"));
    const verdicts = Object.fromEntries(
      strings
        .slice(1)
        .map((text) => [
          lockKey(text),
          { verdict: "yes" as const, reason: "Clear.", model: "m", date: "d" },
        ]),
    );
    await writeFile(lockPath, JSON.stringify({ version: 1, verdicts }));
    const fetchImpl = geminiRejecting([]);
    expect(
      await main(["--file", FIXTURE], { GEMINI_API_KEY: "k" }, fetchImpl, quietLog(), {
        ...noWait,
        lockPath,
      }),
    ).toBe(0);
    const prompt = JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body)).contents[0].parts[0]
      .text as string;
    expect(prompt).toContain(JSON.stringify(strings[0]));
    expect(prompt).not.toContain(JSON.stringify(strings[1]));
  });

  it("warns and passes on a pull request without the key", async () => {
    const log = quietLog();
    const env = { CI: "true", GITHUB_EVENT_NAME: "pull_request" };
    expect(await main(["--file", FIXTURE], env, vi.fn(), log)).toBe(0);
    expect(log.warn).toHaveBeenCalledWith(expect.stringMatching(/^::warning::.*GEMINI_API_KEY/));
  });

  it("fails on a push to main without the key", async () => {
    const env = { CI: "true", GITHUB_EVENT_NAME: "push" };
    expect(await main(["--file", FIXTURE], env, vi.fn(), quietLog())).toBe(1);
  });
});

describe.runIf(process.env.GEMINI_API_KEY)("check-captions against live Gemini", () => {
  it("rejects the jargon-heavy fixture", async () => {
    expect(await main(["--file", FIXTURE], process.env, fetch, quietLog())).toBe(1);
  }, 60_000);
});
