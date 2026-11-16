import { uiCaptions } from "./captions";
type TermTagProps = {
  /** The real name, shown only once the idea has been felt: "gradient descent". */
  term: string;
  lead?: string;
};

/** A small tag naming the real term at the end of a story. */
export function TermTag({ term, lead = uiCaptions.termLead }: TermTagProps) {
  return (
    <p className="inline-flex items-baseline gap-1.5 rounded-pill border border-hairline bg-inset px-3 py-1 text-sm text-ink-soft">
      {lead} <em className="font-serif text-base text-ink not-italic">{term}</em>
    </p>
  );
}
