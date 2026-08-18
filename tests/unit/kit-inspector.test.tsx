import { fireEvent, render, screen } from "@testing-library/preact";
import { afterEach, expect, it, vi } from "vitest";
import { KitInspector } from "../../src/ui/kits/kit-inspector";

afterEach(() => document.body.replaceChildren());

it("groups Kit components and offers copy for published Kits", () => {
  render(
    <KitInspector
      kit={{
        id: "kit",
        title: "Writer",
        description: "Tools",
        origin: "published",
        originLabel: "Published Kit",
        componentCount: 2,
        flaggedCount: 0,
        operationalStatus: "Saved",
        primaryAction: { kind: "install", label: "Install Kit" },
        editable: false,
        components: [
          {
            projectId: "alpha",
            name: "Alpha",
            group: "managed",
            available: true,
            assessment: null,
            canonicalUrl: null,
          },
          {
            projectId: "preset",
            name: "Preset",
            group: "context",
            available: true,
            assessment: null,
            canonicalUrl: null,
          },
        ],
      }}
      onAction={() => undefined}
    />,
  );
  expect(screen.getByRole("heading", { name: "Managed/actionable extensions" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Context-only projects" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Copy to Personal Kits" })).toBeVisible();
});

it("offers duplicate and safe removal for saved personal Kits", () => {
  const duplicate = vi.fn();
  const remove = vi.fn();
  render(
    <KitInspector
      kit={{
        id: "kit",
        title: "Writer",
        description: "Tools",
        origin: "personal",
        originLabel: "Personal Kit",
        componentCount: 0,
        flaggedCount: 0,
        operationalStatus: "Saved",
        primaryAction: { kind: "install", label: "Install Kit" },
        editable: true,
        components: [],
      }}
      onAction={() => undefined}
      onDuplicate={duplicate}
      onRemove={remove}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "Duplicate" }));
  fireEvent.click(screen.getByRole("button", { name: "Remove saved Kit" }));
  expect(duplicate).toHaveBeenCalledOnce();
  expect(remove).toHaveBeenCalledOnce();
});
