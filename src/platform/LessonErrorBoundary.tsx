"use client";

import { Component, type ReactNode } from "react";
import { platformCaptions } from "./captions";

type Props = { children: ReactNode; className?: string };
type State = { failed: boolean; attempt: number };

const words = platformCaptions.problem;

/**
 * Keeps one part of a lesson (scene, dials, drawer) from blanking the page when it throws: the
 * rest stays usable, and "Try again" mounts that part afresh.
 */
export class LessonErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false, attempt: 0 };

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true };
  }

  override render() {
    const { failed, attempt } = this.state;
    if (!failed) return <Attempt key={attempt}>{this.props.children}</Attempt>;
    return (
      <div
        role="alert"
        className={`flex flex-col items-start gap-3 rounded-card border border-hairline bg-card p-4 ${this.props.className ?? ""}`}
      >
        <p>{words.title}</p>
        <button
          type="button"
          onClick={() => this.setState(({ attempt }) => ({ failed: false, attempt: attempt + 1 }))}
          className="min-h-11 rounded-pill border border-hairline bg-paper px-4 py-2 text-sm text-accent-ink md:min-h-0"
        >
          {words.retry}
        </button>
      </div>
    );
  }
}

/** A keyed wrapper, so each attempt is a fresh mount of the children. */
function Attempt({ children }: { children: ReactNode }) {
  return children;
}
