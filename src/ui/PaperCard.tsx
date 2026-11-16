import type { ComponentPropsWithoutRef } from "react";

type PaperCardProps = ComponentPropsWithoutRef<"div"> & {
  /** True only while the card is being dragged: the one moment it casts a soft shadow. */
  lifted?: boolean;
};

/** A flat paper card: 16px corners, a hairline warm border, no shadow unless lifted. */
export function PaperCard({ lifted = false, className = "", ...props }: PaperCardProps) {
  return (
    <div
      data-lifted={lifted || undefined}
      className={`rounded-card border border-hairline bg-card p-6 text-ink transition-shadow duration-300 ease-settle ${lifted ? "shadow-lifted" : ""} ${className}`}
      {...props}
    />
  );
}
