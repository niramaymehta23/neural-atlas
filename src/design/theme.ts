export const THEMES = ["ivory", "night"] as const;
export type Theme = (typeof THEMES)[number];

const STORAGE_KEY = "neural-atlas-theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

function isTheme(value: unknown): value is Theme {
  return THEMES.some((theme) => theme === value);
}

/**
 * Inline script for <head>: applies the learner's chosen theme before first paint, or follows
 * the system's light or dark setting when they have not chosen.
 */
export const themeInitScript = `try{var t=localStorage.getItem(${JSON.stringify(STORAGE_KEY)});if(t!==${JSON.stringify(THEMES[0])}&&t!==${JSON.stringify(THEMES[1])})t=matchMedia(${JSON.stringify(DARK_QUERY)}).matches?${JSON.stringify(THEMES[1])}:${JSON.stringify(THEMES[0])};document.documentElement.dataset.theme=t}catch(e){}`;

export function readTheme(): Theme {
  const current = document.documentElement.dataset.theme;
  return isTheme(current) ? current : "ivory";
}

function savedTheme(): Theme | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return isTheme(saved) ? saved : null;
  } catch {
    return null;
  }
}

function systemTheme(): Theme {
  return window.matchMedia?.(DARK_QUERY).matches ? "night" : "ivory";
}

function show(theme: Theme): void {
  if (document.documentElement.dataset.theme !== theme)
    document.documentElement.dataset.theme = theme;
}

/**
 * Calls back whenever the theme changes, from any switch. While subscribed, the page also
 * follows a choice made in another tab and, with no choice saved, the system setting.
 */
export function subscribeToTheme(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributeFilter: ["data-theme"] });
  const follow = () => show(savedTheme() ?? systemTheme());
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) follow();
  };
  const system = window.matchMedia?.(DARK_QUERY);
  window.addEventListener("storage", onStorage);
  system?.addEventListener?.("change", follow);
  return () => {
    observer.disconnect();
    window.removeEventListener("storage", onStorage);
    system?.removeEventListener?.("change", follow);
  };
}

export function applyTheme(theme: Theme): void {
  show(theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage can be blocked (private mode); the theme still applies for this visit.
  }
}
