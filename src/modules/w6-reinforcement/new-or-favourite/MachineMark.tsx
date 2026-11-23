import type { Machine } from "./model";

const INK = { stroke: "var(--color-ink)", strokeWidth: 1.2 };

const starPoints = Array.from({ length: 10 }, (_, at) => {
  const angle = (Math.PI / 5) * at - Math.PI / 2;
  const radius = at % 2 === 0 ? 6.5 : 2.8;
  return `${(Math.cos(angle) * radius).toFixed(2)},${(Math.sin(angle) * radius).toFixed(2)}`;
}).join(" ");

/** Each machine's own shape, drawn about 13 units across around (0, 0). */
export function MachineMark({ machine }: { machine: Machine }) {
  const paper = { fill: "var(--color-sand)", ...INK };
  switch (machine) {
    case "star":
      return <polygon points={starPoints} {...paper} />;
    case "moon":
      return <path d="M2 -6.5a6.5 6.5 0 1 0 0 13a5 5 0 1 1 0 -13z" {...paper} />;
    case "heart":
      return (
        <path
          d="M0 5.5C-8 0 -6.5 -6.5 -2.8 -6.5C-1.2 -6.5 0 -5.2 0 -4C0 -5.2 1.2 -6.5 2.8 -6.5C6.5 -6.5 8 0 0 5.5z"
          {...paper}
        />
      );
    case "bell":
      return (
        <>
          <path d="M-6 3.5Q-5.5 -6.5 0 -6.5Q5.5 -6.5 6 3.5z" {...paper} />
          <circle cx={0} cy={5} r={1.6} fill="var(--color-ink)" />
        </>
      );
    case "leaf":
      return (
        <>
          <path d="M-6 5Q-6.5 -6 6 -6Q6.5 5 -6 5z" {...paper} />
          <path
            d="M-5 4L4 -5"
            fill="none"
            stroke="var(--color-ink)"
            strokeWidth={1.2}
            strokeLinecap="round"
          />
        </>
      );
  }
}
