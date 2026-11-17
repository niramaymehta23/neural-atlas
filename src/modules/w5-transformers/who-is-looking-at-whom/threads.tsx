"use client";

import { motion } from "motion/react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { thickness } from "@/design/encodings";
import { useSpring } from "@/design/motion";
import { favourites, type Threads } from "@/engine/pretrained/attention";
import { HoverNote } from "@/ui/HoverNote";
import { words as captionWords } from "./captions";
import { estimateSize, layout, thread, type Layout, type Size } from "./layout";

type ThreadViewProps = {
  threads: Threads;
  focus: number;
  onFocus: (word: number) => void;
  /** Moves a word to another place in the sentence; absent while moving is held back. */
  onMove?: (from: number, to: number) => void;
};

/** Threads lighter than this are left out, so the picture stays readable. */
export const FAINT = 0.04;
/** In everyone's view, each word shows only its strongest few threads. */
export const EVERYONE_TOP = 2;
/** On a touch screen a word is picked up by holding it this long; a quicker swipe scrolls. */
export const HOLD_MS = 350;
/** A finger that moves this far before the hold is scrolling, not picking up. */
const SCROLL_SLOP = 8;
/** A mouse drag starts once the pointer has moved this far. */
const DRAG_SLOP = 4;

const EARLIER = new Set(["ArrowLeft", "ArrowUp"]);
const LATER = new Set(["ArrowRight", "ArrowDown"]);

/** Identity for a word that survives reordering: the word and which copy of it this is. */
const keysOf = (words: readonly string[]) =>
  words.map((word, index) => `${word}-${words.slice(0, index).filter((w) => w === word).length}`);

/** The order words are drawn in when word `from` is shown at place `to`. */
function reordered(count: number, from: number, to: number): number[] {
  const order = [...Array(count).keys()];
  const [moved] = order.splice(from, 1);
  if (moved !== undefined) order.splice(to, 0, moved);
  return order;
}

/** The threads drawn: all of the picked word's, or each word's strongest few. */
export function shownThreads({ words, looks }: Threads, focus: number) {
  return looks.flatMap((row, from) => {
    if (focus >= 0 && from !== focus) return [];
    const best = favourites({ words, looks }, from, FAINT);
    return (focus >= 0 ? best : best.slice(0, EVERYONE_TOP)).map((to) => ({
      from,
      to,
      strength: row[to] ?? 0,
    }));
  });
}

type Press = {
  pointer: number;
  index: number;
  x: number;
  y: number;
  /** Mouse presses can drag at once; touch must hold first. */
  armed: boolean;
  timer: ReturnType<typeof setTimeout> | null;
};

