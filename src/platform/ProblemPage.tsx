import { platformCaptions } from "./captions";
import { SiteNav } from "./SiteNav";

type ProblemPageProps = {
  title: string;
  note: string;
  /** Present when trying again could help. */
  onRetry?: () => void;
};

/** A calm full page for a missing page or one that broke, with the way back to the map. */
export function ProblemPage({ title, note, onRetry }: ProblemPageProps) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-6 px-4 py-6">
      <SiteNav current="other" />
      <div className="flex grow flex-col justify-center gap-4 pb-24">
        <h1 tabIndex={-1} className="text-4xl leading-tight outline-none">
          {title}
        </h1>
        <p className="text-ink-soft">{note}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="min-h-11 self-start rounded-pill bg-accent px-5 py-2 text-on-accent"
          >
            {platformCaptions.problem.retry}
          </button>
        )}
      </div>
    </main>
  );
}
