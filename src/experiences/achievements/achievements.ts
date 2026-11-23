import { createStore } from "zustand/vanilla";
import { lessons, worlds } from "@/catalog";
import { isMastered, progressStore, starCount, type Progress } from "@/platform/progress/progress";
import { achievementCaptions as words } from "./captions";

export type AchievementId = string;
export type Achievement = { id: AchievementId; title: string; how: string; href: string };

const TEN = 10;
const { list } = words;

/** Recorded when they happen, away from the lessons. */
const RECORDED = [
  { id: "sandbox-garden", href: "/sandbox" },
  { id: "sandbox-board", href: "/sandbox" },
  { id: "journey", href: "/journeys" },
  { id: "museum", href: "/museum" },
  { id: "theatre", href: "/theatre" },
  { id: "race", href: "/two-player" },
  { id: "mend", href: "/two-player" },
  { id: "sound", href: "/sandbox" },
  { id: "words", href: "/explore" },
] as const;
export type RecordedId = (typeof RECORDED)[number]["id"];

/** Every achievement there is, in the order they sit on the map. */
export const achievements: readonly Achievement[] = [
  { id: "first-star", ...list["first-star"], href: "/" },
  { id: "ten-stars", ...list["ten-stars"], href: "/" },
  ...worlds.map(({ world, title }) => ({
    id: `world-${world}`,
    ...words.world(title),
    href: `/?world=${world}`,
  })),
  ...RECORDED.map(({ id, href }) => ({ id, ...list[id], href })),
];

/** Which achievements this progress has earned: some follow from the lessons, some are recorded. */
export function earnedAchievements(progress: Progress): ReadonlySet<AchievementId> {
  const stars = starCount(progress);
  const earned = new Set<AchievementId>();
  if (stars >= 1) earned.add("first-star");
  if (stars >= TEN) earned.add("ten-stars");
  for (const { world } of worlds) {
    const own = lessons.filter((lesson) => lesson.world === world);
    if (own.length > 0 && own.every(({ id }) => isMastered(progress.lessons[id])))
      earned.add(`world-${world}`);
  }
  for (const { id } of RECORDED) if (progress.achievements.includes(id)) earned.add(id);
  return earned;
}

/** The achievement just earned, for the note that says so; null once the note has gone. */
export const awardStore = createStore<{ latest: Achievement | null }>(() => ({ latest: null }));

/** Records an achievement; the first time, says so. Progress is read first, so it is said once. */
export async function award(id: RecordedId): Promise<void> {
  await progressStore.ready;
  if (progressStore.getState().achievements.includes(id)) return;
  const achievement = achievements.find((known) => known.id === id) ?? null;
  awardStore.setState({ latest: achievement });
  await progressStore.recordAchievement(id);
}
