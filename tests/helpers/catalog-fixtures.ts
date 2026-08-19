import type { CatalogProject, CatalogV7 } from "../../src/catalog/catalog-core";
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
