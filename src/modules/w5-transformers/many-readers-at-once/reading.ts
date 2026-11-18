"use client";

import { useEffect, useState } from "react";
import { readable, wordsOf, type Reading } from "@/engine/pretrained/attention";
import { attentionReader, type AttentionReader } from "@/engine/pretrained/attention-client";

/** Typing pauses this long before the sentence is read again. */
const SETTLE_MS = 250;

type Loaded = { sentence: string; reading: Reading };

/**
 * The sentence's reading, asked for once typing settles; the reader loads on first use and is
 * held while the scene is on screen. A failure is kept for the sentence it happened to.
 */
export function useSentenceReading(sentence: string, reader: AttentionReader = attentionReader()) {
  const asked = readable(sentence);
  const enough = wordsOf(sentence).length >= 2;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => reader.retain(), [reader]);

  useEffect(() => {
    if (!enough) return;
    let current = true;
    const timer = setTimeout(() => {
      reader.read(asked).then(
        (reading) => {
          if (!current) return;
          setLoaded({ sentence: asked, reading });
          setFailed(null);
        },
        () => current && setFailed(asked),
      );
    }, SETTLE_MS);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [asked, enough, attempt, reader]);

  return {
    asked,
    enough,
    loaded,
    failed: failed === asked,
    retry: () => {
      setFailed(null);
      setAttempt((count) => count + 1);
    },
  };
}
