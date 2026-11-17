/** Counts of a yes/no sorter at one threshold. "Yes" means it says the thing is there. */
export type Confusion = {
  /** Said yes, and it was there. */
  caught: number;
  /** Said yes, but it was not (a false alarm). */
  falseAlarm: number;
  /** Said no, and it was not there. */
  clear: number;
  /** Said no, but it was there (missed). */
  missed: number;
};

/** Sorts each item: yes when its score is at or above the threshold. */
export function confusion(
  scores: readonly number[],
  truth: readonly boolean[],
  threshold: number,
): Confusion {
  const result = { caught: 0, falseAlarm: 0, clear: 0, missed: 0 };
  scores.forEach((score, index) => {
    const yes = score >= threshold;
    const there = truth[index] ?? false;
    if (yes && there) result.caught += 1;
    else if (yes) result.falseAlarm += 1;
    else if (there) result.missed += 1;
    else result.clear += 1;
  });
  return result;
}

export function accuracy({ caught, falseAlarm, clear, missed }: Confusion): number {
  const total = caught + falseAlarm + clear + missed;
  return total ? (caught + clear) / total : 0;
}

/** The share of real cases it caught (recall); 0 when there were none. */
export function caughtShare({ caught, missed }: Confusion): number {
  return caught + missed ? caught / (caught + missed) : 0;
}

/** The share of its alarms that were real (precision); 0 when it raised none. */
export function trustShare({ caught, falseAlarm }: Confusion): number {
  return caught + falseAlarm ? caught / (caught + falseAlarm) : 0;
}

export type RocPoint = { threshold: number; falseAlarms: number; caught: number };

/**
 * The ROC curve: for every distinct score from high to low, the share of ordinary items raised as
 * alarms (x) against the share of real cases caught (y). Starts at (0, 0) and ends at (1, 1).
 */
export function rocCurve(scores: readonly number[], truth: readonly boolean[]): RocPoint[] {
  const positives = truth.filter(Boolean).length;
  const negatives = truth.length - positives;
  const thresholds = [...new Set(scores)].sort((a, b) => b - a);
  const curve: RocPoint[] = [{ threshold: Infinity, falseAlarms: 0, caught: 0 }];
  for (const threshold of thresholds) {
    const counts = confusion(scores, truth, threshold);
    curve.push({
      threshold,
      falseAlarms: negatives ? counts.falseAlarm / negatives : 0,
      caught: positives ? counts.caught / positives : 0,
    });
  }
  return curve;
}

/** Area under the curve by trapezoids: 1 is a perfect sorter, 0.5 a coin toss. */
export function areaUnder(curve: readonly RocPoint[]): number {
  let area = 0;
  for (let index = 1; index < curve.length; index += 1) {
    const a = curve[index - 1] as RocPoint;
    const b = curve[index] as RocPoint;
    area += ((b.falseAlarms - a.falseAlarms) * (a.caught + b.caught)) / 2;
  }
  return area;
}
