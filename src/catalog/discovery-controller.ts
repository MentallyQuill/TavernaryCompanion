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
import { toProjectCardViewModel, type ProjectCardViewModel } from "./project-view-model";
import type { InventorySnapshot } from "../inventory/inventory-types";

export interface DiscoveryState {
  query: CatalogQuery;
  catalogState: CatalogSnapshot["state"];
  projects: ProjectCardViewModel[];
  installedSections: InstalledSectionViewModel[];
}

export interface DiscoveryController {
  read(): DiscoveryState;
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

  setQuery(query: CatalogQuery) {
    this.#query = structuredClone(query);
    this.#state = this.#compute();
  }

  setInventory(inventory: InventorySnapshot) {
    this.#inventory = structuredClone(inventory);
    this.#state = this.#compute();
  }

  setSnapshot(snapshot: CatalogSnapshot) {
    this.#snapshot = snapshot;
    this.#state = this.#compute();
  }

  #compute(): DiscoveryState {
    const catalog = "catalog" in this.#snapshot ? this.#snapshot.catalog : null;
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
        { now: this.#now(), tagVocabulary: catalog.tagVocabulary },
        searchResults,
      ).map((project) =>
        toProjectCardViewModel(project, {
          snapshot: this.#snapshot,
          inventory: this.#inventory,
        }),
      );
    }
    return {
      query: structuredClone(this.#query),
      catalogState: this.#snapshot.state,
      projects,
      installedSections: toInstalledSectionViewModel(this.#inventory),
    };
  }
}

export function createDiscoveryController(
  options: DiscoveryControllerOptions,
): DiscoveryController {
  return new DefaultDiscoveryController(options);
}
