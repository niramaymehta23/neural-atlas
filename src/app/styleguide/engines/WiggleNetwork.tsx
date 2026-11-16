"use client";

import { useEffect, useState } from "react";
import { Toggle } from "@/ui/Toggle";
import { NetworkView } from "@/visuals/NetworkView";

/** Ten, ten and ten neurons: exactly 200 connections. */
const SIZES = [10, 10, 10];
const COUNT = SIZES.slice(1).reduce((total, size, i) => total + ((SIZES[i] ?? 0) + 1) * size, 0);

const wave = (time: number) =>
  Float64Array.from({ length: COUNT }, (_, i) => Math.sin(time / 600 + i * 0.37) * ((i % 7) + 1));

/** A stress test: every connection changes every frame, with flowing dots on all of them. */
export function WiggleNetwork() {
  const [wiggling, setWiggling] = useState(false);
  const [params, setParams] = useState(() => wave(0));

  useEffect(() => {
    if (!wiggling) return;
    let frame = 0;
    const loop = (time: number) => {
      setParams(wave(time));
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [wiggling]);

  return (
    <div className="flex w-full flex-col gap-4" data-testid="wiggle-network">
      <Toggle label="Wiggle every connection" checked={wiggling} onChange={setWiggling} />
      <NetworkView
        sizes={SIZES}
        params={params}
        label="Two hundred connections changing every moment"
        flowing
        width={640}
        height={340}
        className="w-full max-w-3xl"
      />
    </div>
  );
}
