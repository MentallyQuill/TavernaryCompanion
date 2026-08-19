import type { CatalogSnapshot } from "./catalog-client";
import {
  createCatalogSearchIndex,
  DEFAULT_COMPANION_QUERY,
  selectProjects,
  type CatalogQuery,
  type CatalogSearchDocument,
  type CatalogSearchIndex,
  type CatalogV7,
} from "./catalog-core";
import {
  toInstalledSectionViewModel,
  type InstalledSectionViewModel,
} from "./installed-view-model";
import {
  toProjectCardViewModel,
  toProjectDetailViewModel,
  type ProjectCardViewModel,
  type ProjectDetailViewModel,
} from "./project-view-model";
import type { InventorySnapshot } from "../inventory/inventory-types";

export interface DiscoveryState {
  query: CatalogQuery;
  catalogState: CatalogSnapshot["state"];
  projects: ProjectCardViewModel[];
  projectDetails: Record<string, ProjectDetailViewModel>;
  installedSections: InstalledSectionViewModel[];
  facets?: {
    frontends: Array<{ id: string; label: string }>;
    tags: Array<{ id: string; label: string }>;
  };
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
  #indexedCatalog: CatalogV7 | null = null;
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
    let projects: ProjectCardViewModel[] = [];
    let projectDetails: Record<string, ProjectDetailViewModel> = {};
    if (catalog) {
      const now = this.#now();
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
      projectDetails = Object.fromEntries(
        catalog.projects.map((project) => [
          project.id,
          toProjectDetailViewModel(project, {
            snapshot: this.#snapshot,
            inventory: this.#inventory,
            now,
            kits: catalog.kits,
          }),
        ]),
      );
    }
    return {
      query: structuredClone(this.#query),
      catalogState: this.#snapshot.state,
      projects,
      projectDetails,
      installedSections: toInstalledSectionViewModel(this.#inventory),
      facets: catalog
        ? {
            frontends: [
              ...new Map(
                catalog.projects.flatMap((project) =>
                  project.frontends.map(({ id, label }) => [id, { id, label }] as const),
                ),
              ).values(),
            ].sort((left, right) => left.label.localeCompare(right.label)),
            tags: catalog.tagVocabulary
              .map(({ id, label }) => ({ id, label }))
              .sort((left, right) => left.label.localeCompare(right.label)),
          }
        : { frontends: [], tags: [] },
    };
  }

  #notify(): void {
    const snapshot = this.read();
    for (const subscriber of this.#subscribers) subscriber(snapshot);
  }
}

export function createDiscoveryController(
  options: DiscoveryControllerOptions,
): DiscoveryController {
  return new DefaultDiscoveryController(options);
}
