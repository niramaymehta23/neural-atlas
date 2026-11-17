import { constellationCaptions as captions } from "./captions";

/** What a star tells the learner beyond its name: learned, next to try, or not built yet. */
export type StarStatus = "learned" | "next" | "locked" | null;

export function starStatus({
  learned,
  suggested,
  built,
}: {
  learned: boolean;
  suggested: boolean;
  built: boolean;
}): StarStatus {
  if (learned) return "learned";
  if (suggested) return "next";
  return built ? null : "locked";
}

/** The words for a status, shown on the label and spoken with the name. */
export function statusWords(status: StarStatus): string | null {
  return status === null ? null : captions[status];
}

/** A star link's accessible name: "Rolling downhill, You have learned this". */
export function starName(title: string, status: StarStatus): string {
  const words = statusWords(status);
  return words ? `${title}, ${words}` : title;
}
