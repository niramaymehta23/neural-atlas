"use client";

import { useMemo } from "react";
import { Edge } from "./Edge";
import { FlowParticles } from "./FlowParticles";
import { layoutEdges, layoutNeurons } from "./network-layout";
import { NeuronDot } from "./NeuronDot";

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
  width = 480,
  height = 300,
  className = "",
}: NetworkViewProps) {
  const neurons = useMemo(() => layoutNeurons(sizes, width, height), [sizes, width, height]);
  const edges = useMemo(() => layoutEdges(neurons, params), [neurons, params]);
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
      </svg>
      {flowing && (
        <FlowParticles
          paths={edges.map(({ from, to, strength }) => ({ from, to, activity: strength }))}
          width={width}
          height={height}
        />
      )}
    </div>
  );
}
