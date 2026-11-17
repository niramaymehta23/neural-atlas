"use client";

import { useMemo } from "react";
import { Edge } from "./Edge";
import { FlowParticles } from "./FlowParticles";
import { layoutEdges, layoutNeurons } from "./network-layout";
import { NeuronDot } from "./NeuronDot";

/** A hidden cell, by its hidden layer (0 = first after the inputs) and its row. */
export type HiddenCell = { layer: number; cell: number };

type NetworkViewProps = {
  /** Neurons per layer, inputs first. */
  sizes: readonly number[];
  /** Weights and biases in the autodiff order (ModelEngine snapshots and live reads use it). */
  params: ArrayLike<number> | null;
  /** Per layer, per neuron, how busy it is (0–1). Omitted: all calm. */
  activations?: readonly (readonly number[])[];
  /** Plain description for screen readers, such as "A small network sorting dots". */
  label: string;
  /** Moving dots along each connection, faster where it is stronger. */
  flowing?: boolean;
  /**
   * Dots run from the output back towards the inputs (corrections flowing back while it
   * learns), not forwards.
   */
  backward?: boolean;
  /** How busy each connection's dots are (0–1), in edge order; omitted: its strength. */
  flowActivity?: readonly number[];
  /**
   * Makes each hidden cell a button named by `cellLabel`; pointing at it, focusing it or
   * tapping it calls `onCell` (null when it is let go).
   */
  cellLabel?: (cell: HiddenCell) => string;
  onCell?: (cell: HiddenCell | null) => void;
  /** The hidden cell shown as chosen. */
  chosen?: HiddenCell | null;
  width?: number;
  height?: number;
  className?: string;
};

/** A network drawn flat: dots in columns joined by threads, thicker where the pull is stronger. */
export function NetworkView({
  sizes,
  params,
  activations,
  label,
  flowing = false,
  backward = false,
  flowActivity,
  cellLabel,
  onCell,
  chosen = null,
  width = 480,
  height = 300,
  className = "",
}: NetworkViewProps) {
  const neurons = useMemo(() => layoutNeurons(sizes, width, height), [sizes, width, height]);
  const edges = useMemo(() => layoutEdges(neurons, params), [neurons, params]);
  const hidden = neurons.slice(1, -1);
  return (
    <div className={`relative ${className}`} style={{ aspectRatio: `${width} / ${height}` }}>
      <svg
        role="img"
        aria-label={label}
        viewBox={`0 0 ${width} ${height}`}
        className="absolute inset-0 size-full"
      >
        <g>
          {edges.map((edge, index) => (
            <Edge key={index} {...edge} />
          ))}
        </g>
        {neurons.map((layer, layerIndex) =>
          layer.map((at, row) => (
            <NeuronDot
              key={`${layerIndex}-${row}`}
              at={at}
              activation={activations?.[layerIndex]?.[row] ?? 0}
            />
          )),
        )}
        {chosen && hidden[chosen.layer]?.[chosen.cell] && (
          <circle
            data-chosen-cell
            cx={hidden[chosen.layer]?.[chosen.cell]?.[0]}
            cy={hidden[chosen.layer]?.[chosen.cell]?.[1]}
            r={15}
            fill="none"
            stroke="var(--color-ink)"
            strokeWidth={2}
          />
        )}
      </svg>
      {flowing && (
        <FlowParticles
          paths={edges.map(({ from, to, strength }, index) => ({
            from: backward ? to : from,
            to: backward ? from : to,
            activity: flowActivity?.[index] ?? strength,
          }))}
          width={width}
          height={height}
        />
      )}
      {cellLabel &&
        onCell &&
        hidden.map((layer, layerIndex) =>
          layer.map(([x, y], row) => {
            const cell = { layer: layerIndex, cell: row };
            return (
              <button
                key={`${layerIndex}-${row}`}
                type="button"
                aria-label={cellLabel(cell)}
                aria-pressed={chosen?.layer === layerIndex && chosen.cell === row}
                data-hidden-cell={`${layerIndex}-${row}`}
                onPointerEnter={(event) => {
                  if (event.pointerType === "mouse") onCell(cell);
                }}
                onPointerLeave={(event) => {
                  if (event.pointerType === "mouse") onCell(null);
                }}
                onFocus={() => onCell(cell)}
                onBlur={() => onCell(null)}
                onClick={() => onCell(cell)}
                className="absolute size-8 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ left: `${(x / width) * 100}%`, top: `${(y / height) * 100}%` }}
              />
            );
          }),
        )}
    </div>
  );
}
