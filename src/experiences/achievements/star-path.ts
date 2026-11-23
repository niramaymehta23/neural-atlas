const POINTS = 5;
const OUTER = 10;
const INNER = 4.4;

/** A five-pointed star around (0, 0), ten across from the middle to a tip. */
export const STAR_PATH = `M${Array.from({ length: POINTS * 2 }, (_, at) => {
  const angle = (at / POINTS) * Math.PI - Math.PI / 2;
  const reach = at % 2 === 0 ? OUTER : INNER;
  return `${(Math.cos(angle) * reach).toFixed(2)} ${(Math.sin(angle) * reach).toFixed(2)}`;
}).join("L")}Z`;
