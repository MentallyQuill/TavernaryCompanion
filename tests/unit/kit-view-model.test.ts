import { expect, it } from "vitest";

import type { CatalogKit } from "../../src/catalog/catalog-core";
import {
  toPersonalKitCardViewModel,
  toPublishedKitCardViewModel,
  toPublishedKitInspector,
} from "../../src/kits/kit-view-model";
import type { PersonalKitV1 } from "../../src/kits/kit-types";

const kit: PersonalKitV1 = {
  formatVersion: 1,
  id: "018f6f42-7142-7a1f-9b52-9d3a7d548120",
  title: "Writer",
  description: "Writing tools",
  targetFrontend: "sillytavern",
  projectIds: ["alpha"],
  createdAt: "2026-08-18T00:00:00.000Z",
  updatedAt: "2026-08-18T00:00:00.000Z",
  origin: { kind: "local" },
};

it("maps Kit status to the primary action", () => {
  expect(toPersonalKitCardViewModel(kit, "active")).toMatchObject({
    originLabel: "Personal Kit",
    operationalStatus: "Active",
    primaryAction: { kind: "deactivate", label: "Deactivate" },
  });
  expect(toPersonalKitCardViewModel(kit, "saved").primaryAction).toEqual({
    kind: "install",
    label: "Install Kit",
  });
  expect(toPersonalKitCardViewModel(kit, "incomplete").primaryAction).toEqual({
    kind: "retry",
    label: "Retry",
  });
});

it("uses the stored full definition topology for published Kit membership changes", () => {
  const published = {
    id: "changed",
    title: "Changed",
    description: "Changed membership",
    author: { githubUserId: 1, login: "author" },
    sourceIssueNumber: 1,
    sourceIssueUrl: "https://example.com/issues/1",
    publishedAt: "2026-08-18T00:00:00.000Z",
    updatedAt: "2026-08-18T00:00:00.000Z",
    frontends: [],
    purposes: [],
    modelFamilies: [],
    components: [
      {
        projectId: "alpha",
        name: "Alpha",
        kind: "extension",
        primaryFunction: "interface-workflow",
        availability: "available",
        unavailableReason: null,
        canonicalUrl: "https://example.com/alpha",
        project: null,
      },
      {
        projectId: "beta",
        name: "Beta",
        kind: "extension",
        primaryFunction: "interface-workflow",
        availability: "available",
        unavailableReason: null,
        canonicalUrl: "https://example.com/beta",
        project: null,
      },
    ],
    supporterCount: null,
    trendingScore: null,
    supportRefreshedAt: null,
    supportStale: false,
    flaggedProjectCount: 0,
    search: {
      title: ["changed"],
      aliases: [],
      source: [],
      summary: [],
      kind: [],
      primaryFunction: [],
      tags: [],
      frontends: [],
      compatibility: [],
      maintainers: [],
      relationships: [],
    },
  } satisfies CatalogKit;
  const installed = {
    kitId: "changed",
    definitionFingerprint: "a".repeat(64),
    definitionProjectIds: ["frontend", "alpha"],
    installedProjectIds: ["alpha"],
    missingProjectIds: [],
    status: "installed" as const,
    installedAt: "2026-08-18T00:00:00.000Z",
    lastVerifiedAt: "2026-08-18T00:00:00.000Z",
  };

  expect(
    toPublishedKitInspector(published, "changedOnTavernary", installed).topologyChange,
  ).toEqual({
    kind: "exact",
    previousProjectIds: ["frontend", "alpha"],
    currentProjectIds: ["alpha", "beta"],
    addedProjectIds: ["beta"],
    removedProjectIds: ["frontend"],
  });
});

it("does not invent an exact membership diff for unknown legacy topology", () => {
  const published = {
    id: "changed",
    title: "Changed",
    description: "Changed membership",
    author: { githubUserId: 1, login: "author" },
    sourceIssueNumber: 1,
    sourceIssueUrl: "https://example.com/issues/1",
    publishedAt: "2026-08-18T00:00:00.000Z",
    updatedAt: "2026-08-18T00:00:00.000Z",
    frontends: [],
    purposes: [],
    modelFamilies: [],
    components: [],
    supporterCount: null,
    trendingScore: null,
    supportRefreshedAt: null,
    supportStale: false,
    flaggedProjectCount: 0,
    search: {
      title: ["changed"],
      aliases: [],
      source: [],
      summary: [],
      kind: [],
      primaryFunction: [],
      tags: [],
      frontends: [],
      compatibility: [],
      maintainers: [],
      relationships: [],
    },
  } satisfies CatalogKit;
  const installed = {
    kitId: "changed",
    definitionFingerprint: "a".repeat(64),
    definitionProjectIds: null,
    installedProjectIds: ["alpha"],
    missingProjectIds: [],
    status: "installed" as const,
    installedAt: "2026-08-18T00:00:00.000Z",
    lastVerifiedAt: "2026-08-18T00:00:00.000Z",
  };

  expect(
    toPublishedKitInspector(published, "changedOnTavernary", installed).topologyChange,
  ).toEqual({ kind: "unknown", currentProjectIds: [] });
});

it("keeps an unavailable-only published Kit browse-only", () => {
  const published = {
    id: "unavailable",
    title: "Unavailable",
    description: "No current projects",
    author: { githubUserId: 1, login: "author" },
    sourceIssueNumber: 1,
    sourceIssueUrl: "https://example.com/issues/1",
    publishedAt: "2026-08-18T00:00:00.000Z",
    updatedAt: "2026-08-18T00:00:00.000Z",
    frontends: [],
    purposes: [],
    modelFamilies: [],
    components: [
      {
        projectId: "missing",
        name: "Missing",
        kind: "extension",
        primaryFunction: "interface-workflow",
        availability: "flagged",
        unavailableReason: "withdrawn",
        canonicalUrl: null,
        project: null,
      },
    ],
    supporterCount: null,
    trendingScore: null,
    supportRefreshedAt: null,
    supportStale: false,
    flaggedProjectCount: 1,
    search: {
      title: ["unavailable"],
      aliases: [],
      source: [],
      summary: [],
      kind: [],
      primaryFunction: [],
      tags: [],
      frontends: [],
      compatibility: [],
      maintainers: [],
      relationships: [],
    },
  } satisfies CatalogKit;

  expect(toPublishedKitCardViewModel(published, "saved").primaryAction).toEqual({
    kind: "view",
    label: "View Kit",
  });
});
