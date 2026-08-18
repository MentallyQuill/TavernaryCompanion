import { fireEvent, render, screen, waitFor } from "@testing-library/preact";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CompanionShell } from "../../src/ui/shell/companion-shell";
import { createShellController } from "../../src/ui/shell/shell-controller";

afterEach(() => {
  document.body.replaceChildren();
});

describe("CompanionShell", () => {
  it("restores the originating card after closing project detail", async () => {
    const controller = createShellController({ initialRoute: "projects" });
    render(<CompanionShell controller={controller} projects={[{ id: "alpha", name: "Alpha" }]} />);
    const card = screen.getByRole("button", { name: "View Alpha" });
    card.focus();
    fireEvent.click(card);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    await waitFor(() => expect(card).toHaveFocus());
  });

  it("renders semantic routes and restores the active route from state", () => {
    const controller = createShellController({ initialRoute: "installed" });
    render(<CompanionShell controller={controller} />);

    expect(screen.getByRole("heading", { name: "Tavernary Companion" })).toBeVisible();
    expect(screen.getByRole("navigation", { name: "Companion sections" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Installed" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("main")).toHaveTextContent("Installed extensions");
  });

  it("uses one browser Back event for the top detail and preserves the popup", () => {
    const controller = createShellController({ initialRoute: "projects" });
    render(<CompanionShell controller={controller} projects={[{ id: "alpha", name: "Alpha" }]} />);
    fireEvent.click(screen.getByRole("button", { name: "View Alpha" }));

    fireEvent(window, new PopStateEvent("popstate"));

    expect(screen.queryByRole("button", { name: "Back" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Tavernary Companion" })).toBeVisible();
  });

  it("dispatches the close intent", () => {
    const onRequestClose = vi.fn();
    const controller = createShellController({ initialRoute: "projects" });
    render(<CompanionShell controller={controller} onRequestClose={onRequestClose} />);

    fireEvent.click(screen.getByRole("button", { name: "Close Tavernary Companion" }));

    expect(onRequestClose).toHaveBeenCalledOnce();
  });
});
