import { fireEvent, render, screen } from "@testing-library/preact";
import { afterEach, expect, it, vi } from "vitest";
import { createKitDiscoveryController } from "../../src/kits/kit-discovery-controller";
import { KitsRoute } from "../../src/ui/kits/kits-route";
import { catalogFixture } from "../helpers/catalog-fixtures";

afterEach(() => document.body.replaceChildren());

it("switches between published and personal Kit segments", () => {
  const controller = createKitDiscoveryController({
    catalog: catalogFixture(),
    personal: [
      {
        formatVersion: 1,
        id: "018f6f42-7142-7a1f-9b52-9d3a7d548120",
        title: "Writer",
        description: "",
        targetFrontend: "sillytavern",
        projectIds: [],
        createdAt: "2026-08-18T00:00:00.000Z",
        updatedAt: "2026-08-18T00:00:00.000Z",
        origin: { kind: "local" },
      },
    ],
    statuses: new Map(),
  });
  render(
    <KitsRoute controller={controller} onOpenKit={() => undefined} onAction={() => undefined} />,
  );
  fireEvent.click(screen.getByRole("tab", { name: /Personal/u }));
  expect(screen.getByRole("heading", { name: "Writer" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Install Kit" })).toBeVisible();
});

it("activates an installed Kit from the fast switcher", () => {
  const activate = vi.fn();
  const controller = createKitDiscoveryController({
    catalog: catalogFixture(),
    personal: [],
    statuses: new Map(),
  });
  render(
    <KitsRoute
      controller={controller}
      onOpenKit={() => undefined}
      onAction={() => undefined}
      switcherKits={[
        {
          id: "writer",
          title: "Writer",
          description: "",
          origin: "personal",
          originLabel: "Personal Kit",
          componentCount: 1,
          flaggedCount: 0,
          operationalStatus: "Installed",
          primaryAction: { kind: "activate", label: "Activate" },
        },
      ]}
      activeKitId={null}
      onActivate={activate}
    />,
  );

  fireEvent.change(screen.getByLabelText("Active managed Kit"), {
    target: { value: "writer" },
  });
  expect(activate).toHaveBeenCalledWith("writer");
});
