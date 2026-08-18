import { fireEvent, render, screen, waitFor } from "@testing-library/preact";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { InstalledSectionViewModel } from "../../src/catalog/installed-view-model";
import { InstalledRoute } from "../../src/ui/installed/installed-route";

afterEach(() => document.body.replaceChildren());

const sections: InstalledSectionViewModel[] = [
  {
    id: "managed",
    title: "Managed by Companion",
    rows: [
      {
        id: "alpha",
        name: "Alpha",
        detail: "Alpha",
        enabled: true,
        action: { kind: "uninstall", label: "Uninstall", reason: "Managed by Companion" },
      },
    ],
  },
  { id: "external", title: "Installed outside Companion", rows: [] },
  {
    id: "unknown",
    title: "Not found in current catalog",
    rows: [
      {
        id: "third-party/Mystery",
        name: "Mystery",
        detail: "third-party/Mystery",
        enabled: false,
        action: {
          kind: "manage-in-sillytavern",
          label: "Manage in SillyTavern",
          reason: "No unambiguous Tavernary project identity.",
        },
      },
    ],
  },
  { id: "attention", title: "Needs attention", rows: [] },
];

describe("InstalledRoute", () => {
  it("renders all inventory sections and refreshes host inventory on entry", async () => {
    const onRefresh = vi.fn();
    render(<InstalledRoute sections={sections} onRefresh={onRefresh} />);

    expect(screen.getByRole("heading", { name: "Managed by Companion" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Installed outside Companion" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Not found in current catalog" })).toBeVisible();
    await waitFor(() => expect(onRefresh).toHaveBeenCalledOnce());
  });

  it("gives unknown extensions only the SillyTavern management handoff", () => {
    const onManage = vi.fn();
    render(<InstalledRoute sections={sections} onRefresh={vi.fn()} onManage={onManage} />);

    fireEvent.click(screen.getByRole("button", { name: "Manage Mystery in SillyTavern" }));
    expect(onManage).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: /View Mystery/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Uninstall Mystery/ })).not.toBeInTheDocument();
  });

  it("keeps the last inventory visible while rediscovery is running", () => {
    render(<InstalledRoute sections={sections} refreshing onRefresh={vi.fn()} />);
    expect(screen.getByText("Updating installed extensions…")).toBeVisible();
    expect(screen.getAllByText("Alpha")[0]).toBeVisible();
  });
});
