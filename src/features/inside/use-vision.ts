"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { Seen } from "@/engine/vision/seeing";
import { visionReader, type VisionReader, type VisionStatus } from "@/engine/vision/vision-client";

/** The page's picture reader, kept alive while the scene is open, and how its loading is going. */
export function useVisionReader(): { reader: VisionReader; status: VisionStatus } {
  const [reader] = useState(visionReader);
  const status = useSyncExternalStore(reader.subscribe, reader.getStatus, () => "idle" as const);
  useEffect(() => reader.retain(), [reader]);
  return { reader, status };
}

export type SeenLoad = {
  /** What the model saw in the newest picture asked about, or null while it looks. */
  seen: Seen | null;
  /** The picture the model could not read (or the model would not load). */
  failure: Error | null;
  retry: () => void;
};

/**
 * What the model sees in one picture (a photo, a shrunk picture). A newer picture replaces an older
 * one still being read, so the answer on screen always belongs to the picture on screen.
 */
export function useSeen(
  pixels: Uint8ClampedArray | null,
  options: { maps?: boolean; features?: boolean } = {},
): SeenLoad {
  const { reader } = useVisionReader();
  const [result, setResult] = useState<{ for: Uint8ClampedArray; seen: Seen } | null>(null);
  const [failure, setFailure] = useState<{ for: Uint8ClampedArray; error: Error } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const maps = options.maps ?? false;
  const features = options.features ?? false;
  useEffect(() => {
    if (!pixels) return;
    let live = true;
    reader.see(pixels.slice(), { maps, features }).then(
      (seen) => {
        if (live) setResult({ for: pixels, seen });
      },
      (error: unknown) => {
        if (live)
          setFailure({
            for: pixels,
            error: error instanceof Error ? error : new Error(String(error)),
          });
      },
    );
    return () => {
      live = false;
    };
  }, [pixels, reader, maps, features, attempt]);
  const retry = useCallback(() => {
    setFailure(null);
    setAttempt((count) => count + 1);
  }, []);
  return {
    seen: result && result.for === pixels ? result.seen : null,
    failure: failure && failure.for === pixels ? failure.error : null,
    retry,
  };
}

export type LiveSeen = {
  /** What the model saw in the newest camera picture, or null before the first answer. */
  seen: Seen | null;
  /** That picture (a copy kept here), for lessons that also work on the picture itself. */
  picture: Uint8ClampedArray | null;
  /** How many camera pictures have been read so far (pages and tests time the rate from it). */
  reads: number;
  failure: Error | null;
  retry: () => void;
};

/**
 * At most this many camera pictures are read a second: enough for the maps to follow the camera
 * smoothly (the lesson promises 15 or more), without keeping the device's chip busy flat out.
 */
export const LIVE_RATE = 20;

/**
 * The camera picture read over and over while `on`: one picture at a time, the next taken once
 * the model has answered the last and no sooner than LIVE_RATE allows. A failure stops the loop
 * until `retry`.
 */
export function useLiveSeen(
  grab: () => Uint8ClampedArray | null,
  on: boolean,
  options: { maps?: boolean; features?: boolean } = {},
): LiveSeen {
  const { reader } = useVisionReader();
  const [latest, setLatest] = useState<{ seen: Seen; picture: Uint8ClampedArray } | null>(null);
  const [reads, setReads] = useState(0);
  const [failure, setFailure] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);
  const maps = options.maps ?? false;
  const features = options.features ?? false;
  useEffect(() => {
    if (!on) return;
    let live = true;
    let busy = false;
    let started = -Infinity;
    let frame = requestAnimationFrame(function step(now) {
      if (!live) return;
      const picture = busy || now - started < 1000 / LIVE_RATE ? null : grab();
      if (picture) {
        busy = true;
        started = now;
        reader.see(picture.slice(), { maps, features }).then(
          (seen) => {
            if (!live) return;
            busy = false;
            setLatest({ seen, picture });
            setReads((count) => count + 1);
          },
          (error: unknown) => {
            if (!live) return;
            live = false;
            setFailure(error instanceof Error ? error : new Error(String(error)));
          },
        );
      }
      frame = requestAnimationFrame(step);
    });
    return () => {
      live = false;
      cancelAnimationFrame(frame);
    };
  }, [on, grab, reader, maps, features, attempt]);
  const retry = useCallback(() => {
    setFailure(null);
    setAttempt((count) => count + 1);
  }, []);
  return {
    seen: on ? (latest?.seen ?? null) : null,
    picture: on ? (latest?.picture ?? null) : null,
    reads,
    failure: on ? failure : null,
    retry,
  };
}
