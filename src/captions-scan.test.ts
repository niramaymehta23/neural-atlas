// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";

/**
 * Learner-facing words live in captions files, where they stay reviewable (A11Y-23).
 * This scan fails on words written straight into components: JSX text, and literal strings in
 * spoken attributes (aria-label, title, placeholder, alt) or page metadata.
 */
const root = process.cwd();
const SPOKEN = new Set([
  "aria-label",
  "aria-description",
  "aria-valuetext",
  "title",
  "placeholder",
  "alt",
]);
const SKIP = [/\.test\.tsx?$/, /\.mock\.tsx?$/, /\/captions\.ts$/, /^src\/app\/styleguide\//];
const LETTERS = /\p{L}{2,}/u;

function sourceFiles(): string[] {
  return readdirSync(join(root, "src"), { recursive: true, encoding: "utf8" })
    .map((file) => relative(root, join(root, "src", file)))
    .filter((file) => /\.tsx?$/.test(file) && !SKIP.some((pattern) => pattern.test(file)));
}

function findings(file: string): string[] {
  const text = readFileSync(join(root, file), "utf8");
  const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
  const found: string[] = [];
  const report = (node: ts.Node, what: string) =>
    found.push(`${file}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1} ${what}`);
  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node) && LETTERS.test(node.text)) report(node, `text "${node.text.trim()}"`);
    if (
      ts.isJsxAttribute(node) &&
      SPOKEN.has(node.name.getText()) &&
      node.initializer &&
      ts.isStringLiteral(node.initializer) &&
      LETTERS.test(node.initializer.text)
    )
      report(node, `${node.name.getText()}="${node.initializer.text}"`);
    // export const metadata = { title: "…", description: "…" }
    if (
      ts.isPropertyAssignment(node) &&
      ["title", "description"].includes(node.name.getText()) &&
      ts.isStringLiteral(node.initializer) &&
      LETTERS.test(node.initializer.text) &&
      file.startsWith("src/app/")
    )
      report(node, `${node.name.getText()}: "${node.initializer.text}"`);
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

describe("learner-facing words live in captions files", () => {
  it("finds no words written straight into components or page metadata", () => {
    expect(sourceFiles().flatMap(findings)).toEqual([]);
  });

  it("catches a word written into JSX (so the scan itself works)", () => {
    const source = ts.createSourceFile(
      "probe.tsx",
      `export const P = () => <p aria-label="Hello there">Hi friend</p>;`,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    let words = 0;
    const visit = (node: ts.Node) => {
      if (ts.isJsxText(node) && LETTERS.test(node.text)) words += 1;
      ts.forEachChild(node, visit);
    };
    visit(source);
    expect(words).toBe(1);
  });
});
