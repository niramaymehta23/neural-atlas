"use client";

import { useEffect, useRef, type PointerEvent } from "react";

/** On a touch screen a drag starts after this long held still, so a swipe scrolls the page. */
export const HOLD_MS = 300;
/** How far (px) a finger may wander before the hold and still count as held still. */
const SLOP_PX = 8;

export type DragPoint = { clientX: number; clientY: number };

type Press = {
  pointer: number;
  clientX: number;
  clientY: number;
  armed: boolean;
  timer: ReturnType<typeof setTimeout> | null;
};

/**
 * Dragging that never traps a phone's scroll (QL-14 / H3b): a mouse or pen drags at once; a
 * finger drags only after a short hold, a quick tap still acts (`onTap`), and a swipe scrolls.
 * Once a hold has armed, a non-passive `touchmove` stops the page scrolling under the finger.
 * Spread `handlers` on the element and give it `ref`.
 */
export function useHoldDrag<E extends Element>({
  onDrag,
  onTap,
  onEnd,
}: {
  /** Called as the pointer moves while dragging (and once when the drag starts). */
  onDrag: (point: DragPoint) => void;
  /** A quick press that never moved. */
  onTap?: (point: DragPoint) => void;
  onEnd?: () => void;
}) {
  const ref = useRef<E>(null);
  const press = useRef<Press | null>(null);
  const latest = useRef({ onDrag, onTap, onEnd });
  useEffect(() => {
    latest.current = { onDrag, onTap, onEnd };
  });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const hold = (event: Event) => {
      if (press.current?.armed) event.preventDefault();
    };
    element.addEventListener("touchmove", hold, { passive: false });
    return () => element.removeEventListener("touchmove", hold);
  }, []);
  useEffect(
    () => () => {
      if (press.current?.timer) clearTimeout(press.current.timer);
    },
    [],
  );

  const end = () => {
    if (press.current?.timer) clearTimeout(press.current.timer);
    const was = press.current;
    press.current = null;
    if (was?.armed) latest.current.onEnd?.();
  };

  const handlers = {
    onPointerDown: (event: PointerEvent<E>) => {
      end();
      const target = event.currentTarget;
      const started: Press = {
        pointer: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
        armed: event.pointerType !== "touch",
        timer: null,
      };
      press.current = started;
      if (started.armed) {
        target.setPointerCapture?.(event.pointerId);
        latest.current.onDrag(started);
        return;
      }
      started.timer = setTimeout(() => {
        started.armed = true;
        started.timer = null;
        if (target.isConnected) target.setPointerCapture?.(started.pointer);
        latest.current.onDrag(started);
      }, HOLD_MS);
    },
    onPointerMove: (event: PointerEvent<E>) => {
      const now = press.current;
      if (!now || now.pointer !== event.pointerId) return;
      if (now.armed) latest.current.onDrag({ clientX: event.clientX, clientY: event.clientY });
      else if (Math.hypot(event.clientX - now.clientX, event.clientY - now.clientY) > SLOP_PX)
        end();
    },
    onPointerUp: () => {
      const now = press.current;
      end();
      if (now && !now.armed) latest.current.onTap?.(now);
    },
    onPointerCancel: end,
  };
  return { ref, handlers };
}
