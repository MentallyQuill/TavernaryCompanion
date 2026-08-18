import { fireEvent, render, screen, waitFor } from "@testing-library/preact";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CatalogSnapshot } from "../../src/catalog/catalog-client";
import { CatalogFreshness } from "../../src/ui/catalog/catalog-freshness";
import { CatalogStatePanel } from "../../src/ui/catalog/catalog-state-panel";
import { catalogFixture } from "../helpers/catalog-fixtures";

afterEach(() => document.body.replaceChildren());

const catalog = catalogFixture("2026-08-18T10:00:00.000Z");
const cases: Array<[CatalogSnapshot, string]> = [
  [
    { state: "ready-current", canMutate: true, checkedAt: "2026-08-18T10:00:00.000Z", catalog },
    "Updated 2 hours ago",
  ],
  [
    { state: "ready-stale", canMutate: true, checkedAt: null, catalog },
    "Saved catalog may be outdated",
  ],
  [
    {
      state: "ready-offline",
      canMutate: true,
      checkedAt: "2026-08-18T10:00:00.000Z",
      catalog,
      error: "offline",
    },
    "Using saved catalog — offline",
  ],
  [
    {
      state: "incompatible-with-cache",
      canMutate: false,
      checkedAt: "2026-08-18T10:00:00.000Z",
      catalog,
      remoteSchemaVersion: 8,
    },
    "Companion update required",
  ],
  [{ state: "empty-loading", canMutate: false, checkedAt: null }, "Checking for updates"],
];

describe("catalog status UI", () => {
  it.each(cases)("renders the snapshot copy for $1", (snapshot, expected) => {
    render(
      <CatalogFreshness
        snapshot={snapshot}
        now="2026-08-18T12:00:00.000Z"
        refreshing={snapshot.state === "empty-loading"}
      />,
    );
    expect(screen.getByText(expected)).toBeVisible();
  });

  it("offers schema recovery choices while lifecycle actions stay disabled", () => {
    const snapshot = cases[3][0];
    render(
      <CatalogStatePanel
        snapshot={snapshot}
        onRefresh={vi.fn()}
        onUpdateCompanion={vi.fn()}
        onUseCached={vi.fn()}
        onOpenTavernary={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Update Companion" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Use cached catalog" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Open Tavernary" })).toBeVisible();
    expect(screen.getByTestId("catalog-state-panel")).toHaveAttribute(
      "data-lifecycle-disabled",
      "true",
    );
  });

  it("preserves results during refresh and announces a current catalog", async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    render(
      <CatalogStatePanel
        snapshot={cases[0][0]}
        onRefresh={refresh}
        onUpdateCompanion={vi.fn()}
        onUseCached={vi.fn()}
        onOpenTavernary={vi.fn()}
      >
        <p>Existing results</p>
      </CatalogStatePanel>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Refresh catalog" }));
    expect(screen.getByText("Existing results")).toBeVisible();
    await waitFor(() => expect(screen.getByText("Catalog is current")).toBeVisible());
  });

  it("shows a retryable no-cache error without leaking detailed payloads", () => {
    render(
      <CatalogStatePanel
        snapshot={{ state: "error-empty", canMutate: false, checkedAt: null, error: "offline" }}
        onRefresh={vi.fn()}
        onUpdateCompanion={vi.fn()}
        onUseCached={vi.fn()}
        onOpenTavernary={vi.fn()}
      />,
    );
    expect(screen.getByRole("heading", { name: "Catalog unavailable" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Try again" })).toBeVisible();
    expect(screen.getByText("Error details")).toBeVisible();
  });
});
