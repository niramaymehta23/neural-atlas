/**
 * Measures how hard each page of the built site works: CPU time of the page and of the graphics
 * process, main-thread work, drawing, long tasks and frame gaps, while it is left alone, used and
 * hidden. Not part of the test run: it takes about 50 s a page and needs a quiet machine.
 *
 *   pnpm build && pnpm exec tsx scripts/measure-load.ts --out load.json
 *
 * --pages a,b      only pages whose name is in the list (a lesson id, or "home", "sandbox", …)
 * --graphics       chip (default: the real graphics chip) or software (no graphics card)
 * --throttle 4     slows the page's main thread through CDP (frames and long tasks only: the
 *                  slowing itself burns CPU time, so read CPU from an unslowed run)
 * --view 1280x800  the viewport, at pixel ratio 2 (the default fills a 2560 × 1600 screen)
 * --quick          skips the 25 s wait, for a look at loading and use only
 * --site dir       the folder holding out/ (to measure an earlier build), default here
 * --stay 180       also leaves the page alone this many seconds before reading its memory
 *
 * CPU is a percentage of one core, which on Apple chips also depends on which core ran it and how
 * fast: to compare two builds, read `instructions` (and run them in turn). Chrome is driven over raw CDP, not Playwright, because
 * Playwright keeps every page believing it is visible: here another tab really covers it.
 */
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium } from "@playwright/test";

const option = (name: string, fallback = "") => {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? fallback : (process.argv[at + 1] ?? fallback);
};
const software = option("graphics", "chip") === "software";
const throttle = Number(option("throttle", "1"));
const quick = process.argv.includes("--quick");
const stay = Number(option("stay", "0"));
const out = option("out", "load.json");
const site = resolve(option("site", "."));
const [width = 1280, height = 800] = option("view", "1280x800").split("x").map(Number);
const only = option("pages").split(",").filter(Boolean);

const lessons = readdirSync(join(site, "out/learn"))
  .filter((file) => file.endsWith(".html"))
  .map((file) => file.slice(0, -5));
const journeys = readdirSync(join(site, "out/journeys"))
  .filter((file) => file.endsWith(".html"))
  .map((file) => `journeys/${file.slice(0, -5)}`);
const pages = [
  { name: "home", path: "/" },
  ...["sandbox", "journeys", "museum", "theatre", "two-player", "puzzle", "explore"].map(
    (name) => ({ name, path: `/${name}` }),
  ),
  ...journeys.map((name) => ({ name, path: `/${name}` })),
  ...lessons.map((name) => ({ name, path: `/learn/${name}` })),
].filter(({ name }) => only.length === 0 || only.includes(name));

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function freePort(): Promise<number> {
  const server = createServer().listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const address = server.address();
  await new Promise((resolve) => server.close(resolve));
  if (!address || typeof address === "string") throw new Error("no port");
  return address.port;
}

type Reply = Record<string, unknown>;
type Send = (method: string, params?: Reply, sessionId?: string) => Promise<Reply>;

/** Counts what the page does, from before its first script. */
const COUNTERS = `(() => {
  const n = (window.__load = { frames: 0, timers: 0, draws: 0, paints: 0, messages: 0, longTasks: [], gaps: [] });
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (f) => raf((t) => { if (!f.__probe) n.frames += 1; f(t); });
  for (const name of ["setTimeout", "setInterval"]) {
    const real = window[name].bind(window);
    window[name] = (f, ms, ...rest) =>
      typeof f === "function" ? real((...a) => { n.timers += 1; f(...a); }, ms, ...rest) : real(f, ms, ...rest);
  }
  for (const gl of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
    for (const name of ["drawArrays", "drawElements"]) {
      const real = gl.prototype[name];
      gl.prototype[name] = function (...a) { n.draws += 1; return real.apply(this, a); };
    }
  }
  for (const name of ["clearRect", "fillRect", "putImageData", "drawImage", "fill", "stroke", "fillText"]) {
    const real = CanvasRenderingContext2D.prototype[name];
    CanvasRenderingContext2D.prototype[name] = function (...a) { n.paints += 1; return real.apply(this, a); };
  }
  const RealWorker = window.Worker;
  window.Worker = class extends RealWorker {
    constructor(...a) { super(...a); this.addEventListener("message", () => { n.messages += 1; }); }
  };
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) n.longTasks.push(e.duration);
  }).observe({ type: "longtask", buffered: true });
})()`;

