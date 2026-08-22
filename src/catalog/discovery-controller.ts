import type { CatalogSnapshot } from "./catalog-client";
import {
  createCatalogSearchIndex,
  DEFAULT_COMPANION_QUERY,
  selectProjects,
  type CatalogQuery,
  type CatalogSearchDocument,
  type CatalogSearchIndex,
  type Catalog,
} from "./catalog-core";
import {
  toInstalledSectionViewModel,
  type InstalledSectionViewModel,
} from "./installed-view-model";
import { toProjectCardViewModel, type ProjectCardViewModel } from "./project-view-model";
import type { InventorySnapshot } from "../inventory/inventory-types";

export interface DiscoveryState {
  query: CatalogQuery;
  catalogState: CatalogSnapshot["state"];
  projects: ProjectCardViewModel[];
  installedSections: InstalledSectionViewModel[];
  facets?: {
    frontends: DiscoveryFacet[];
    tags: DiscoveryTagFacet[];
    modelFamilies: DiscoveryFacet[];
    completionFormats: DiscoveryFacet[];
    kinds: DiscoveryFacet[];
    development: DiscoveryFacet[];
    licenses: DiscoveryFacet[];
  };
}

export interface DiscoveryFacet {
  id: string;
  label: string;
  count: number;
}

export interface DiscoveryTagFacet extends DiscoveryFacet {
  description: string;
  facet: "goal" | "trait";
}

export interface DiscoveryController {
  read(): DiscoveryState;
  subscribe(subscriber: (state: DiscoveryState) => void): () => void;
  setQuery(query: CatalogQuery): void;
  setInventory(inventory: InventorySnapshot): void;
  setSnapshot(snapshot: CatalogSnapshot): void;
}

interface DiscoveryControllerOptions {
  snapshot: CatalogSnapshot;
  inventory: InventorySnapshot;
  now?: () => string;
  createIndex?: (documents: CatalogSearchDocument[]) => CatalogSearchIndex;
}

class DefaultDiscoveryController implements DiscoveryController {
  readonly #now: () => string;
  readonly #createIndex: (documents: CatalogSearchDocument[]) => CatalogSearchIndex;
  #snapshot: CatalogSnapshot;
  #inventory: InventorySnapshot;
  #query = structuredClone(DEFAULT_COMPANION_QUERY);
  #indexedCatalog: Catalog | null = null;
  #index: CatalogSearchIndex | null = null;
  #state: DiscoveryState;
  readonly #subscribers = new Set<(state: DiscoveryState) => void>();

  constructor(options: DiscoveryControllerOptions) {
    this.#snapshot = options.snapshot;
    this.#inventory = structuredClone(options.inventory);
    this.#now = options.now ?? (() => new Date().toISOString());
    this.#createIndex = options.createIndex ?? createCatalogSearchIndex;
    this.#state = this.#compute();
  }

