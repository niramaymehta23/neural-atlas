/**
 * Serves the static export (`out/`) the way the host will: with the headers from `out/_headers`
 * (copied from `public/_headers`), so cross-origin isolation is tested from its one source.
 * Usage: pnpm serve [port]
 */
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const ROOT = join(process.cwd(), "out");
const PORT = Number(process.argv[2] ?? 4173);
const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

type HeaderRule = { pattern: RegExp; headers: [string, string][] };

/** Parses the Cloudflare/Netlify `_headers` format: a path line, then indented `Name: value` lines. */
function parseHeaders(text: string): HeaderRule[] {
  const rules: HeaderRule[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    if (!/^\s/.test(line)) {
      const glob = line
        .trim()
        .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, ".*");
      rules.push({ pattern: new RegExp(`^${glob}$`), headers: [] });
      continue;
    }
    const [name = "", ...value] = line.trim().split(":");
    rules.at(-1)?.headers.push([name.trim(), value.join(":").trim()]);
  }
  return rules;
}

async function firstFile(paths: string[]): Promise<{ path: string; body: Buffer } | null> {
  for (const path of paths) {
    try {
      return { path, body: await readFile(path) };
    } catch {
      // Try the next candidate.
    }
  }
  return null;
}

const rules = parseHeaders(await readFile(join(ROOT, "_headers"), "utf8"));

createServer(async (request, response) => {
  let urlPath: string;
  try {
    urlPath = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
  } catch {
    response.writeHead(400).end();
    return;
  }
  // normalize() resolves "..", and an absolute path cannot climb above ROOT once joined.
  const base = join(ROOT, normalize(urlPath));
  const file =
    (await firstFile([base, `${base}.html`, join(base, "index.html")])) ??
    (await firstFile([join(ROOT, "404.html")]));

  for (const rule of rules) {
    if (rule.pattern.test(urlPath))
      for (const [name, value] of rule.headers) response.setHeader(name, value);
  }
  if (!file) {
    response.writeHead(404).end();
    return;
  }
  const notFound = file.path.endsWith("404.html") && !urlPath.endsWith("404.html");
  response.writeHead(notFound ? 404 : 200, {
    "Content-Type": TYPES[extname(file.path)] ?? "application/octet-stream",
  });
  response.end(file.body);
}).listen(PORT, () => console.log(`Serving out/ on http://localhost:${PORT}`));
