import { fireEvent, render, screen } from "@testing-library/preact";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ProjectCardViewModel } from "../../src/catalog/project-view-model";
import { COMPANION_PROJECT_ID } from "../../src/lifecycle/self-protection";
import { ProjectCard } from "../../src/ui/projects/project-card";

afterEach(() => document.body.replaceChildren());

function project(overrides: Partial<ProjectCardViewModel> = {}): ProjectCardViewModel {
  return {
    id: "alpha",
    name: "Alpha",
    summary: "A compact extension for testing.",
    kind: "extension",
    frontends: ["SillyTavern"],
    primaryFunction: "Interface & Workflow",
    tags: ["Workflow", "Utility"],
    licenseLabel: "MIT",
    attributionLabel: null,
    activity: {
      latestSourceActivityAt: "2026-08-17T00:00:00.000Z",
      activeWeeks12: 5,
      weeklyActivity: [
        false,
        true,
        false,
        true,
        false,
        true,
        false,
        true,
        false,
        true,
        false,
        true,
      ],
      dormant: false,
    },
    tavernKeeper: null,
    installed: false,
    ownership: "absent",
    kitSelectable: true,
    action: { kind: "install", label: "Install", reason: null },
    ...overrides,
  };
}

describe("ProjectCard", () => {
  it("renders bounded evidence and exactly one primary lifecycle action", () => {
    const onOpen = vi.fn();
    const onAction = vi.fn();
    render(<ProjectCard project={project()} onOpen={onOpen} onAction={onAction} />);

    expect(screen.getByRole("heading", { name: "Alpha" })).toBeVisible();
    expect(screen.getByText("Extension")).toBeVisible();
    expect(screen.getByText("Interface & Workflow")).toBeVisible();
    expect(screen.queryByText("5 of 12 active weeks")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Activity: 5 of 12 active weeks")).toBeVisible();
    expect(screen.getByText("Not assessed")).toBeVisible();
    expect(screen.getByText("SillyTavern")).toBeVisible();
    expect(screen.getByText("Workflow")).toBeVisible();
    expect(screen.getByText("MIT")).toBeVisible();
    expect(document.querySelectorAll(".tavernary-companion-activity-strip i")).toHaveLength(12);
    const install = screen.getByRole("button", { name: "Install Alpha" });
    expect(install).toHaveClass("tavernary-companion-project-card__compact-action");
    expect(install).toHaveTextContent("+");
    expect(screen.getByRole("button", { name: "View Alpha details" })).toBeVisible();

    fireEvent.click(install);
    expect(onAction).toHaveBeenCalledWith(project().action);
    fireEvent.click(screen.getByRole("button", { name: "View Alpha details" }));
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it("keeps destructive uninstall actions visibly labeled", () => {
    render(
      <ProjectCard
        project={project({
          installed: true,
          ownership: "managed",
          action: { kind: "uninstall", label: "Uninstall", reason: "Managed by Companion" },
        })}
        onOpen={vi.fn()}
        onAction={vi.fn()}
      />,
    );

    const uninstall = screen.getByRole("button", { name: "Uninstall Alpha" });
    expect(uninstall).toHaveTextContent("Uninstall");
    expect(uninstall).not.toHaveClass("tavernary-companion-project-card__compact-action");
  });

  it("explains browse-only actions without presenting them as installable", () => {
    render(
      <ProjectCard
        project={project({
          kind: "preset",
          action: {
            kind: "view-project",
            label: "View project",
            reason: "Preset installation is not available in V1",
          },
        })}
        onOpen={vi.fn()}
        onAction={vi.fn()}
      />,
    );

    expect(screen.getByText("Preset installation is not available in V1")).toBeVisible();
    expect(screen.queryByRole("button", { name: /Install Alpha/ })).not.toBeInTheDocument();
    expect(screen.getByTestId("project-primary-action")).toHaveClass(
      "tavernary-companion-button--secondary",
    );
    expect(screen.getByTestId("project-primary-action")).not.toHaveClass(
      "tavernary-companion-button--primary",
    );
  });

  it("renders compact attribution only when Tavernary provides it", () => {
    const view = render(
      <ProjectCard
        project={project({ attributionLabel: "By tavernary-author" })}
        onOpen={vi.fn()}
        onAction={vi.fn()}
      />,
    );
    expect(screen.getByText("By tavernary-author")).toBeVisible();

    view.rerender(<ProjectCard project={project()} onOpen={vi.fn()} onAction={vi.fn()} />);
    expect(screen.queryByText("By tavernary-author")).not.toBeInTheDocument();
  });

  it("never renders a lifecycle action for Companion even with a malformed model", () => {
    render(
      <ProjectCard
        project={project({ id: COMPANION_PROJECT_ID, action: project().action })}
        onOpen={vi.fn()}
        onAction={vi.fn()}
        onManageInSillyTavern={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /Install Alpha/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Manage in SillyTavern" })).toBeVisible();
  });

  it("toggles eligible projects while Kit selection is active", () => {
    const toggle = vi.fn();
    const { rerender } = render(
      <ProjectCard
        project={project()}
        onOpen={vi.fn()}
        onAction={vi.fn()}
        kitSelectionActive
        selectedForKit={false}
        onToggleKitSelection={toggle}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Add to Kit" }));
    expect(toggle).toHaveBeenCalledWith("alpha");
    expect(screen.getByRole("button", { name: "Add to Kit" })).toHaveClass(
      "tavernary-companion-button--primary",
    );

    rerender(
      <ProjectCard
        project={project()}
        onOpen={vi.fn()}
        onAction={vi.fn()}
        kitSelectionActive
        selectedForKit
        onToggleKitSelection={toggle}
      />,
    );
    expect(screen.getByRole("button", { name: "Remove from Kit" })).toBeVisible();
  });
});