  read(): DiscoveryState {
    return structuredClone(this.#state);
  }

  subscribe(subscriber: (state: DiscoveryState) => void): () => void {
    this.#subscribers.add(subscriber);
    return () => this.#subscribers.delete(subscriber);
  }

  setQuery(query: CatalogQuery) {
    this.#query = structuredClone(query);
    this.#state = this.#compute();
    this.#notify();
  }

  setInventory(inventory: InventorySnapshot) {
    this.#inventory = structuredClone(inventory);
    this.#state = this.#compute();
    this.#notify();
  }

  setSnapshot(snapshot: CatalogSnapshot) {
    this.#snapshot = snapshot;
    this.#state = this.#compute();
    this.#notify();
  }

  #compute(): DiscoveryState {
    const catalog = "catalog" in this.#snapshot ? this.#snapshot.catalog : null;
    const now = catalog ? this.#now() : "";
    let projects: ProjectCardViewModel[] = [];
    if (catalog) {
      if (catalog !== this.#indexedCatalog) {
        this.#indexedCatalog = catalog;
        this.#index = this.#createIndex(
          catalog.projects.map(({ id, search }) => ({ id, ...search })),
        );
      }
      const searchResults = this.#index?.search(this.#query.search);
      projects = selectProjects(
        [...catalog.projects],
        this.#query,
        { now, tagVocabulary: catalog.tagVocabulary },
        searchResults,
      ).map((project) =>
        toProjectCardViewModel(project, {
          snapshot: this.#snapshot,
          inventory: this.#inventory,
          now,
        }),
      );
    }
    return {
      query: structuredClone(this.#query),
      catalogState: this.#snapshot.state,
      projects,
      installedSections: toInstalledSectionViewModel(this.#inventory),
      facets: catalog
        ? {
            frontends: orderFrontendOptionsByPopularity(
              countedLabels(catalog.projects.map(({ frontends }) => frontends)),
              catalog.projects,
            ),
            tags: catalog.tagVocabulary
              .map(({ id, label, description, facet }) => ({
                id,
                label,
                description,
                facet,
                count: catalog.projects.filter((project) =>
                  project.tags.some((tag) => tag.id === id),
                ).length,
              }))
              .sort((left, right) => left.label.localeCompare(right.label)),
            modelFamilies: countedLabels(
              catalog.projects.map(({ preset }) => preset?.modelFamilies ?? []),
            ),
            completionFormats: countedLabels(
              catalog.projects.map(({ preset }) => preset?.completionFormats ?? []),
            ),
            kinds: [
              { id: "frontend", label: "Frontend" },
              { id: "extension", label: "Extension" },
              { id: "preset", label: "System Preset" },
            ].map((option) => ({
              ...option,
              count: catalog.projects.filter((project) => project.kind === option.id).length,
            })),
            development: [
              {
                id: "active-month",
                label: "Active this month",
                count: catalog.projects.filter((project) =>
                  isWithinDays(project.activity.latestSourceActivityAt, now, 30),
                ).length,
              },
              {
                id: "new-release",
                label: "Recently released",
                count: catalog.projects.filter((project) =>
                  isWithinDays(
                    project.latestReleaseAt ?? project.preset?.publishedAt ?? null,
                    now,
                    30,
                  ),
                ).length,
              },
              {
                id: "dormant",
                label: "Dormant",
                count: catalog.projects.filter((project) => project.activity.dormant).length,
              },
            ],
            licenses: [
              { id: "open-source", label: "Open source", status: "osi-approved" },
              { id: "proprietary", label: "Proprietary", status: "proprietary" },
              { id: "pending", label: "Pending verification", status: "pending" },
              { id: "missing", label: "Missing license", status: "missing" },
            ].map(({ status, ...option }) => ({
              ...option,
              count: catalog.projects.filter((project) => project.license.status === status).length,
            })),
          }
        : {
            frontends: [],
            tags: [],
            modelFamilies: [],
            completionFormats: [],
            kinds: [],
            development: [],
            licenses: [],
          },
    };
  }

  #notify(): void {
    const snapshot = this.read();
    for (const subscriber of this.#subscribers) subscriber(snapshot);
  }
}

function isWithinDays(timestamp: string | null, now: string, days: number): boolean {
  if (!timestamp) return false;
  const age = Date.parse(now) - Date.parse(timestamp);
  return Number.isFinite(age) && age >= 0 && age <= days * 24 * 60 * 60 * 1_000;
}

function countedLabels(
  projectLabels: ReadonlyArray<ReadonlyArray<{ id: string; label: string }>>,
): DiscoveryFacet[] {
  const options = new Map<string, DiscoveryFacet>();
  for (const labels of projectLabels) {
    const seen = new Set<string>();
    for (const { id, label } of labels) {
      if (seen.has(id)) continue;
      seen.add(id);
      const current = options.get(id);
      options.set(id, { id, label, count: (current?.count ?? 0) + 1 });
    }
  }
  return [...options.values()].sort((left, right) => left.label.localeCompare(right.label));
}

function orderFrontendOptionsByPopularity<T extends DiscoveryFacet>(
  options: readonly T[],
  projects: readonly Catalog["projects"][number][],
): T[] {
  const scores = new Map<string, number>();
  for (const project of projects) {
    if (project.kind !== "frontend" || project.community === null) continue;
    for (const frontend of project.frontends) {
      const current = scores.get(frontend.id);
      if (current === undefined || project.community.aggregate > current) {
        scores.set(frontend.id, project.community.aggregate);
      }
    }
  }

  return [...options].sort((left, right) => {
    const leftScore = scores.get(left.id);
    const rightScore = scores.get(right.id);
    if (leftScore !== undefined && rightScore !== undefined) {
      const scoreOrder = rightScore - leftScore;
      if (scoreOrder !== 0) return scoreOrder;
    } else if (leftScore !== undefined) {
      return -1;
    } else if (rightScore !== undefined) {
      return 1;
    }
    return left.label.localeCompare(right.label) || left.id.localeCompare(right.id);
  });
}

export function createDiscoveryController(
  options: DiscoveryControllerOptions,
): DiscoveryController {
  return new DefaultDiscoveryController(options);
}
