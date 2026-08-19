import { fireEvent, render, screen } from "@testing-library/preact";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PreparedUpdateSelection } from "../../src/updates/update-types";
import { UpdateVersionChooser } from "../../src/ui/installed/update-version-chooser";

afterEach(() => document.body.replaceChildren());

function selection(kind: "checked" | "newest"): PreparedUpdateSelection {
  const requestedSha = kind === "checked" ? "a".repeat(40) : "b".repeat(40);
  return {
    target:
      kind === "checked"
        ? {
            kind,
            requestedSha,
            checkedAt: "2026-08-17T12:00:00.000Z",
            reportId: "report-alpha",
            reportUrl: "https://tavernary.org/scan/alpha",
          }
        : { kind, requestedSha, resolvedAt: "2026-08-19T12:00:00.000Z" },
    binding: {
      projectId: "alpha",
      catalogGeneratedAt: "2026-08-19T10:00:00.000Z",
      internalName: "third-party/Alpha",
      installedSha: "1".repeat(40),
      repositoryUrl: "https://example.com/alpha.git",
      branch: "main",
      requestedSha,
    },
  };
}

function anchor(): HTMLButtonElement {
  const button = document.createElement("button");
  button.textContent = "Update Alpha";
  button.getBoundingClientRect = () =>
    ({
      bottom: 144,
      height: 44,
      left: 220,
      right: 264,
      top: 100,
      width: 44,
      x: 220,
      y: 100,
      toJSON: () => ({}),
    }) as DOMRect;
  document.body.append(button);
  return button;
}

describe("UpdateVersionChooser", () => {
  it("offers the exact scanned and newest targets without recommending either", () => {
    const updateButton = anchor();
    const onSelect = vi.fn();
    const selections = [selection("checked"), selection("newest")];
    render(
      <UpdateVersionChooser
        projectId="alpha"
        projectName="Alpha"
        anchor={updateButton}
        choice={{ notice: null, selections }}
        onSelect={onSelect}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Update Alpha" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Latest scanned version" }),
    ).toHaveAccessibleDescription(
      "The latest version scanned by TavernKeeper. TavernKeeper checked this version on Aug 17.",
    );
    expect(screen.getByRole("button", { name: "Newest version" })).toHaveAccessibleDescription(
      "The latest version from the creator. It may include changes TavernKeeper hasn't checked yet.",
    );
    expect(screen.getByRole("dialog")).not.toHaveTextContent(/recommended/i);

    const checked = screen.getByRole("button", { name: "Latest scanned version" });
    fireEvent.click(checked);
    fireEvent.click(checked);
    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith(selections[0]);
  });

  it("omits the scanned choice and explains when it is already installed", () => {
    render(
      <UpdateVersionChooser
        projectId="alpha"
        projectName="Alpha"
        anchor={anchor()}
        choice={{
          notice: "You already have the latest scanned version.",
          selections: [selection("newest")],
        }}
        onSelect={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText("You already have the latest scanned version.")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Latest scanned version" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Newest version" })).toBeEnabled();
  });

  it("cancels on Escape and restores focus to Update", () => {
    const updateButton = anchor();
    const onCancel = vi.fn();
    render(
      <UpdateVersionChooser
        projectId="alpha"
        projectName="Alpha"
        anchor={updateButton}
        choice={{ notice: null, selections: [selection("newest")] }}
        onSelect={vi.fn()}
        onCancel={onCancel}
      />,
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledOnce();
    expect(updateButton).toHaveFocus();
  });
});
