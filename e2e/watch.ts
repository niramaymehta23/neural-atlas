import type { Page } from "@playwright/test";

/**
 * Console errors, page errors and any request that leaves the site under test (COEP forbids
 * them), collected from the moment it is called. Every spec uses this one collector.
 */
export function watch(page: Page, siteHost = "localhost") {
  const errors: string[] = [];
  const elsewhere: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    const { protocol, hostname } = new URL(request.url());
    if (protocol.startsWith("http") && hostname !== siteHost) elsewhere.push(request.url());
  });
  return { errors, elsewhere };
}
