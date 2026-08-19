import { fireEvent, render, screen } from "@testing-library/preact";
import { afterEach, expect, it, vi } from "vitest";
import { createKitDiscoveryController } from "../../src/kits/kit-discovery-controller";
import { KitsRoute } from "../../src/ui/kits/kits-route";
import {
  catalogFixture,
  catalogKitFixture,
  catalogProjectFixture,
} from "../helpers/catalog-fixtures";

afterEach(() => document.body.replaceChildren());

it("opens on Personal Kits and exposes Tavernary filters only after switching to Published", () => {
  const catalog = catalogFixture();
  catalog.projects = [
    catalogProjectFixture({ id: "alpha" }),
    catalogProjectFixture({ id: "beta" }),
    catalogProjectFixture({ id: "gamma" }),
  ];
  catalog.kits = [catalogKitFixture()];
  const controller = createKitDiscoveryController({
    catalog,
    personal: [],
    statuses: new Map(),
  });
  render(
    <KitsRoute controller={controller} onOpenKit={() => undefined} onAction={() => undefined} />,
  );

  expect(screen.getByRole("tab", { name: /Personal/u })).toHaveAttribute("aria-selected", "true");
  expect(screen.queryByRole("button", { name: "Kit filters" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("tab", { name: /Published/u }));
  const trigger = screen.getByRole("button", { name: "Kit filters" });
  expect(
    screen.queryByText("Save, install, and switch extension collections."),
  ).not.toBeInTheDocument();
  expect(screen.getByText("1 Kit shown")).toBeVisible();
  expect(screen.getByRole("searchbox", { name: "Search Kits" })).toBeVisible();
  expect(screen.getByRole("complementary", { name: "Kit filters" })).toBeVisible();
  expect(screen.getByRole("group", { name: "Compatible frontend" })).toBeVisible();
  expect(screen.getByRole("checkbox", { name: "SillyTavern" })).toBeVisible();
  expect(screen.getByRole("group", { name: "Purpose" })).toBeVisible();
  expect(screen.getByRole("group", { name: "Model family" })).toBeVisible();
  expect(screen.getByRole("group", { name: "Includes project" })).toBeVisible();
  expect(screen.getByRole("group", { name: "Kit size" })).toBeVisible();
  expect(screen.getByRole("checkbox", { name: "All components available" })).toBeVisible();
  expect(trigger).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(trigger);
  expect(trigger).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("dialog", { name: "Kit filters" })).toBeVisible();
  fireEvent.keyDown(window, { key: "Escape" });
  expect(trigger).toHaveAttribute("aria-expanded", "false");
  expect(trigger).toHaveFocus();
});

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
  expect(screen.getByText("1 Kit shown")).toBeVisible();
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

it("deactivates the active Kit when None is selected", () => {
  const deactivate = vi.fn();
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
          operationalStatus: "Active",
          primaryAction: { kind: "deactivate", label: "Deactivate" },
        },
      ]}
      activeKitId="writer"
      onActivate={() => undefined}
      onDeactivate={deactivate}
    />,
  );

  fireEvent.change(screen.getByLabelText("Active managed Kit"), { target: { value: "" } });
  expect(deactivate).toHaveBeenCalledOnce();
});