/**
 * What macOS says a process has done since it started: instructions run (billions), energy used
 * (joules) and times it woke an idle core. Unlike CPU time, instructions are the same whichever
 * core ran them and however fast it ran. (`proc_pid_rusage`, which needs no special rights.)
 */
const RUSAGE = `
import ctypes, json, sys
lib = ctypes.CDLL("/usr/lib/libproc.dylib")
out = {}
for pid in sys.argv[1:]:
    info = (ctypes.c_uint64 * 128)()
    if lib.proc_pid_rusage(int(pid), 6, ctypes.byref(info)) == 0:
        v = info[2:]
        out[pid] = [v[29] / 1e9, v[40] / 1e9, v[2] + v[3]]
print(json.dumps(out))
`;
type Spent = { instructions: number; energy: number; wakeups: number };
function rusage(pids: number[]): Map<number, Spent> {
  if (process.platform !== "darwin") return new Map();
  try {
    const said = execFileSync("python3", ["-c", RUSAGE, ...pids.map(String)]).toString();
    return new Map(
      Object.entries(JSON.parse(said) as Record<string, [number, number, number]>).map(
        ([pid, [instructions, energy, wakeups]]) => [
          Number(pid),
          { instructions, energy, wakeups },
        ],
      ),
    );
  } catch {
    return new Map();
  }
}

/** Watches frame gaps for a while (its own frames are not counted as the page's). */
const WATCH_GAPS = `(ms) => new Promise((done) => {
  const gaps = []; let last = performance.now(); const end = last + ms;
  const step = (now) => { gaps.push(now - last); last = now; if (now < end) requestAnimationFrame(step); else done(gaps.slice(1)); };
  step.__probe = true; requestAnimationFrame(step);
})`;

type Reading = {
  at: number;
  renderer: number;
  gpu: number;
  /** Page and graphics processes together. */
  instructions: number;
  energy: number;
  wakeups: number;
  main: number;
  styles: number;
  layouts: number;
  frames: number;
  timers: number;
  draws: number;
  paints: number;
  messages: number;
  longTaskMs: number;
};

/** What went on between two readings: CPU as a share of one core, the rest per second. */
function between(a: Reading, b: Reading) {
  const seconds = (b.at - a.at) / 1000;
  const share = (key: "renderer" | "gpu" | "main") =>
    Math.round(((b[key] - a[key]) / seconds) * 1000) / 10;
  const rate = (
    key: "styles" | "layouts" | "frames" | "timers" | "draws" | "paints" | "messages",
  ) => Math.round(((b[key] - a[key]) / seconds) * 10) / 10;
  const perSecond = (key: "instructions" | "energy" | "wakeups") =>
    Math.round(((b[key] - a[key]) / seconds) * 1000) / 1000;
  return {
    cpu: share("renderer"),
    gpuCpu: share("gpu"),
    /** Billions of instructions a second, watts and core wake-ups a second (macOS only). */
    instructions: perSecond("instructions"),
    watts: perSecond("energy"),
    wakeups: Math.round(perSecond("wakeups")),
    mainThread: share("main"),
    frames: rate("frames"),
    timers: rate("timers"),
    draws: rate("draws"),
    paints: rate("paints"),
    messages: rate("messages"),
    styles: rate("styles"),
    layouts: rate("layouts"),
    longTaskMsPerS: Math.round((b.longTaskMs - a.longTaskMs) / seconds),
  };
}

function gapSummary(gaps: number[]) {
  const sorted = [...gaps].sort((a, b) => a - b);
  const round = (value: number) => Math.round(value * 10) / 10;
  return {
    mean: round(gaps.reduce((sum, gap) => sum + gap, 0) / Math.max(1, gaps.length)),
    p95: round(sorted[Math.floor(sorted.length * 0.95)] ?? 0),
    worst: round(sorted.at(-1) ?? 0),
    dropped: round((gaps.filter((gap) => gap > 33).length / Math.max(1, gaps.length)) * 100),
  };
}

