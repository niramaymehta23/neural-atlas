import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setPaletteOpen } from "@/ui/palette-store";
import { CatalogPalette } from "./CatalogPalette";

const router = vi.hoisted(() => ({ push: vi.fn(), prefetch: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

afterEach(() => act(() => setPaletteOpen(false)));

describe("finding things by name", () => {
  it.each([
    ["rolling down", "/learn/rolling-downhill"],
    ["sandbox", "/sandbox"],
    ["theatre", "/theatre"],
    ["museum", "/museum"],
  ])("“%s” leads to %s", async (typed, address) => {
    router.push.mockClear();
    render(<CatalogPalette />);
    act(() => setPaletteOpen(true));
    await userEvent.type(await screen.findByRole("combobox"), typed);
    await userEvent.keyboard("{Enter}");
    expect(router.push).toHaveBeenCalledExactlyOnceWith(address);
  });
});
