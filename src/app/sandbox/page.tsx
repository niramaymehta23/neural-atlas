import type { Metadata } from "next";
import { pages } from "@/experiences/shell/captions";
import { SandboxPage } from "@/experiences/sandbox/SandboxPage";
import { platformCaptions } from "@/platform/captions";

export const metadata: Metadata = {
  title: platformCaptions.site.pageTitle(pages.sandbox.title),
  description: pages.sandbox.opening,
};

export default function Page() {
  return <SandboxPage />;
}