/** Puts the keyboard on the page's first dial; false when it has none. */
const FOCUS_DIAL = `(() => {
  const dial = document.querySelector("[data-region=dock] [role=slider], main [role=slider]:not([aria-label=Moment])");
  dial?.focus(); return Boolean(dial);
})()`;

/** Presses the button that sets the page going, and says which it was. */
const PRESS_START = `(() => {
  const skip = "[role=radiogroup], [aria-label=Mission], [aria-label='Make a guess'], nav, header, [data-share]";
  // The experiences' own start buttons sit among other controls: those first.
  const start = [...document.querySelectorAll("main button")].find(
    (b) => b.offsetParent && !b.disabled && /^(start practising|start the race|play|start)$/i.test(b.textContent.trim()) && !b.closest(skip));
  if (start) { start.click(); return start.textContent.trim(); }
  for (const region of ["[data-region=dock]", "[data-region=stage] [data-region=scene]", "main"]) {
    const button = [...document.querySelectorAll(region + " button")].find(
      (b) => b.offsetParent && !b.disabled && !b.hasAttribute("aria-pressed") && !b.hasAttribute("aria-expanded")
        && !b.hasAttribute("role") && !b.closest(skip) && !/camera|^start again|start fresh|^rub|idea card/i.test(b.textContent));
    if (button) { button.click(); return button.textContent.trim().slice(0, 40); }
  }
  return null;
})()`;

async function launch(): Promise<{
  browser: ChildProcess;
  send: Send;
  close: () => Promise<void>;
}> {
  const profile = mkdtempSync(join(tmpdir(), "atlas-load-"));
  const browser = spawn(
    process.env.CHROMIUM ?? chromium.executablePath(),
    [
      "--headless=new",
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      "--no-first-run",
      "--mute-audio",
      "--disable-extensions",
      "--disable-background-networking",
      "--disable-component-update",
      "--force-color-profile=srgb",
      `--window-size=${width},${height}`,
      ...(software ? ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] : []),
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  const url = await new Promise<string>((resolve, reject) => {
    let said = "";
    browser.stderr.on("data", (data: Buffer) => {
      said += data.toString();
      const match = /ws:\/\/\S+/.exec(said);
      if (match) resolve(match[0]);
    });
    browser.once("exit", () => reject(new Error(said)));
  });
  const socket = new WebSocket(url);
  await new Promise((resolve) => socket.addEventListener("open", resolve, { once: true }));
  const waiting = new Map<number, { resolve: (r: Reply) => void; reject: (e: Error) => void }>();
  listeners.clear();
  let id = 0;
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(String(data)) as {
      id?: number;
      method?: string;
      params?: Reply;
      result?: Reply;
      error?: { message: string };
    };
    if (message.id === undefined) {
      for (const listen of listeners) listen(message.method ?? "", message.params ?? {});
      return;
    }
    const pending = waiting.get(message.id);
    waiting.delete(message.id);
    if (message.error) pending?.reject(new Error(message.error.message));
    else pending?.resolve(message.result ?? {});
  });
  const send: Send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      id += 1;
      waiting.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params, sessionId }));
    });
  const close = async () => {
    socket.close();
    const gone = new Promise((resolve) => browser.once("exit", resolve));
    browser.kill();
    await gone;
    rmSync(profile, { recursive: true, force: true, maxRetries: 5 });
  };
  return { browser, send, close };
}
const listeners = new Set<(method: string, params: Reply) => void>();

