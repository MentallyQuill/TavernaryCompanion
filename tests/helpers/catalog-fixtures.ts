import type { CatalogKit, CatalogProject, CatalogV7 } from "../../src/catalog/catalog-core";
import type { CatalogCacheRecord } from "../../src/catalog/catalog-cache";

export function catalogFixture(generatedAt = "2026-08-18T00:00:00.000Z"): CatalogV7 {
  return {
    schemaVersion: 7,
    generatedAt,
    tagVocabulary: [],
    projects: [],
    kits: [],
  };
}

export function catalogBody(schemaVersion = 7): string {
  return JSON.stringify({
    ...catalogFixture(),
    schemaVersion,
  });
}

export function cachedCatalogRecord(
  overrides: Partial<CatalogCacheRecord> = {},
): CatalogCacheRecord {
  return {
    id: "cached",
    schemaVersion: 7,
    generatedAt: "2026-08-18T00:00:00.000Z",
    etag: '"cached"',
    fetchedAt: "2026-08-18T00:05:00.000Z",
    bodySha256: "7f11a8ac09212a0fbaa34c667d9778e76dc03799855499f131f424eefcbf72ec",
    body: catalogBody(),
    ...overrides,
  };
}

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

export function catalogProjectFixture({
  id = "alpha",
  folderName = "Alpha",
  kind = "extension",
  frontend = "sillytavern",
}: {
  id?: string;
  folderName?: string | null;
  kind?: "frontend" | "extension" | "preset";
  frontend?: string;
} = {}): CatalogProject {
  const search = {
    title: [id],
    aliases: [],
    source: [],
    summary: [id],
    kind: [kind],
    primaryFunction: ["interface-workflow"],
    tags: [],
    frontends: [frontend],
    compatibility: [],
    maintainers: [],
    relationships: [],
  };
  return {
    id,
    name: id,
    kind,
    metadataStatus: "curated",
    sourceStatus: "healthy",
    primaryFunction: "interface-workflow",
    summary: id,
    canonicalUrl: `https://example.com/${id}`,
    catalogedAt: "2026-01-01T00:00:00.000Z",
    catalogCohort: "standard",
    frontends: [{ id: frontend, label: frontend, description: frontend }],
    tags: [],
    search,
    tavernKeeper: null,
    fork: null,
    attribution: null,
    activity: {
      latestSourceActivityAt: "2026-08-18T00:00:00.000Z",
      activeWeeks12: 1,
      weeklyActivity: null,
      evidenceStatus: "complete",
      dormant: false,
    },
    latestReleaseAt: null,
    community: null,
    repositorySizeKb: null,
    license: { status: "osi-approved", label: "MIT", tooltip: "MIT" },
    preset: null,
    refreshedAt: "2026-08-18T00:00:00.000Z",
    staleSince: null,
    install:
      folderName === null
        ? null
        : {
            kind: "sillytavern-extension-git",
            repositoryUrl: `https://github.com/example/${folderName}.git`,
            branch: null,
            manifestPath: "manifest.json",
            folderName,
          },
  };
}

export function catalogKitFixture({
  id = "published-writer-kit",
  title = "Published Writer Kit",
  projectIds = ["alpha", "beta", "gamma"],
}: {
  id?: string;
  title?: string;
  projectIds?: string[];
} = {}): CatalogKit {
  return {
    id,
    title,
    description: "A published writing setup.",
    author: { githubUserId: 1, login: "author" },
    sourceIssueNumber: 1,
    sourceIssueUrl: "https://example.com/issues/1",
    publishedAt: "2026-08-18T00:00:00.000Z",
    updatedAt: "2026-08-18T00:00:00.000Z",
    frontends: [{ id: "sillytavern", label: "SillyTavern", description: "SillyTavern" }],
    purposes: [
      { id: "generation-reasoning", label: "Generation & Reasoning", description: "Writing" },
    ],
    modelFamilies: [{ id: "claude", label: "Claude", description: "Claude" }],
    components: projectIds.map((projectId) => ({
      projectId,
      name: projectId,
      kind: "extension",
      primaryFunction: "generation-reasoning",
      availability: "available",
      unavailableReason: null,
      canonicalUrl: `https://example.com/${projectId}`,
      project: null,
    })),
    supporterCount: 4,
    trendingScore: 4,
    supportRefreshedAt: "2026-08-18T00:00:00.000Z",
    supportStale: false,
    flaggedProjectCount: 0,
    search: {
      title: [title],
      aliases: [],
      source: [],
      summary: ["writing"],
      kind: [],
      primaryFunction: ["generation-reasoning"],
      tags: [],
      frontends: ["sillytavern"],
      compatibility: [],
      maintainers: ["author"],
      relationships: projectIds,
    },
  };
}
