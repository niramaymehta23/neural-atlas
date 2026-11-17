"use client";

import { useMemo, useSyncExternalStore } from "react";
import { markPath } from "@/design/encodings";
import { useRecordedRun } from "@/features/building/use-recorded-run";
import type { ModuleViewProps } from "@/platform/contract";
import { Chart } from "@/visuals/Chart";
import { words } from "./captions";
import {
  curveOf,
  EXAM,
  keyOf,
  papersFor,
  sizeOf,
  studyRun,
  type Spot,
  type StudyFrame,
  type StudyState,
} from "./model";

type Props = ModuleViewProps<StudyState, StudyFrame>;

const WIDTH = 320;
const HEIGHT = 200;
const TOP = 1.4;
/** Mistakes above this are drawn at the top of the chart. */
const CHART_TOP = 0.5;

const toX = (x: number) => 10 + ((x + 1) / 2) * (WIDTH - 20);
const toY = (y: number) => HEIGHT / 2 - (Math.max(-TOP, Math.min(TOP, y)) / TOP) * (HEIGHT / 2 - 8);

function PaperMark({ at }: { at: Spot }) {
  return (
    <path
      d={markPath("circle", toX(at.x), toY(at.y), 4.5)}
      fill="var(--color-flow)"
      stroke="var(--color-ink)"
      strokeWidth={1.2}
      data-paper
    />
  );
}

function ExamMark({ at }: { at: Spot }) {
  return (
    <path
      d={markPath("triangle", toX(at.x), toY(at.y), 3.5)}
      fill="none"
      stroke="var(--color-ink-soft)"
      strokeWidth={1.2}
      data-exam
    />
  );
}

/** A small key swatch, drawn like the marks on the page. */
function KeyMark({ kind }: { kind: "paper" | "exam" | "line" }) {
  return (
    <svg viewBox="0 0 20 12" className="h-3 w-5 shrink-0" aria-hidden>
      {kind === "line" ? (
        <line x1={1} y1={6} x2={19} y2={6} stroke="var(--color-ink)" strokeWidth={2} />
      ) : kind === "paper" ? (
        <path d={markPath("circle", 10, 6, 4)} fill="var(--color-flow)" stroke="var(--color-ink)" />
      ) : (
        <path
          d={markPath("triangle", 10, 6.5, 3.5)}
          fill="none"
          stroke="var(--color-ink-soft)"
          strokeWidth={1.2}
        />
      )}
    </svg>
  );
}

/** The past papers, the new exam and the student's answers, with its mistakes as it practises. */
export function StudyScene(props: Props) {
  const { state, update, timeline } = props;
  const { failure } = useRecordedRun({
    ...props,
    runs: state.runs,
    work: studyRun,
    settings: keyOf(state),
    rerun: () => update(({ runs }) => ({ runs: runs + 1 }), { touch: false }),
  });
  const { cursor, length } = useSyncExternalStore(
    timeline.subscribe,
    timeline.getState,
    timeline.getState,
  );
  const shown = state.runs > 0 ? timeline.at(cursor) : undefined;
  const papers = papersFor(state.questions);
  const curve = useMemo(
    () => (shown ? curveOf(state.cells, shown.params) : null),
    [shown, state.cells],
  );
  const series = useMemo(() => {
    const frames = timeline.frames().slice(0, length);
    const clip = (value: number) => Math.min(CHART_TOP, value);
    return [
      { values: frames.map(({ loss }) => clip(loss)) },
      { values: frames.map(({ exam }) => clip(exam)), ghost: true },
    ];
  }, [timeline, length]);
  if (failure) throw failure;

  return (
    <div className="flex grow flex-col gap-3" data-testid="memorising-vs-understanding">
      <svg
        role="img"
        aria-label={words.scene}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full rounded-card border border-hairline bg-paper"
      >
        <line
          x1={10}
          x2={WIDTH - 10}
          y1={HEIGHT / 2}
          y2={HEIGHT / 2}
          stroke="var(--color-hairline)"
        />
        {EXAM.map((at, index) => (
          <ExamMark key={`exam-${index}`} at={at} />
        ))}
        {curve && (
          <path
            d={curve
              .map(
                ({ x, y }, index) =>
                  `${index === 0 ? "M" : "L"}${toX(x).toFixed(1)} ${toY(y).toFixed(1)}`,
              )
              .join(" ")}
            fill="none"
            stroke="var(--color-ink)"
            strokeWidth={2}
            strokeLinejoin="round"
            data-answers
          />
        )}
        {papers.map((at, index) => (
          <PaperMark key={`paper-${index}`} at={at} />
        ))}
      </svg>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <li className="flex items-center gap-2">
          <KeyMark kind="paper" />
          {words.key.papers}
        </li>
        <li className="flex items-center gap-2">
          <KeyMark kind="exam" />
          {words.key.exam}
        </li>
        <li className="flex items-center gap-2">
          <KeyMark kind="line" />
          {words.key.answers}
        </li>
      </ul>
      {/* Reserved lines, so the page does not jump when the words change. */}
      <div className="flex min-h-12 flex-col gap-1 text-sm" data-scores>
        {shown ? (
          <>
            <p>{words.scores.practice(words.sizes[sizeOf(shown.loss)])}</p>
            <p>{words.scores.exam(words.sizes[sizeOf(shown.exam)])}</p>
          </>
        ) : (
          <p className="text-ink-soft">{words.notYet}</p>
        )}
      </div>
      <figure className="flex flex-col gap-1">
        <Chart
          series={series}
          label={words.chart}
          marker={shown ? cursor : undefined}
          range={{ min: 0, max: CHART_TOP }}
          className="h-24 w-full"
        />
        <figcaption className="flex flex-wrap gap-x-4 text-xs text-ink-soft">
          <span>{words.chartKey.practice}</span>
          <span>{words.chartKey.exam}</span>
        </figcaption>
      </figure>
    </div>
  );
}