async function measure(path: string, port: number) {
  const { send, close } = await launch();
  try {
    const { targetId } = await send("Target.createTarget", { url: "about:blank" });
    const { targetId: cover } = await send("Target.createTarget", { url: "about:blank" });
    await send("Target.activateTarget", { targetId });
    const { sessionId } = (await send("Target.attachToTarget", { targetId, flatten: true })) as {
      sessionId: string;
    };
    const page = (method: string, params: Reply = {}) => send(method, params, sessionId);
    const evaluate = async <T>(expression: string): Promise<T> => {
      const { result } = (await page("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
      })) as { result: { value: T } };
      return result.value;
    };
    // Network: what came over the wire, scripts and model files apart. Cached on purpose: no.
    const bytes = { scripts: 0, models: 0, other: 0 };
    const urls = new Map<string, string>();
    listeners.add((method, params) => {
      if (method === "Network.responseReceived") {
        const { requestId, response } = params as { requestId: string; response: { url: string } };
        urls.set(requestId, response.url);
      }
      if (method === "Network.loadingFinished") {
        const { requestId, encodedDataLength } = params as {
          requestId: string;
          encodedDataLength: number;
        };
        const url = urls.get(requestId) ?? "";
        if (url.includes("/models/")) bytes.models += encodedDataLength;
        else if (url.includes(".js")) bytes.scripts += encodedDataLength;
        else bytes.other += encodedDataLength;
      }
    });
    await page("Network.enable");
    await page("Page.enable");
    await page("Performance.enable");
    await page("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 2,
      mobile: false,
    });
    if (throttle > 1) await page("Emulation.setCPUThrottlingRate", { rate: throttle });
    await page("Page.addScriptToEvaluateOnNewDocument", { source: COUNTERS });

    const spent = new Map<number, { type: string; cpuTime: number }>();
    const used = new Map<number, Spent>();
    const read = async (): Promise<Reading> => {
      const { processInfo } = (await send("SystemInfo.getProcessInfo")) as {
        processInfo: { id: number; type: string; cpuTime: number }[];
      };
      // A process that has ended keeps the time it used, so a reading never goes backwards.
      for (const { id, type, cpuTime } of processInfo) spent.set(id, { type, cpuTime });
      const ours = processInfo.filter(({ type }) => type === "renderer" || type === "GPU");
      for (const [pid, spending] of rusage(ours.map(({ id }) => id))) used.set(pid, spending);
      const total = (key: keyof Spent) =>
        [...used.values()].reduce((sum, one) => sum + one[key], 0);
      const cpu = (type: string) =>
        [...spent.values()].reduce((sum, one) => sum + (one.type === type ? one.cpuTime : 0), 0);
      const { metrics } = (await page("Performance.getMetrics")) as {
        metrics: { name: string; value: number }[];
      };
      const metric = (name: string) => metrics.find((one) => one.name === name)?.value ?? 0;
      const counts = await evaluate<{
        frames: number;
        timers: number;
        draws: number;
        paints: number;
        messages: number;
        longTasks: number[];
      }>(
        "(({ frames, timers, draws, paints, messages, longTasks }) => ({ frames, timers, draws, paints, messages, longTasks }))(window.__load)",
      );
      return {
        at: performance.now(),
        renderer: cpu("renderer"),
        gpu: cpu("GPU"),
        instructions: total("instructions"),
        energy: total("energy"),
        wakeups: total("wakeups"),
        main: metric("TaskDuration"),
        styles: metric("RecalcStyleCount"),
        layouts: metric("LayoutCount"),
        frames: counts.frames,
        timers: counts.timers,
        draws: counts.draws,
        paints: counts.paints,
        messages: counts.messages,
        longTaskMs: counts.longTasks.reduce((sum, ms) => sum + ms, 0),
      };
    };
    const over = async (ms: number, during: () => Promise<unknown> = () => Promise.resolve()) => {
      const before = await read();
      await Promise.all([wait(ms), during()]);
      return between(before, await read());
    };
    const key = async (name: string) => {
      for (const type of ["keyDown", "keyUp"])
        await page("Input.dispatchKeyEvent", {
          type,
          key: name,
          code: name,
          windowsVirtualKeyCode: name === "ArrowRight" ? 39 : 37,
        });
    };
    /** Presses the focused dial ten times a second, out and back. */
    const dialling = async (ms: number) => {
      const end = performance.now() + ms;
      for (let at = 0; performance.now() < end; at += 1) {
        await key(at % 6 < 3 ? "ArrowRight" : "ArrowLeft");
        await wait(100);
      }
    };
    const moving = async (ms: number) => {
      const end = performance.now() + ms;
      for (let at = 0; performance.now() < end; at += 1) {
        await page("Input.dispatchMouseEvent", {
          type: "mouseMoved",
          x: Math.round(width * (0.5 + 0.35 * Math.sin(at / 12))),
          y: Math.round(height * (0.55 + 0.25 * Math.cos(at / 9))),
        });
        await wait(33);
      }
    };

    await page("Page.navigate", { url: `http://localhost:${port}${path}` });
    // Until the page has its scene and the network has gone quiet.
    await wait(1000);
    for (let quiet = 0, last = -1, tries = 0; quiet < 4 && tries < 60; tries += 1) {
      const now = bytes.scripts + bytes.models + bytes.other;
      quiet = now === last ? quiet + 1 : 0;
      last = now;
      await wait(500);
    }
    const first = await read();
    const load = {
      cpuSeconds: Math.round(first.renderer * 100) / 100,
      gpuCpuSeconds: Math.round(first.gpu * 100) / 100,
      instructions: Math.round(first.instructions * 100) / 100,
      longTaskMs: Math.round(first.longTaskMs),
      scriptKb: Math.round(bytes.scripts / 1024),
      modelKb: Math.round(bytes.models / 1024),
    };
    const loaded = await over(4000);
    if (!quick) await wait(21_000);
    const rested = quick ? null : await over(5000);

    const home = path === "/";
    const hasDial = await evaluate<boolean>(FOCUS_DIAL);
    const turn = (ms: number) => (hasDial ? dialling(ms) : moving(ms));
    const dial = home ? await over(4000, () => moving(4000)) : await over(3000, () => turn(3000));
    const dialGaps = gapSummary(
      (
        await Promise.all([
          evaluate<number[]>(`(${WATCH_GAPS})(2000)`),
          home ? moving(2000) : turn(2000),
        ])
      )[0],
    );
    const pressed = home || path === "/theatre" ? null : await evaluate<string | null>(PRESS_START);
    const active = await over(4000);
    const activeGaps = gapSummary(await evaluate<number[]>(`(${WATCH_GAPS})(2000)`));

    await send("Target.activateTarget", { targetId: cover });
    await wait(2000);
    const sight = await evaluate<string>("document.visibilityState");
    const hidden = await over(5000);
    await send("Target.activateTarget", { targetId });
    await wait(1500);
    const back = await over(3000);
    if (stay > 0) await wait(stay * 1000);
    await page("HeapProfiler.enable");
    await page("HeapProfiler.collectGarbage");
    const { usedSize } = (await page("Runtime.getHeapUsage")) as { usedSize: number };
    return {
      load: { ...load, modelKbAfterUse: Math.round(bytes.models / 1024) },
      loaded,
      rested,
      dial: { ...dial, gaps: dialGaps },
      pressed,
      active: { ...active, gaps: activeGaps },
      hidden: { ...hidden, sight },
      back,
      heapMb: Math.round(usedSize / 1024 / 102.4) / 10,
    };
  } finally {
    await close();
  }
}

const port = await freePort();
const server = spawn(
  process.execPath,
  ["--import", import.meta.resolve("tsx"), resolve("scripts/serve-static.ts"), `${port}`],
  { stdio: "ignore", cwd: site },
);
try {
  await wait(1500);
  const results: Record<string, unknown> = {};
  try {
    Object.assign(results, (JSON.parse(readFileSync(out, "utf8")) as { pages: object }).pages);
  } catch {
    // A first run: nothing to add to.
  }
  for (const { name, path } of pages) {
    const result = await measure(path, port);
    results[name] = result;
    const { loaded, rested, active, hidden } = result;
    console.log(
      `${name}: loaded ${loaded.cpu}+${loaded.gpuCpu}% rested ${rested?.cpu}+${rested?.gpuCpu}% ` +
        `active ${active.cpu}+${active.gpuCpu}% (${result.pressed}) hidden ${hidden.cpu}+${hidden.gpuCpu}%`,
    );
    const settings = { software, throttle, view: `${width}x${height}@2`, quick };
    writeFileSync(out, JSON.stringify({ settings, pages: results }, null, 1));
  }
} finally {
  server.kill();
}
