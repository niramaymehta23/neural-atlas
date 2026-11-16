"use client";

import { useState } from "react";
import { count } from "@/design/copy";
import { companionStore, useCompanion } from "@/platform/companion/companion";

const BUTTON = "rounded-pill border border-hairline bg-paper px-4 py-2 text-sm";

export function CompanionDemo() {
  const hidden = useCompanion((model) => model.hidden);
  const [saving, setSaving] = useState(false);
  const save = (change: Promise<void>) => {
    setSaving(true);
    void change.finally(() => setSaving(false));
  };
  return (
    <div className="flex flex-wrap items-center gap-4">
      <p data-testid="companion-layers" data-layers={hidden.length} data-saving={saving}>
        Your network has {count(hidden.length)} {hidden.length === 1 ? "layer" : "layers"} of cells.
      </p>
      <button
        type="button"
        className={BUTTON}
        onClick={() => save(companionStore.update({ hidden: [...hidden, 4] }))}
      >
        Add a layer
      </button>
      <button type="button" className={BUTTON} onClick={() => save(companionStore.reset())}>
        Start over
      </button>
    </div>
  );
}
