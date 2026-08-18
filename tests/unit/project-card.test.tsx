import { fireEvent, render, screen } from "@testing-library/preact";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ProjectCardViewModel } from "../../src/catalog/project-view-model";
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
    activity: {
      latestSourceActivityAt: "2026-08-17T00:00:00.000Z",
      activeWeeks12: 5,
      dormant: false,
    },
    tavernKeeper: null,
    installed: false,
    ownership: "absent",
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
    expect(screen.getByText("Extension · Interface & Workflow")).toBeVisible();
    expect(screen.getByText("5 of 12 active weeks")).toBeVisible();
    expect(screen.getByText("Not assessed")).toBeVisible();
    expect(screen.getAllByTestId("project-primary-action")).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Install Alpha" }));
    expect(onAction).toHaveBeenCalledWith(project().action);
    fireEvent.click(screen.getByRole("button", { name: "View Alpha" }));
    expect(onOpen).toHaveBeenCalledOnce();
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
  });
});
