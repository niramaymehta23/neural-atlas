import Link from "next/link";
import { Robot } from "@/ui/illustrations/Robot";

// Placeholder until the constellation home (stage 04).
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-6 px-6 text-center">
      <Robot />
      <h1 className="text-4xl">Neural Atlas</h1>
      <p className="text-ink-soft">The map of ideas is being drawn.</p>
      <Link href="/styleguide" className="text-accent underline-offset-4 hover:underline">
        See the style guide
      </Link>
    </main>
  );
}
