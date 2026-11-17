/**
 * Lessons that run the picture-reading model in the page. Headless Chromium draws WebGL in
 * software, so one of these pages keeps several cores busy while it loads and reads pictures:
 * their tests carry the @gpu tag and run one at a time in the `gpu` project, after `functional`,
 * so they never compete with each other or with the rest of the suite (see playwright.config.ts).
 */
export const PICTURE_LESSONS: readonly string[] = [
  "how-machines-see",
  "zooming-out",
  "standing-on-giants",
];

export const GPU = "@gpu";

/** The tag for a test that opens `path`, if it is a picture-reading lesson. */
export const gpuTagFor = (path: string) =>
  PICTURE_LESSONS.some((id) => path === `/learn/${id}`) ? [GPU] : [];
