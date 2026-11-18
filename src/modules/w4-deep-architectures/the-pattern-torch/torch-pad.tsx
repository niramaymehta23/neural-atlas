"use client";

import { useId } from "react";
import { words } from "./captions";
import { CELLS, nextCell, type Cell } from "./model";

type Props = {
  torch: readonly Cell[];
  editable: boolean;
  onChange: (torch: Cell[]) => void;
};

/** A square's look: light squares are bare paper with a ring, dark ones are ink, "anything" is dotted. */
function CellMark({ cell }: { cell: Cell }) {
  if (cell === 1)
    return (
      <svg viewBox="0 0 20 20" className="size-5" aria-hidden>
        <circle cx={10} cy={10} r={6} fill="none" stroke="var(--color-ink)" strokeWidth={2} />
      </svg>
    );
  if (cell === -1)
    return (
      <svg viewBox="0 0 20 20" className="size-5" aria-hidden>
        <rect x={3} y={3} width={14} height={14} rx={2} fill="var(--color-paper)" />
      </svg>
    );
  return (
    <svg viewBox="0 0 20 20" className="size-5" aria-hidden>
      <circle cx={10} cy={10} r={1.6} fill="var(--color-ink-soft)" />
    </svg>
  );
}

const look: Record<string, string> = {
  "1": "bg-paper border-ink",
  "-1": "bg-ink border-ink",
  "0": "bg-card border-hairline border-dashed",
};

/**
 * The torch's nine squares. Each tap moves a square on: anything → light → dark → anything.
 * Shapes as well as shade tell them apart, and each square says what it wants.
 */
export function TorchPad({ torch, editable, onChange }: Props) {
  const labelId = useId();
  return (
    <div className="flex flex-wrap items-start gap-4">
      <div className="flex flex-col gap-1">
        <p id={labelId} className="text-sm">
          {words.torch.label}
        </p>
        <div role="group" aria-labelledby={labelId} className="grid w-fit grid-cols-3 gap-1">
          {Array.from({ length: CELLS }, (_, place) => {
            const cell = torch[place] ?? 0;
            return (
              <button
                key={place}
                type="button"
                disabled={!editable}
                aria-label={words.torch.cell(place, cell)}
                data-cell={cell}
                onClick={() =>
                  onChange(torch.map((value, index) => (index === place ? nextCell(value) : value)))
                }
                className={`flex size-11 items-center justify-center rounded-sm border-2 ${look[String(cell)]}`}
              >
                <CellMark cell={cell} />
              </button>
            );
          })}
        </div>
      </div>
      <ul className="flex flex-col gap-1 text-xs text-ink-soft" aria-hidden>
        {([1, -1, 0] as const).map((cell) => (
          <li key={cell} className="flex items-center gap-2">
            <span
              className={`flex size-6 items-center justify-center rounded-sm border-2 ${look[String(cell)]}`}
            >
              <CellMark cell={cell} />
            </span>
            {cell === 1
              ? words.torch.key.light
              : cell === -1
                ? words.torch.key.dark
                : words.torch.key.any}
          </li>
        ))}
      </ul>
    </div>
  );
}
