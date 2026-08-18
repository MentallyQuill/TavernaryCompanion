import { fireEvent, render, screen } from "@testing-library/preact";
import { afterEach, describe, expect, it, vi } from "vitest";

import { toProjectDetailViewModel } from "../../src/catalog/project-view-model";
import { ProjectDetail } from "../../src/ui/projects/project-detail";
import { catalogProjectFixture } from "../helpers/catalog-fixtures";

afterEach(() => document.body.replaceChildren());

describe("ProjectDetail", () => {
  it("renders complete project evidence and external destinations", () => {
    const source = catalogProjectFixture({ id: "alpha" });
    source.name = "Alpha";
    source.tags = [
      {
        id: "memory",
        label: "Memory",
        description: "Memory tools",
        facet: "goal",
      },
    ];
    const project = toProjectDetailViewModel(source, {
      snapshot: {
        state: "ready-current",
        canMutate: true,
        checkedAt: null,
        catalog: {
          schemaVersion: 7,
          generatedAt: source.refreshedAt!,
          projects: [source],
          kits: [],
          tagVocabulary: [],
        },
      },
      inventory: { managed: [], external: [], unknown: [], missingManaged: [] },
    });
    const onAction = vi.fn();
    render(<ProjectDetail project={project} onAction={onAction} />);

    expect(screen.getByRole("heading", { name: "Alpha" })).toBeVisible();
    expect(screen.getByText("TavernKeeper assessment")).toBeVisible();
    expect(screen.getByText("Memory")).toBeVisible();
    expect(screen.getByRole("link", { name: /Open project source/ })).toHaveAttribute(
      "target",
      "_blank",
    );

    fireEvent.click(screen.getByRole("button", { name: "Install Alpha" }));
    expect(onAction).toHaveBeenCalledWith(project.action);
  });
});
