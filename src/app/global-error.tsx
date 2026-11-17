"use client";

import { fontVariables } from "@/design/fonts";
import { themeInitScript } from "@/design/theme";
import { platformCaptions } from "@/platform/captions";
import { ProblemPage } from "@/platform/ProblemPage";
import "./globals.css";

/** The root layout itself failed: the same calm page, with its own html and body. */
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  const { title, note } = platformCaptions.pageError;
  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ProblemPage title={title} note={note} onRetry={retry} />
      </body>
    </html>
  );
}
