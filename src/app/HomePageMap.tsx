"use client";

import { useMemo } from "react";
import { HomeMap } from "@/constellation/HomeMap";
import { achievements, earnedAchievements } from "@/experiences/achievements/achievements";
import { AchievementMark } from "@/experiences/achievements/AchievementMark";
import { useProgress } from "@/platform/progress/progress";

/** The home map with the stars earned beyond its ideas. */
export function HomePageMap() {
  const progress = useProgress((saved) => saved);
  const extras = useMemo(() => {
    const earned = earnedAchievements(progress);
    return achievements
      .filter(({ id }) => earned.has(id))
      .map(({ id, title, href }) => ({
        id,
        title,
        href,
        mark: <AchievementMark earned className="size-full" />,
      }));
  }, [progress]);
  return <HomeMap extras={extras} />;
}
