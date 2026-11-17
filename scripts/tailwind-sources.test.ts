// @vitest-environment node
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative, resolve } from "node:path";

/**
 * Tailwind reads only src/ for class names: src/app/globals.css imports it with source("../"). Its automatic detection scans the
 * whole project, where the 21 MB ONNX model took ~3 minutes and once timed out the CI build. This asks
 * Tailwind itself which files the stylesheet makes it scan, and how long that takes.
 */
const require = createRequire(import.meta.url);
// Tailwind's own packages, as @tailwindcss/postcss resolves them (they are not direct dependencies,
// so only the parts used here are typed).
type Source = { base: string; pattern: string; negated: boolean };
type Compile = (
  css: string,
  options: { base: string; onDependency: (path: string) => void },
) => Promise<{ root: "none" | { base: string; pattern: string } | null; sources: Source[] }>;
type ScannerClass = new (options: { sources: Source[] }) => { scan(): string[]; files: string[] };

const fromPostcss = createRequire(require.resolve("@tailwindcss/postcss"));
const { compile } = fromPostcss("@tailwindcss/node") as { compile: Compile };
const { Scanner } = createRequire(fromPostcss.resolve("@tailwindcss/node"))(
  "@tailwindcss/oxide",
) as { Scanner: ScannerClass };

const STYLESHEET = "src/app/globals.css";

async function scannedFiles() {
  const base = resolve("src/app");
  const compiler = await compile(readFileSync(STYLESHEET, "utf8"), { base, onDependency() {} });
  const { root } = compiler;
  // No source(...) on the import means the whole project: fail now instead of after minutes of scanning.
  if (root === null) throw new Error(`${STYLESHEET} lets Tailwind scan the whole project.`);
  const auto = root === "none" ? [] : [{ ...root, negated: false }];
  const scanner = new Scanner({ sources: [...auto, ...compiler.sources] });
  const started = performance.now();
  const candidates = scanner.scan();
  return { files: scanner.files, candidates, ms: performance.now() - started };
}

describe("tailwind sources", () => {
  it("scans only src/, never models, docs or the lock file", async () => {
    const { files, candidates, ms } = await scannedFiles();
    const outside = files
      .map((file) => relative(process.cwd(), file))
      .filter((f) => !f.startsWith(`src${"/"}`));
    expect(outside).toEqual([]);
    expect(files).toContain(join(process.cwd(), "src/app/page.tsx"));
    expect(candidates).toContain("text-accent-ink");
    // Scanning src/ takes milliseconds; the whole project took minutes.
    expect(ms).toBeLessThan(5_000);
  }, 30_000);
});
