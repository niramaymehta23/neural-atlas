"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SIDE } from "@/engine/vision/seeing";

/**
 * Where the camera is: never asked ("off"), the lesson's own plain question on screen ("asking"),
 * waiting for the browser ("starting"), showing ("on"), or not available: the learner or browser
 * said no ("denied"), there is no camera ("missing"), or it would not start ("failed").
 */
export type CameraState = "off" | "asking" | "starting" | "on" | "denied" | "missing" | "failed";

export type Camera = {
  state: CameraState;
  /** Attach to a <video>; the lesson shows it mirrored, like a mirror. */
  video: (element: HTMLVideoElement | null) => void;
  /** Shows the lesson's question first (nothing is asked of the browser until the learner agrees). */
  ask: () => void;
  /** The learner agreed: asks the browser for the camera. */
  start: () => void;
  /** Turns the camera off (the learner said no, or chose a photo). */
  stop: () => void;
  /** The middle square of the camera's picture now, 224 × 224 RGBA, or null when not showing. */
  grab: () => Uint8ClampedArray | null;
};

/** Which state a refused or failed getUserMedia means. */
export function stateForError(error: unknown): CameraState {
  const name = error instanceof Error || error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "denied";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "missing";
  // NotReadableError (another app holds the camera) and anything else.
  return "failed";
}

/**
 * The learner's camera, for lessons that can use it (they always work with photos too). The picture
 * is read here, on this device, and never sent anywhere. The camera turns off when the lesson
 * closes and while the tab is hidden, and comes back when the tab does.
 */
export function useCamera(): Camera {
  const [state, setState] = useState<CameraState>("off");
  const stream = useRef<MediaStream | null>(null);
  const element = useRef<HTMLVideoElement | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const wanted = useRef(false);
  const attempt = useRef(0);

  const release = useCallback(() => {
    for (const track of stream.current?.getTracks() ?? []) track.stop();
    stream.current = null;
    if (element.current) element.current.srcObject = null;
  }, []);

  const open = useCallback(async () => {
    const mine = (attempt.current += 1);
    if (!navigator.mediaDevices?.getUserMedia) {
      setState("missing");
      return;
    }
    setState("starting");
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      if (mine !== attempt.current || !wanted.current) {
        for (const track of media.getTracks()) track.stop();
        return;
      }
      stream.current = media;
      if (element.current) {
        element.current.srcObject = media;
        await element.current.play().catch(() => undefined);
      }
      setState("on");
    } catch (error) {
      if (mine !== attempt.current) return;
      wanted.current = false;
      setState(stateForError(error));
    }
  }, []);

  const start = useCallback(() => {
    wanted.current = true;
    void open();
  }, [open]);

  const stop = useCallback(() => {
    wanted.current = false;
    attempt.current += 1;
    release();
    setState("off");
  }, [release]);

  const ask = useCallback(() => setState("asking"), []);

  // Off while the tab is hidden (the camera light goes out), back on when it returns.
  useEffect(() => {
    const onVisibility = () => {
      if (!wanted.current) return;
      if (document.hidden) {
        attempt.current += 1;
        release();
        setState("starting");
      } else void open();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [open, release]);

  useEffect(
    () => () => {
      wanted.current = false;
      attempt.current += 1;
      release();
    },
    [release],
  );

  const video = useCallback((node: HTMLVideoElement | null) => {
    element.current = node;
    if (node && stream.current && node.srcObject !== stream.current) {
      node.srcObject = stream.current;
      void node.play().catch(() => undefined);
    }
  }, []);

  const grab = useCallback(() => {
    const node = element.current;
    if (!node || !stream.current || node.videoWidth === 0) return null;
    canvas.current ??= document.createElement("canvas");
    const target = canvas.current;
    target.width = SIDE;
    target.height = SIDE;
    const context = target.getContext("2d", { willReadFrequently: true });
    if (!context) return null;
    const side = Math.min(node.videoWidth, node.videoHeight);
    context.drawImage(
      node,
      (node.videoWidth - side) / 2,
      (node.videoHeight - side) / 2,
      side,
      side,
      0,
      0,
      SIDE,
      SIDE,
    );
    return context.getImageData(0, 0, SIDE, SIDE).data;
  }, []);

  return { state, video, ask, start, stop, grab };
}
