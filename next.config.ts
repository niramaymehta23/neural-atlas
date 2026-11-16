import { readFileSync } from "node:fs";
import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import { parseHeaders } from "./scripts/headers";

// Static export: the host applies `public/_headers` (COOP/COEP for SharedArrayBuffer), so
// `headers()` is unused in production. `next dev` is a real server, so it serves the same file.
const devHeaders = () =>
  parseHeaders(readFileSync("public/_headers", "utf8")).map(({ path, headers }) => ({
    source: path.replace(/\*/g, ":path*"),
    headers: headers.map(([key, value]) => ({ key, value })),
  }));

export default function config(phase: string): NextConfig {
  return {
    output: "export",
    reactStrictMode: true,
    images: { unoptimized: true },
    // `next dev` would otherwise write an AGENTS.md into the repo.
    agentRules: false,
    ...(phase === PHASE_DEVELOPMENT_SERVER && { headers: async () => devHeaders() }),
  };
}
