import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative } from "node:path";
import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import { parseHeaders } from "./scripts/headers";

// Static export: the host applies `public/_headers` (COOP/COEP for SharedArrayBuffer), so
// `headers()` is unused in production. `next dev` is a real server, so it serves the same file.
// Caching rules are left out: dev files are not content-hashed, so "immutable" would serve stale code.
const devHeaders = () =>
  parseHeaders(readFileSync("public/_headers", "utf8"))
    .map(({ path, headers }) => ({
      source: path.replace(/\*/g, ":path*"),
      headers: headers
        .filter(([key]) => key.toLowerCase() !== "cache-control")
        .map(([key, value]) => ({ key, value })),
    }))
    .filter(({ headers }) => headers.length > 0);

// Transformers.js imports "onnxruntime-web/webgpu", whose default build embeds the 26 MB asyncify
// runtime and makes the bundler emit that wasm (over Cloudflare Pages' 25 MiB file limit). The
// external-wasm build of the same entry loads the runtime from `wasmPaths` instead: the plain
// threaded build that scripts/copy-runtime.ts serves from public/models (see runtime.ts).
const require = createRequire(import.meta.url);
const ortDist = dirname(
  createRequire(require.resolve("@huggingface/transformers")).resolve("onnxruntime-web"),
);
const ortExternalWasm = `./${relative(process.cwd(), join(ortDist, "ort.webgpu.min.mjs"))}`;

export default function config(phase: string): NextConfig {
  return {
    output: "export",
    reactStrictMode: true,
    images: { unoptimized: true },
    // `next dev` would otherwise write an AGENTS.md into the repo.
    agentRules: false,
    turbopack: { resolveAlias: { "onnxruntime-web/webgpu": ortExternalWasm } },
    ...(phase === PHASE_DEVELOPMENT_SERVER && { headers: async () => devHeaders() }),
  };
}
