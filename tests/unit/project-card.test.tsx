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
    displayName: "Alpha",
    summary: "A compact extension for testing.",
    kind: "extension",
    frontends: ["SillyTavern"],
    primaryFunctionId: "interface-workflow",
    primaryFunction: "Interface & Workflow",
    tags: ["Workflow", "Utility"],
    tagChips: [
      { label: "Workflow", facet: "goal" },
      { label: "Utility", facet: "trait" },
    ],
    licenseLabel: "MIT",
    licenseStatus: "osi-approved",
    attributionLabel: null,
    activity: {
      latestSourceActivityAt: "2026-08-17T00:00:00.000Z",
      latestSourceActivityLabel: "1d ago",
      latestSourceActivityFreshness: 96.67,
      activeWeeks12: 5,
      evidenceStatus: "complete",
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
    communityAggregate: 11,
    repositorySizeLabel: "2.0 MB repo",
    preset: null,
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
    expect(screen.queryByText("5 of 12 active weeks")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Activity: 5 of 12 active weeks")).toBeVisible();
    expect(screen.queryByLabelText("TavernKeeper scan: Not assessed")).not.toBeInTheDocument();
    expect(screen.queryByText("Not assessed")).not.toBeInTheDocument();
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

  it("uses Tavernary's compact scan glyph when TavernKeeper status exists", () => {
    render(
      <ProjectCard
        project={project({
          tavernKeeper: {
            state: "gray",
            riskLevel: null,
            freshness: "unassessed",
            currentSha: "a".repeat(40),
            report: null,
            history: [],
            historyUrl: null,
          },
        })}
        onOpen={vi.fn()}
        onAction={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("TavernKeeper scan: Not assessed")).toBeVisible();
    expect(document.querySelector('svg[data-icon="scan-fill"]')).toBeVisible();
    expect(screen.queryByText("Not assessed")).not.toBeInTheDocument();
  });

  it("matches Tavernary's unavailable and quiet activity states", () => {
    const view = render(
      <ProjectCard
        project={project({
          activity: {
            ...project().activity,
            weeklyActivity: null,
          },
        })}
        onOpen={vi.fn()}
        onAction={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Activity unavailable")).toHaveTextContent("No data");
    expect(screen.queryByText("1d ago")).not.toBeInTheDocument();

    view.rerender(
      <ProjectCard
        project={project({
          activity: {
            ...project().activity,
            latestSourceActivityAt: null,
            latestSourceActivityLabel: null,
          },
        })}
        onOpen={vi.fn()}
        onAction={vi.fn()}
      />,
    );
    expect(screen.getByText("Quiet")).toBeVisible();

    view.rerender(
      <ProjectCard
        project={project({
          activity: {
            ...project().activity,
            latestSourceActivityAt: null,
            latestSourceActivityLabel: null,
            evidenceStatus: "provisional",
          },
        })}
        onOpen={vi.fn()}
        onAction={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Activity: 5 of 12 active weeks, baseline pending")).toHaveClass(
      "evidence-provisional",
    );
    expect(screen.getByText("Pending")).toBeVisible();

    view.rerender(
      <ProjectCard
        project={project({
          activity: {
            ...project().activity,
            evidenceStatus: "degraded",
          },
        })}
        onOpen={vi.fn()}
        onAction={vi.fn()}
      />,
    );
    expect(
      screen.getByLabelText("Activity: 5 of 12 active weeks, evidence incomplete"),
    ).toHaveClass("evidence-degraded");
  });

  it("uses the primary function icon for extensions and kind icons for structural cards", () => {
    const view = render(
      <ProjectCard
        project={project({
          primaryFunctionId: "memory-retrieval",
          primaryFunction: "Memory & Retrieval",
        })}
        onOpen={vi.fn()}
        onAction={vi.fn()}
      />,
    );
    const memoryIcon = document.querySelector('svg[data-icon="memory-retrieval"]');
    expect(memoryIcon).toHaveAttribute("viewBox", "0 0 24 24");
    expect(memoryIcon?.querySelectorAll("path")).toHaveLength(8);
    expect(screen.getByLabelText("Memory & Retrieval Extension")).toBeVisible();

    view.rerender(
      <ProjectCard
        project={project({
          kind: "preset",
          primaryFunctionId: "preset",
          primaryFunction: "System Presets",
          preset: {
            versionLabel: "v1.2.0",
            publishedLabel: "Published 1d ago",
            sizeLabel: "2 KB file",
            modelFamilies: ["Model-Agnostic"],
            completionFormats: ["Chat Completion"],
          },
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
    expect(screen.getByText("System Preset")).toBeVisible();
    expect(
      document.querySelector('svg[data-icon="preset"]')?.querySelectorAll("path"),
    ).toHaveLength(2);
    expect(screen.queryByText("Activity")).not.toBeInTheDocument();
    expect(screen.getByText("v1.2.0")).toBeVisible();
  });

  it("uses the Tavernary display name consistently in card actions", () => {
    render(
      <ProjectCard
        project={project({ name: "SillyTavern Alpha", displayName: "Alpha" })}
        onOpen={vi.fn()}
        onAction={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "View Alpha details" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "View SillyTavern Alpha details" }),
    ).not.toBeInTheDocument();
  });

  it("uses Tavernary chip and license semantics without invented compatibility", () => {
    const view = render(<ProjectCard project={project()} onOpen={vi.fn()} onAction={vi.fn()} />);

    expect(screen.getByText("SillyTavern")).toHaveClass("tavernary-companion-chip--frontend");
    expect(screen.getByText("Workflow")).toHaveClass("tavernary-companion-chip--tag");
    expect(screen.getByText("Workflow")).toHaveClass("tag-goal");
    expect(screen.queryByText("Interface & Workflow")).not.toBeInTheDocument();
    expect(screen.getByText("MIT")).toHaveClass("license-osi-approved");

    view.rerender(
      <ProjectCard project={project({ frontends: [] })} onOpen={vi.fn()} onAction={vi.fn()} />,
    );
    expect(screen.queryByText("Frontend-neutral")).not.toBeInTheDocument();
  });

  it("shows Tavernary activity, community, and repository metadata", () => {
    render(<ProjectCard project={project()} onOpen={vi.fn()} onAction={vi.fn()} />);

    expect(screen.getByText("1d ago")).toBeVisible();
    expect(screen.getByText("11")).toBeVisible();
    expect(screen.getByText("2.0 MB repo")).toBeVisible();
    expect(screen.getByLabelText("Community activity: 11")).toBeVisible();
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
