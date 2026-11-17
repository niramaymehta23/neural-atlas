/**
 * The "smart 12-year-old" test: asks Gemini whether a smart 12-year-old would follow every
 * learner-facing string, and fails on any "no".
 *
 * Usage: pnpm check-captions [--file path/to/strings.ts ...]
 * Without --file it checks every module's captions.ts, missions.ts and predictions.ts, the
 * catalog, and the ui, platform and home map captions.
 *
 * Verdicts are kept in captions.lock.json (a hash of prompt and string → verdict, reason, model,
 * date), committed, so only new or changed strings are sent and results are reproducible. Delete
 * an entry to have that string rated again.
 *
 * Without GEMINI_API_KEY, strings that are not in the lock file cannot be rated: that warns and
 * passes locally and on pull requests, and fails on any other CI run (a push to main).
 * GEMINI_MODEL picks the model (default gemini-2.5-flash).
 */
import { createHash } from "node:crypto";
import { glob, readFile, writeFile } from "node:fs/promises";
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
export const LOCK_FILE = "captions.lock.json";
const REQUEST_TIMEOUT_MS = 30_000;
const RETRIES = 3;
const BATCH_PAUSE_MS = 1_000;

export type Rating = { text: string; ok: boolean; reason: string };
type Env = Record<string, string | undefined>;
type Log = Pick<Console, "log" | "warn" | "error">;
export type Verdict = { verdict: "yes" | "no"; reason: string; model: string; date: string };
export type Lock = { version: 1; verdicts: Record<string, Verdict> };
export type Options = {
  /** Where verdicts are cached; without it every string is sent. */
  lockPath?: string;
  /** Waits between retries and batches (replaced in tests). */
  sleep?: (ms: number) => Promise<void>;
  /** The date written beside new verdicts. */
  today?: string;
};

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

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

/** The cache key: a changed prompt re-rates everything. */
export const lockKey = (text: string) =>
  createHash("sha256").update(`${PROMPT}\n${text}`).digest("hex").slice(0, 32);

async function readLock(path: string | undefined): Promise<Lock> {
  if (!path) return { version: 1, verdicts: {} };
  try {
    const lock = JSON.parse(await readFile(path, "utf8")) as Lock;
    return lock.version === 1 ? lock : { version: 1, verdicts: {} };
  } catch {
    return { version: 1, verdicts: {} };
  }
}

/** POSTs with a timeout, retrying timeouts, 429 and 5xx with backoff (1 s, 2 s, 4 s). */
async function post(
  url: string,
  init: RequestInit,
  fetchImpl: typeof fetch,
  sleep: (ms: number) => Promise<void>,
  model: string,
): Promise<Response> {
  for (let attempt = 0; ; attempt += 1) {
    let response: Response | null = null;
    let failure = "";
    try {
      response = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    } catch (error) {
      const name = (error as Error).name;
      if (name !== "TimeoutError" && name !== "AbortError") throw error;
      failure = `no answer within ${REQUEST_TIMEOUT_MS / 1000} s`;
    }
    if (response?.status === 404) {
      throw new Error(
        `Gemini has no model "${model}" (404). Set GEMINI_MODEL (the repository variable in CI) to a current one.`,
      );
    }
    const retryable = !response || response.status === 429 || response.status >= 500;
    if (response && !retryable) return response;
    if (response) failure = `Gemini answered ${response.status}: ${await response.text()}`;
    if (attempt >= RETRIES) throw new Error(`${failure} (after ${RETRIES} retries)`);
    await sleep(1000 * 2 ** attempt);
  }
}

async function rateBatch(
  texts: string[],
  env: Env,
  fetchImpl: typeof fetch,
  sleep: (ms: number) => Promise<void>,
): Promise<Rating[]> {
  const model = env.GEMINI_MODEL || DEFAULT_MODEL;
  const lines = texts.map((text, index) => `${index}: ${JSON.stringify(text)}`).join("\n");
  const response = await post(
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
    fetchImpl,
    sleep,
    model,
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
  { lockPath, sleep = wait, today = new Date().toISOString().slice(0, 10) }: Options = {},
): Promise<number> {
  const files = args.flatMap((arg, index) => (args[index - 1] === "--file" ? [arg] : []));
  const texts = await stringsFrom(files.length > 0 ? files : await defaultFiles());
  if (texts.length === 0) {
    log.log("check-captions: no learner-facing strings found yet.");
    return 0;
  }
  const lock = await readLock(lockPath);
  const known = (text: string) => lock.verdicts[lockKey(text)];
  const unrated = texts.filter((text) => !known(text));
  if (unrated.length > 0 && !env.GEMINI_API_KEY) {
    const message = `check-captions: ${unrated.length} of ${texts.length} strings have no verdict in ${LOCK_FILE} and GEMINI_API_KEY is not set.`;
    if (env.CI && env.GITHUB_EVENT_NAME !== "pull_request") {
      log.error(`${message} It is required here (add the repository secret).`);
      return 1;
    }
    // On GitHub this line becomes a warning annotation on the run.
    log.warn(env.CI ? `::warning::${message}` : `${message} Skipped.`);
    return 0;
  }

  // Saved after every batch, so a run that fails part-way keeps the verdicts it already has.
  const save = async () => {
    if (!lockPath) return;
    // A full run also forgets strings that no longer exist.
    const keep = files.length > 0 ? null : new Set(texts.map(lockKey));
    const verdicts = Object.fromEntries(
      Object.entries(lock.verdicts)
        .filter(([key]) => !keep || keep.has(key))
        .sort(([a], [b]) => a.localeCompare(b)),
    );
    await writeFile(lockPath, `${JSON.stringify({ version: 1, verdicts }, null, 2)}\n`);
  };
  const model = env.GEMINI_MODEL || DEFAULT_MODEL;
  for (let start = 0; start < unrated.length; start += BATCH_SIZE) {
    if (start > 0) await sleep(BATCH_PAUSE_MS);
    const batch = unrated.slice(start, start + BATCH_SIZE);
    for (const { text, ok, reason } of await rateBatch(batch, env, fetchImpl, sleep)) {
      lock.verdicts[lockKey(text)] = { verdict: ok ? "yes" : "no", reason, model, date: today };
    }
    await save();
  }
  if (unrated.length === 0) await save();

  const ratings: Rating[] = texts.map((text) => {
    const verdict = known(text);
    return { text, ok: verdict?.verdict === "yes", reason: verdict?.reason ?? "" };
  });
  const failures = ratings.filter((rating) => !rating.ok);
  for (const { text, reason } of failures) log.error(`✗ "${text}"\n    ${reason}`);
  if (unrated.length < texts.length) {
    log.log(`check-captions: ${texts.length - unrated.length} verdicts came from ${LOCK_FILE}.`);
  }
  log.log(`check-captions: ${ratings.length - failures.length} of ${ratings.length} strings pass.`);
  return failures.length > 0 ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exitCode = await main(process.argv.slice(2), process.env, fetch, console, {
    lockPath: LOCK_FILE,
  });
}
