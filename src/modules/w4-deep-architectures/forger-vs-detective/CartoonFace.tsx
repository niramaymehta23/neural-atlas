import type { FaceLook } from "./faces";

const round = (value: number) => Math.round(value * 1000) / 1000;

/**
 * A small cartoon face in a 0–1 box, drawn in ink so it reads in both themes. A face that looks
 * wrong has a dashed, lopsided outline, so "wrong" never depends on colour.
 */
export function CartoonFace({
  look,
  x = 0,
  y = 0,
  size = 1,
}: {
  look: FaceLook;
  x?: number;
  y?: number;
  size?: number;
}) {
  const { width, height, eyes, smile, hair, odd } = look;
  const wrong = odd > 0.5;
  const tilt = wrong ? 0.12 : 0;
  const cx = 0.5;
  const cy = 0.53;
  const eyeY = cy - height * 0.25;
  const spread = width * 0.42;
  const mouthY = cy + height * 0.45;
  const mouthHalf = width * 0.4;
  const bend = -smile * height * 0.25;
  return (
    <g
      transform={`translate(${round(x)} ${round(y)}) scale(${round(size)})`}
      data-odd={wrong || undefined}
    >
      {hair > 0 && (
        <path
          d={`M${round(cx - width)} ${round(cy - height * 0.15)} A${round(width)} ${round(height)} 0 0 1 ${round(cx + width)} ${round(cy - height * 0.15)} Z`}
          fill="var(--color-ink)"
          opacity={0.75}
        />
      )}
      <ellipse
        cx={cx}
        cy={cy}
        rx={round(width * (1 + tilt))}
        ry={round(height * (1 - tilt))}
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth={0.06}
        strokeDasharray={wrong ? "0.1 0.07" : undefined}
      />
      <circle cx={round(cx - spread)} cy={round(eyeY)} r={round(eyes)} fill="var(--color-ink)" />
      <circle
        cx={round(cx + spread)}
        cy={round(eyeY + tilt * 0.4)}
        r={round(eyes * (wrong ? 1.6 : 1))}
        fill="var(--color-ink)"
      />
      <path
        d={`M${round(cx - mouthHalf)} ${round(mouthY)} Q${cx} ${round(mouthY - bend * 2)} ${round(cx + mouthHalf)} ${round(mouthY)}`}
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth={0.05}
        strokeLinecap="round"
      />
    </g>
  );
}
