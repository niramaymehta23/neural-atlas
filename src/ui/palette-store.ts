import { createStore } from "zustand/vanilla";

/** Whether the one command palette is open; its trigger can sit anywhere (the site nav). */
export const paletteStore = createStore<{ open: boolean }>(() => ({ open: false }));

export const setPaletteOpen = (open: boolean) => paletteStore.setState({ open });
