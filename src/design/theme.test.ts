import { applyTheme, readTheme, subscribeToTheme, themeInitScript } from "./theme";

function mockSystem(dark: boolean) {
  const listeners = new Set<() => void>();
  const query = {
    matches: dark,
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  };
  window.matchMedia = (() => query) as unknown as typeof window.matchMedia;
  return {
    change: (next: boolean) => {
      query.matches = next;
      for (const listener of listeners) listener();
    },
  };
}

const runInit = () => new Function(themeInitScript)();

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe("theme", () => {
  it("follows a dark system setting when nothing is saved", () => {
    mockSystem(true);
    runInit();
    expect(readTheme()).toBe("night");
  });

  it("keeps the learner's own choice over the system", () => {
    mockSystem(true);
    localStorage.setItem("neural-atlas-theme", "ivory");
    runInit();
    expect(readTheme()).toBe("ivory");
  });

  it("follows the system while it changes, until the learner chooses", () => {
    const system = mockSystem(false);
    runInit();
    const stop = subscribeToTheme(() => undefined);
    system.change(true);
    expect(readTheme()).toBe("night");
    applyTheme("ivory");
    system.change(true);
    expect(readTheme()).toBe("ivory");
    stop();
  });

  it("picks up a choice made in another tab", () => {
    mockSystem(false);
    runInit();
    const stop = subscribeToTheme(() => undefined);
    localStorage.setItem("neural-atlas-theme", "night");
    window.dispatchEvent(new StorageEvent("storage", { key: "neural-atlas-theme" }));
    expect(readTheme()).toBe("night");
    stop();
  });
});
