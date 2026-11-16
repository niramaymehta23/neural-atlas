/**
 * Reads `public/_headers` (Cloudflare/Netlify format: a path line, then indented `Name: value`
 * lines), the one source of the site's response headers. Used by the static server for e2e and
 * by `next dev`, so both serve exactly what the host serves.
 */
export type HeaderRule = { path: string; headers: [string, string][] };

export function parseHeaders(text: string): HeaderRule[] {
  const rules: HeaderRule[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    if (!/^\s/.test(line)) {
      rules.push({ path: line.trim(), headers: [] });
      continue;
    }
    const [name = "", ...value] = line.trim().split(":");
    rules.at(-1)?.headers.push([name.trim(), value.join(":").trim()]);
  }
  return rules;
}
