import { render, screen } from "@testing-library/preact";
import { expect, it } from "vitest";
import { KitInspector } from "../../src/ui/kits/kit-inspector";

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