/** Word chips along a gentle arc with soft curved threads to the words each one looks at. */
export function ThreadView({ threads, focus, onFocus, onMove }: ThreadViewProps) {
  const { words } = threads;
  const count = words.length;
  const keys = keysOf(words);
  const settle = useSpring("settle");
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  /** Each word's chip, measured for spacing. */
  const chips = useRef(new Map<string, HTMLElement>());
  const [boxWidth, setBoxWidth] = useState(0);
  const [measured, setMeasured] = useState<Record<string, Size>>({});
  const [held, setHeld] = useState<{ from: number; to: number } | null>(null);
  const [drag, setDrag] = useState<{ index: number; dx: number; dy: number } | null>(null);
  /** A finished move keeps its order on screen until the new reading arrives. */
  const [settling, setSettling] = useState<{ order: number[]; words: readonly string[] } | null>(
    null,
  );
  const [said, setSaid] = useState("");
  const press = useRef<Press | null>(null);
  /** Set by a drag, so the click that ends it does not also pick the word. */
  const dragged = useRef(false);

  // Measure the box and every chip, and again whenever either changes size (text spacing too).
  useLayoutEffect(() => {
    const measure = () => {
      setBoxWidth(box.current?.clientWidth ?? 0);
      const next: Record<string, Size> = {};
      for (const [key, chip] of chips.current)
        next[key] = { width: chip.offsetWidth, height: chip.offsetHeight };
      setMeasured((last) =>
        Object.keys(next).length === Object.keys(last).length &&
        Object.entries(next).every(
          ([key, size]) => last[key]?.width === size.width && last[key]?.height === size.height,
        )
          ? last
          : next,
      );
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    if (box.current) observer.observe(box.current);
    for (const chip of chips.current.values()) observer.observe(chip);
    return () => observer.disconnect();
  }, [words]);

  // Once held, a finger moving no longer scrolls the page: it moves the word.
  useEffect(() => {
    const row = box.current;
    if (!row) return;
    const hold = (event: TouchEvent) => {
      if (press.current?.armed) event.preventDefault();
    };
    row.addEventListener("touchmove", hold, { passive: false });
    return () => row.removeEventListener("touchmove", hold);
  }, []);

  const settlingNow = settling && settling.words === words ? settling.order : null;
  const order = held
    ? reordered(count, held.from, held.to)
    : (settlingNow ?? [...Array(count).keys()]);
  const slotOf = new Array<number>(count).fill(0);
  order.forEach((word, slot) => (slotOf[word] = slot));
  const place = layout(
    order.map((word) => {
      const size = measured[keys[word] ?? ""];
      return size && size.width > 0 ? size : estimateSize(words[word] ?? "");
    }),
    boxWidth,
  );
  const column = place.orientation === "column";
  // The dragged word follows the pointer along the way the words run.
  const shift = (word: number) =>
    drag?.index === word ? (column ? { x: 0, y: drag.dy } : { x: drag.dx, y: 0 }) : { x: 0, y: 0 };
  const xOf = (word: number) => (place.x[slotOf[word] ?? 0] ?? 0) + shift(word).x;
  const yOf = (word: number) => (place.y[slotOf[word] ?? 0] ?? 0) + shift(word).y;
  const drawn: Layout = {
    ...place,
    x: place.x.map((x, slot) => x + shift(order[slot] ?? -1).x),
    y: place.y.map((y, slot) => y + shift(order[slot] ?? -1).y),
  };

  const say = (message: string) => setSaid((last) => (last === message ? `${message} ` : message));
  const before = (slots: readonly number[], word: number) => {
    const slot = slots.indexOf(word);
    return slot > 0 ? words[slots[slot - 1] ?? 0] : undefined;
  };

  const commit = (from: number, to: number) => {
    const word = words[from] ?? "";
    if (to === from || !onMove) return;
    const finalOrder = reordered(count, from, to);
    setSettling({ order: finalOrder, words });
    say(captionWords.moving.moved(word, before(finalOrder, from)));
    onMove(from, to);
  };
  const moveBy = (from: number, by: number) =>
    commit(from, Math.min(count - 1, Math.max(0, from + by)));

  /** The place nearest where a dragged word was let go. */
  const dropSlot = (index: number) => {
    const along = column ? place.y : place.x;
    const target = column ? yOf(index) : xOf(index);
    let best = 0;
    along.forEach((value, slot) => {
      if (Math.abs(value - target) < Math.abs((along[best] ?? 0) - target)) best = slot;
    });
    return best;
  };

  const endPress = () => {
    if (press.current?.timer) clearTimeout(press.current.timer);
    press.current = null;
  };
  const onPointerDown = (index: number) => (event: PointerEvent<HTMLButtonElement>) => {
    if (!onMove || event.button !== 0) return;
    endPress();
    dragged.current = false;
    const mouse = event.pointerType === "mouse";
    const target = event.currentTarget;
    const pointer = event.pointerId;
    const started: Press = {
      pointer,
      index,
      x: event.clientX,
      y: event.clientY,
      armed: mouse,
      timer: null,
    };
    if (!mouse)
      started.timer = setTimeout(() => {
        started.armed = true;
        started.timer = null;
        if (target.isConnected) target.setPointerCapture?.(pointer);
        setDrag({ index, dx: 0, dy: 0 });
      }, HOLD_MS);
    press.current = started;
  };
  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const now = press.current;
    if (!now || now.pointer !== event.pointerId) return;
    const dx = event.clientX - now.x;
    const dy = event.clientY - now.y;
    if (!now.armed) {
      if (Math.hypot(dx, dy) > SCROLL_SLOP) endPress(); // a swipe: let the page scroll
      return;
    }
    if (!drag && Math.hypot(dx, dy) < DRAG_SLOP) return;
    if (!drag) event.currentTarget.setPointerCapture?.(event.pointerId);
    dragged.current = true;
    setDrag({ index: now.index, dx, dy });
  };
  const onPointerUp = () => {
    const now = press.current;
    endPress();
    if (!now || !drag) {
      setDrag(null);
      return;
    }
    dragged.current = true;
    const to = dropSlot(drag.index);
    setDrag(null);
    commit(drag.index, to);
  };
  const onPointerCancel = () => {
    endPress();
    setDrag(null);
  };

  /** Space picks a word up, the arrows move it, Space or Enter puts it down, Escape puts it back. */
  const onKeyDown = (index: number) => (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!onMove) return;
    const word = words[index] ?? "";
    if (!held) {
      if (event.key !== " ") return;
      event.preventDefault();
      setHeld({ from: index, to: index });
      say(captionWords.moving.picked(word));
      return;
    }
    if (held.from !== index) return;
    if (EARLIER.has(event.key) || LATER.has(event.key)) {
      event.preventDefault();
      const by = EARLIER.has(event.key) ? -1 : 1;
      const to = Math.min(count - 1, Math.max(0, held.to + by));
      setHeld({ from: index, to });
      say(captionWords.moving.now(word, before(reordered(count, index, to), index)));
    } else if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      setHeld(null);
      if (held.to === held.from) say(captionWords.moving.putBack(word));
      else commit(held.from, held.to);
    } else if (event.key === "Escape" || event.key === "Tab") {
      if (event.key === "Escape") event.preventDefault();
      setHeld(null);
      say(captionWords.moving.putBack(word));
    }
  };
  // A button clicks on Space's key-up; that Space belonged to picking up or putting down.
  const onKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (onMove && event.key === " ") event.preventDefault();
  };

  const shown = shownThreads(threads, focus);
  const stroke = focus >= 0 ? "var(--color-ink)" : "var(--color-ink-soft)";
  const instant = { duration: 0 };

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={box}
        className="w-full overflow-x-auto overscroll-x-contain"
        data-thread-row
        data-orientation={place.orientation}
      >
        <div className="relative mx-auto" style={{ width: place.width, height: place.height }}>
          <svg
            width={place.width}
            height={place.height}
            viewBox={`0 0 ${place.width} ${place.height}`}
            className="absolute inset-0"
            role="img"
            aria-label={captionWords.scene}
          >
            {shown.map(({ from, to, strength }) => {
              const { d, end, side } = thread(drawn, slotOf[from] ?? 0, slotOf[to] ?? 0);
              return (
                <g
                  key={`${keys[from]}>${keys[to]}`}
                  data-thread={`${words[from]}>${words[to]}`}
                  data-strength={strength.toFixed(3)}
                  data-side={side}
                >
                  <motion.path
                    initial={false}
                    animate={{ d, strokeWidth: thickness(strength) }}
                    transition={drag ? instant : settle}
                    fill="none"
                    stroke={stroke}
                    strokeOpacity={0.25 + 0.65 * strength}
                    strokeLinecap="round"
                  />
                  <motion.circle
                    initial={false}
                    animate={{ cx: end.x, cy: end.y }}
                    transition={drag ? instant : settle}
                    r={1.5 + thickness(strength) / 2}
                    fill={stroke}
                    fillOpacity={0.4 + 0.6 * strength}
                  />
                </g>
              );
            })}
          </svg>
          {words.map((word, index) => {
            const key = keys[index] ?? word;
            const described = `${id}-${index}`;
            const [first, second] = favourites(threads, index, FAINT).map((to) => words[to]);
            const lifted = held?.from === index || drag?.index === index;
            return (
              <motion.div
                key={key}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ zIndex: lifted || focus === index ? 2 : 1 }}
                initial={false}
                animate={{ left: xOf(index), top: yOf(index) }}
                transition={drag?.index === index ? instant : settle}
              >
                <HoverNote note={captionWords.wordNote(word)}>
                  <button
                    type="button"
                    ref={(element) => {
                      if (element) chips.current.set(key, element);
                      else chips.current.delete(key);
                    }}
                    data-word={word}
                    data-held={lifted || undefined}
                    aria-pressed={focus === index}
                    aria-describedby={described}
                    aria-keyshortcuts={onMove ? "Space ArrowLeft ArrowRight Escape" : undefined}
                    onClick={(event) => {
                      if (dragged.current) {
                        // The click that ends a drag neither picks the word nor opens its note.
                        dragged.current = false;
                        event.preventDefault();
                        return;
                      }
                      onFocus(focus === index ? -1 : index);
                    }}
                    onKeyDown={onKeyDown(index)}
                    onKeyUp={onKeyUp}
                    onBlur={() => held?.from === index && setHeld(null)}
                    onPointerDown={onPointerDown(index)}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerCancel}
                    onContextMenu={(event) => onMove && event.preventDefault()}
                    className={`block h-8 cursor-grab rounded-pill border bg-card px-2 text-sm whitespace-nowrap select-none [-webkit-touch-callout:none] active:cursor-grabbing aria-pressed:border-accent aria-pressed:text-accent-ink pointer-coarse:h-11 ${
                      lifted ? "border-ink shadow-lifted" : "border-hairline"
                    }`}
                  >
                    {word}
                  </button>
                </HoverNote>
                {/* The note's own description gives way to this one, so it carries both. */}
                <span id={described} hidden>
                  {`${captionWords.looksAt(first, second)} ${captionWords.wordNote(word)}`}
                </span>
                {focus === index && (
                  // Beside the chip without widening it: under it in a row, to its left in a column.
                  <div
                    className={`absolute flex gap-1 ${
                      column
                        ? "top-1/2 right-full mr-1 -translate-y-1/2"
                        : "top-full left-1/2 mt-1 -translate-x-1/2"
                    }`}
                  >
                    <MoveButton
                      label={captionWords.moveEarlier(word)}
                      disabled={!onMove || index === 0}
                      onClick={() => moveBy(index, -1)}
                      direction={column ? "up" : "left"}
                    />
                    <MoveButton
                      label={captionWords.moveLater(word)}
                      disabled={!onMove || index === count - 1}
                      onClick={() => moveBy(index, 1)}
                      direction={column ? "down" : "right"}
                    />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
        <p aria-live="polite" className="sr-only">
          {said}
        </p>
      </div>
      <p className="text-sm text-ink-soft">{captionWords.direction[place.orientation]}</p>
    </div>
  );
}

const TURN = { right: "", left: "-scale-x-100", down: "rotate-90", up: "-rotate-90" } as const;

/** A small arrow beside the chosen word that moves it one place (A11Y-10: no drag needed). */
function MoveButton({
  label,
  disabled,
  onClick,
  direction,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  direction: keyof typeof TURN;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      // aria-disabled keeps it focusable while the reader catches up with the last move.
      aria-disabled={disabled}
      onClick={() => !disabled && onClick()}
      className="grid size-7 place-items-center rounded-pill border border-hairline bg-paper text-ink aria-disabled:opacity-40 pointer-coarse:size-11"
    >
      <svg viewBox="0 0 12 12" className={`size-3 ${TURN[direction]}`} aria-hidden>
        <path
          d="M4 2.5 L8 6 L4 9.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
