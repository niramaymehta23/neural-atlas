"use client";

import { Component, type ReactNode } from "react";

type StageBoundaryProps = {
  /** Shown instead when the 3D scene throws (no WebGL, a lost driver, a bad shader). */
  fallback: ReactNode;
  children: ReactNode;
};

/** Catches a 3D scene that fails to draw and shows the still version instead (ENG-12). */
export class StageBoundary extends Component<StageBoundaryProps, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
