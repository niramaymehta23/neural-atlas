// @vitest-environment node
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { ESLint } from "eslint";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const root = process.cwd();
const eslint = new ESLint({ cwd: root });

async function ruleIds(filePath: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath });
  return (result?.messages ?? []).map((m) => m.ruleId ?? m.message);
}

describe("layer boundaries", () => {
  // Import targets must exist for the resolver; the real layers arrive in later stages.
  const id = `lint-probe-${process.pid}`;
  const probes = {
    engine: `src/engine/${id}.ts`,
    unknown: `src/${id}/shared.ts`,
    module: `src/modules/${id}/other/index.ts`,
  };
  const created: string[] = [];

  beforeAll(() => {
    for (const file of Object.values(probes)) {
      const parts = file.split("/").slice(0, -1);
      for (let depth = 2; depth <= parts.length; depth += 1) {
        const dir = join(root, ...parts.slice(0, depth));
        if (!existsSync(dir)) created.push(dir);
      }
      mkdirSync(join(root, ...parts), { recursive: true });
      writeFileSync(join(root, file), "export const probe = 1;\nexport type Probe = number;\n");
    }
    // The first lint loads the whole typed project; do it once here, not inside the first test,
    // so a busy machine never times that test out.
    return eslint.lintText("export {};\n", { filePath: "src/ui/Warmup.tsx" }).then(() => undefined);
  }, 60_000);
  afterAll(() => {
    for (const file of Object.values(probes)) rmSync(join(root, file), { force: true });
    for (const dir of created.reverse()) rmSync(dir, { recursive: true, force: true });
  });

  const fails = async (from: string, code: string) =>
    expect(await ruleIds(from, code)).toEqual(
      expect.arrayContaining([expect.stringMatching(/^boundaries\//)]),
    );
  const passes = async (from: string, code: string) =>
    expect((await ruleIds(from, code)).filter((id) => id.startsWith("boundaries/"))).toEqual([]);

  it("fails a ui → engine import", () =>
    fails(
      "src/ui/Probe.tsx",
      `import { probe } from "@/engine/${id}";\nexport const used = probe;\n`,
    ));

  it("allows a ui → design import", () =>
    passes(
      "src/ui/Probe.tsx",
      `import { springs } from "@/design/motion";\nexport const used = springs;\n`,
    ));

  it("fails an import through a folder outside the layer table", () =>
    fails(
      "src/ui/Probe.tsx",
      `import { probe } from "@/${id}/shared";\nexport const used = probe;\n`,
    ));

  it("lets visuals see engine types but not engine values", async () => {
    await passes(
      "src/visuals/Probe.tsx",
      `import type { Probe } from "@/engine/${id}";\nexport type Used = Probe;\n`,
    );
    await fails(
      "src/visuals/Probe.tsx",
      `import { probe } from "@/engine/${id}";\nexport const used = probe;\n`,
    );
  });

  it("never lets one module import another", () =>
    fails(
      `src/modules/${id}/mine/index.ts`,
      `import { probe } from "@/modules/${id}/other";\nexport const used = probe;\n`,
    ));
});

describe("design owns colours, fonts and easings", () => {
  it.each([
    ["a hex colour", `export const c = "#D97757";`],
    ["an rgb colour", `export const c = "rgb(1, 2, 3)";`],
    ["a Tailwind arbitrary colour", `export const c = "bg-[#FAF9F5]";`],
    ["an easing curve", `export const e = "cubic-bezier(0.2, 0, 0, 1)";`],
    ["a named easing", `export const t = { duration: 0.3, ease: "easeOut" };`],
    ["a spring", `export const t = { type: "spring", stiffness: 300 };`],
    ["a font family", `export const s = { fontFamily: "Georgia" };`],
    ["a named colour in a style", `export const s = { background: "crimson" };`],
    ["a named colour on an SVG shape", `export const e = <path fill="crimson" />;`],
    ["a Tailwind arbitrary named colour", `export const c = "text-[crimson]";`],
    ["a quoted spring key", `export const t = { "stiffness": 300 };`],
    ["a next/font import", `import { Inter } from "next/font/google";\nexport const f = Inter;`],
  ])("bans %s outside src/design", async (_name, code) => {
    const ids = await ruleIds("src/ui/Probe.tsx", `${code}\n`);
    expect(ids.some((id) => id.startsWith("no-restricted"))).toBe(true);
  });

  it("allows tokens, sizes and plain SVG values outside src/design", async () => {
    const code = `export const e = <path fill="none" stroke="currentColor" className="text-[13px] bg-[var(--clay)]" style={{ color: "var(--ink)" }} />;\n`;
    expect(await ruleIds("src/ui/Probe.tsx", code)).toEqual([]);
  });

  it("allows them inside src/design", async () => {
    expect(await ruleIds("src/design/probe.ts", `export const c = "#D97757";\n`)).toEqual([]);
  });

  it("keeps CSS inside src/design (globals.css only imports)", () => {
    const cssFiles = readdirSync(join(root, "src"), { recursive: true, encoding: "utf8" })
      .filter((file) => file.endsWith(".css"))
      .map((file) => relative(root, join(root, "src", file)));
    expect(cssFiles.sort()).toEqual(["src/app/globals.css", "src/design/tokens.css"]);
    const globals = readFileSync(join(root, "src/app/globals.css"), "utf8");
    const lines = globals.split("\n").filter((line) => line.trim());
    // An import may name its source folder: Tailwind's scan is limited to src/ (tailwind-sources.test.ts).
    for (const line of lines) expect(line).toMatch(/^@import "[^"]+"( source\("[^"]+"\))?;$/);
  });
});
