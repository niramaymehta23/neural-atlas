/**
 * Serves the static export (`out/`) the way the host (Cloudflare Pages) will: with the headers from
 * `out/_headers` (copied from `public/_headers`), so cross-origin isolation and caching are tested
 * from their one source; with the host's content types; and redirecting `/x/` to `/x` (308).
 * Usage: pnpm serve [port]
 */
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { parseHeaders } from "./headers";

const ROOT = join(process.cwd(), "out");
const PORT = Number(process.argv[2] ?? 4173);
const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".wasm": "application/wasm",
  ".onnx": "application/octet-stream",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

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

/** A `_headers` path glob ("/*") as a pattern over request paths. */
const toPattern = (glob: string) =>
  new RegExp(`^${glob.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`);
const rules = parseHeaders(await readFile(join(ROOT, "_headers"), "utf8")).map((rule) => ({
  pattern: toPattern(rule.path),
  headers: rule.headers,
}));

createServer(async (request, response) => {
  let urlPath: string;
  try {
    urlPath = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
  } catch {
    response.writeHead(400).end();
    return;
  }
  // Like the host: a trailing slash redirects to the page without it, keeping the query.
  if (urlPath.length > 1 && urlPath.endsWith("/")) {
    const { pathname, search } = new URL(request.url ?? "/", "http://localhost");
    // One leading slash, so "//elsewhere/" can never become a link to another site.
    const location = `/${pathname.replace(/^\/+|\/+$/g, "")}${search}`;
    response.writeHead(308, { Location: location }).end();
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
