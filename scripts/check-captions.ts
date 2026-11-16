/**
 * The "smart 12-year-old" test: asks Gemini whether a smart 12-year-old would follow every
 * learner-facing string, and fails on any "no".
 *
 * Usage: pnpm check-captions [--file path/to/strings.ts ...]
 * Without --file it checks every module's captions.ts, missions.ts and predictions.ts, the
 * catalog, and the ui, platform and home map captions.
 * Without GEMINI_API_KEY it warns and passes locally, but fails in CI (where CI is set).
 */
import { glob } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const SOURCES = [
  "src/modules/*/*/captions.ts",
  "src/modules/*/*/missions.ts",
  "src/modules/*/*/predictions.ts",
  "src/catalog/*.ts",
  "src/ui/captions.ts",
  "src/platform/captions.ts",
  "src/constellation/captions.ts",
];
/**
 * Values under these keys are identifiers, deliberate real terms or code (lazy loaders, mission
 * and prediction checks), not plain-language copy.
 */
const NOT_FOR_LEARNERS = new Set([
  "id",
  "realTerm",
  "term",
  "prerequisites",
  "world",
  "load",
  "when",
  "answer",
]);
const BATCH_SIZE = 40;
const DEFAULT_MODEL = "gemini-2.5-flash";

export type Rating = { text: string; ok: boolean; reason: string };
type Env = Record<string, string | undefined>;
type Log = Pick<Console, "log" | "warn" | "error">;

/** Every string reachable from a module's exports (calling caption functions), skipping identifier-like keys. */
export function collectStrings(value: unknown, key = ""): string[] {
  if (NOT_FOR_LEARNERS.has(key)) return [];
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  // Templated captions are rated with a stand-in for each value they will be given.
  if (typeof value === "function") {
    return collectStrings(value(...Array.from({ length: value.length }, () => "a few")), key);
  }
  if (Array.isArray(value)) return value.flatMap((item) => collectStrings(item));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([childKey, child]) => collectStrings(child, childKey));
  }
  return [];
}

async function stringsFrom(files: string[]): Promise<string[]> {
  const modules = await Promise.all(files.map((file) => import(pathToFileURL(resolve(file)).href)));
  return [...new Set(modules.flatMap((exports: unknown) => collectStrings(exports)))];
}

export async function defaultFiles(): Promise<string[]> {
  const found: string[] = [];
  for (const pattern of SOURCES) for await (const file of glob(pattern)) found.push(file);
  return found.filter((file) => !file.endsWith(".test.ts")).sort();
}

const PROMPT = `You review text for an interactive website that teaches AI to people who do not code.
For each numbered line, answer: would a smart 12-year-old with no maths or computing background
follow it on first read? Answer "no" if it uses jargon, formulas, symbols, acronyms or unexplained
technical terms. Give a short reason in plain words.`;

const RESPONSE_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      index: { type: "INTEGER" },
      verdict: { type: "STRING", enum: ["yes", "no"] },
      reason: { type: "STRING" },
    },
    required: ["index", "verdict", "reason"],
  },
};

type GeminiVerdict = { index: number; verdict: "yes" | "no"; reason: string };

async function rateBatch(texts: string[], env: Env, fetchImpl: typeof fetch): Promise<Rating[]> {
  const model = env.GEMINI_MODEL ?? DEFAULT_MODEL;
  const lines = texts.map((text, index) => `${index}: ${JSON.stringify(text)}`).join("\n");
  const response = await fetchImpl(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY ?? "" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: `${PROMPT}\n\n${lines}` }] }],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    },
  );
  if (!response.ok) throw new Error(`Gemini answered ${response.status}: ${await response.text()}`);
  const body = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const verdicts = JSON.parse(
    body.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]",
  ) as GeminiVerdict[];
  return texts.map((text, index) => {
    const verdict = verdicts.find((entry) => entry.index === index);
    // A missing verdict is a failure: an unchecked caption must not ship.
    if (!verdict) return { text, ok: false, reason: "Gemini gave no verdict for this line." };
    return { text, ok: verdict.verdict === "yes", reason: verdict.reason };
  });
}

/** Runs the check and returns the process exit code. */
export async function main(
  args: string[],
  env: Env,
  fetchImpl: typeof fetch = fetch,
  log: Log = console,
): Promise<number> {
  const files = args.flatMap((arg, index) => (args[index - 1] === "--file" ? [arg] : []));
  const texts = await stringsFrom(files.length > 0 ? files : await defaultFiles());
  if (texts.length === 0) {
    log.log("check-captions: no learner-facing strings found yet.");
    return 0;
  }
  if (!env.GEMINI_API_KEY) {
    if (env.CI) {
      log.error("check-captions: GEMINI_API_KEY is required in CI.");
      return 1;
    }
    log.warn(`check-captions: skipped ${texts.length} strings because GEMINI_API_KEY is not set.`);
    return 0;
  }

  const ratings: Rating[] = [];
  for (let start = 0; start < texts.length; start += BATCH_SIZE) {
    ratings.push(...(await rateBatch(texts.slice(start, start + BATCH_SIZE), env, fetchImpl)));
  }
  const failures = ratings.filter((rating) => !rating.ok);
  for (const { text, reason } of failures) log.error(`✗ "${text}"\n    ${reason}`);
  log.log(`check-captions: ${ratings.length - failures.length} of ${ratings.length} strings pass.`);
  return failures.length > 0 ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exitCode = await main(process.argv.slice(2), process.env);
}
