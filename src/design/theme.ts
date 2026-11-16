export const THEMES = ["ivory", "night"] as const;
export type Theme = (typeof THEMES)[number];

const STORAGE_KEY = "neural-atlas-theme";

function isTheme(value: unknown): value is Theme {
  return THEMES.some((theme) => theme === value);
}

/** Inline script for <head>: applies the saved theme before first paint (ivory otherwise). */
export const themeInitScript = `try{var t=localStorage.getItem(${JSON.stringify(STORAGE_KEY)});if(t===${JSON.stringify(THEMES[1])})document.documentElement.dataset.theme=t}catch(e){}`;

export function readTheme(): Theme {
  const current = document.documentElement.dataset.theme;
  return isTheme(current) ? current : "ivory";
}

/** Calls back whenever the theme changes, from any switch. */
export function subscribeToTheme(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage can be blocked (private mode); the theme still applies for this visit.
  }
}
