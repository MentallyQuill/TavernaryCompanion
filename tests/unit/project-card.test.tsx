import { fireEvent, render, screen, within } from "@testing-library/preact";
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
    canonicalUrl: "https://example.com/alpha",
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
  it("opens the canonical project source from the card and has no Details action", () => {
    render(
      <ProjectCard
        project={{ ...project(), canonicalUrl: "https://example.test/repo" }}
        onAction={vi.fn()}
      />,
    );

    const link = screen.getByRole("link", { name: "Alpha" });
    expect(link).toHaveAttribute("href", "https://example.test/repo");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(screen.queryByRole("button", { name: /details/i })).not.toBeInTheDocument();
  });

  it("renders bounded evidence and exactly one primary lifecycle action", () => {
    const onAction = vi.fn();
    render(<ProjectCard project={project()} onAction={onAction} />);

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
    expect(install).toHaveAttribute("aria-pressed", "false");
    expect(install).toHaveAttribute("title", "Install");
    expect(install.querySelector('svg[data-icon="install"]')).not.toBeNull();
    expect(screen.queryByRole("button", { name: /details/i })).not.toBeInTheDocument();

    fireEvent.click(install);
    expect(onAction).toHaveBeenCalledWith(project().action);
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
        onAction={vi.fn()}
      />,
    );

    expect(screen.getByRole("link", { name: "Alpha" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "SillyTavern Alpha" })).not.toBeInTheDocument();
  });

  it("uses Tavernary chip and license semantics without invented compatibility", () => {
    const view = render(<ProjectCard project={project()} onAction={vi.fn()} />);

    expect(screen.getByText("SillyTavern")).toHaveClass("tavernary-companion-chip--frontend");
    expect(screen.getByText("Workflow")).toHaveClass("tavernary-companion-chip--tag");
    expect(screen.getByText("Workflow")).toHaveClass("tag-goal");
    expect(screen.queryByText("Interface & Workflow")).not.toBeInTheDocument();
    expect(screen.getByText("MIT")).toHaveClass("license-osi-approved");

    view.rerender(<ProjectCard project={project({ frontends: [] })} onAction={vi.fn()} />);
    expect(screen.queryByText("Frontend-neutral")).not.toBeInTheDocument();
  });

  it("shows Tavernary activity, community, and repository metadata", () => {
    render(<ProjectCard project={project()} onAction={vi.fn()} />);

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
        onAction={vi.fn()}
      />,
    );

    const uninstall = screen.getByRole("button", { name: "Uninstall Alpha" });
    expect(uninstall).toHaveAttribute("aria-pressed", "true");
    expect(uninstall.querySelector('svg[data-icon="install"]')).not.toBeNull();
    expect(uninstall).toHaveClass("is-installed");
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
        onAction={vi.fn()}
      />,
    );

    expect(screen.getByText("Preset installation is not available in V1")).toBeVisible();
    expect(screen.queryByRole("button", { name: /Install Alpha/ })).not.toBeInTheDocument();
    expect(screen.queryByTestId("project-lifecycle-action")).not.toBeInTheDocument();
  });

  it("renders compact attribution only when Tavernary provides it", () => {
    const view = render(
      <ProjectCard
        project={project({ attributionLabel: "By tavernary-author" })}
        onAction={vi.fn()}
      />,
    );
    expect(screen.getByText("By tavernary-author")).toBeVisible();

    view.rerender(<ProjectCard project={project()} onAction={vi.fn()} />);
    expect(screen.queryByText("By tavernary-author")).not.toBeInTheDocument();
  });

  it("never renders a lifecycle action for Companion even with a malformed model", () => {
    render(
      <ProjectCard
        project={project({ id: COMPANION_PROJECT_ID, action: project().action })}
        onAction={vi.fn()}
        onManageInSillyTavern={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /Install Alpha/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Manage in SillyTavern" })).toBeVisible();
  });

  it("renders host-owned global installations as SillyTavern management actions", () => {
    const onManage = vi.fn();
    render(
      <ProjectCard
        project={project({
          installed: true,
          ownership: "external",
          action: {
            kind: "manage-in-sillytavern",
            label: "Manage in SillyTavern",
            reason: "Global extensions are managed by SillyTavern.",
          },
        })}
        onAction={vi.fn()}
        onManageInSillyTavern={onManage}
      />,
    );

    const manage = screen.getByRole("button", { name: "Manage in SillyTavern" });
    expect(screen.queryByRole("button", { name: /Uninstall Alpha/ })).not.toBeInTheDocument();
    fireEvent.click(manage);
    expect(onManage).toHaveBeenCalledOnce();
  });

  it("describes why a lifecycle action is temporarily disabled", () => {
    render(<ProjectCard project={project()} onAction={vi.fn()} lifecycleDisabled />);

    const install = screen.getByRole("button", { name: "Install Alpha" });
    const descriptionId = install.getAttribute("aria-describedby");
    expect(install).toBeDisabled();
    expect(install).toHaveAttribute("title", "Install");
    expect(descriptionId).toBeTruthy();
    expect(document.getElementById(descriptionId!)).toHaveTextContent(
      "Another Companion operation is in progress.",
    );
  });

  it("shows an always-available plus/minus Kit control for eligible projects", () => {
    const toggle = vi.fn();
    const { rerender } = render(
      <ProjectCard
        project={project()}
        onAction={vi.fn()}
        selectedForKit={false}
        onToggleKitSelection={toggle}
      />,
    );
    const add = screen.getByRole("button", { name: "Add Alpha to Kit" });
    expect(add).toHaveAttribute("aria-pressed", "false");
    expect(add.querySelector('svg[data-kit-glyph="add"]')).not.toBeNull();
    expect(add.querySelector("small")).toHaveTextContent("Kit");
    expect(
      within(document.querySelector("footer")!)
        .getAllByRole("button")
        .map((button) => button.getAttribute("aria-label")),
    ).toEqual(["Install Alpha", "Add Alpha to Kit"]);
    fireEvent.click(add);
    expect(toggle).toHaveBeenCalledWith("alpha");

    rerender(
      <ProjectCard
        project={project()}
        onAction={vi.fn()}
        selectedForKit
        onToggleKitSelection={toggle}
      />,
    );
    const remove = screen.getByRole("button", { name: "Remove Alpha from selection" });
    expect(remove).toHaveAttribute("aria-pressed", "true");
    expect(remove).toHaveAttribute("title", "Remove from selection");
    expect(remove.querySelector('svg[data-kit-glyph="remove"]')).not.toBeNull();
  });
});
