import {
  DEFAULT_KIT_QUERY,
  selectKits,
  type CatalogV7,
  type KitQuery,
} from "../catalog/catalog-core";
import type { ReconciledKitStatus } from "./kit-reconciler";
import type { PersonalKitV1 } from "./kit-types";
import {
  toPersonalKitCardViewModel,
  toPublishedKitCardViewModel,
  type KitCardViewModel,
} from "./kit-view-model";

export interface KitDiscoveryState {
  segment: "published" | "personal";
  search: string;
  query: KitQuery;
  publishedCount: number;
  personalCount: number;
  visible: KitCardViewModel[];
}

export class KitDiscoveryController {
  readonly #listeners = new Set<(state: KitDiscoveryState) => void>();
  #catalog: CatalogV7;
  #personal: PersonalKitV1[];
  #statuses: ReadonlyMap<string, ReconciledKitStatus>;
  #segment: KitDiscoveryState["segment"] = "published";
  #search = "";
  #query: KitQuery = structuredClone(DEFAULT_KIT_QUERY);
  constructor(input: {
    catalog: CatalogV7;
    personal: PersonalKitV1[];
    statuses: ReadonlyMap<string, ReconciledKitStatus>;
  }) {
    this.#catalog = input.catalog;
    this.#personal = structuredClone(input.personal);
    this.#statuses = input.statuses;
  }
  read(): KitDiscoveryState {
    const published = selectKits(this.#catalog.kits, this.#query, this.#search).map((kit) =>
      toPublishedKitCardViewModel(kit, this.#statuses.get(kit.id) ?? "saved"),
    );
    const meaning = this.#search.trim().toLocaleLowerCase("en-US");
    const personal = this.#personal
      .filter(
        (kit) =>
          !meaning ||
          `${kit.title} ${kit.description} ${kit.projectIds.join(" ")}`
            .toLocaleLowerCase("en-US")
            .includes(meaning),
      )
      .map((kit) => toPersonalKitCardViewModel(kit, this.#statuses.get(kit.id) ?? "saved"));
    return {
      segment: this.#segment,
      search: this.#search,
      query: structuredClone(this.#query),
      publishedCount: this.#catalog.kits.length,
      personalCount: this.#personal.length,
      visible: structuredClone(this.#segment === "published" ? published : personal),
    };
  }
  subscribe(listener: (state: KitDiscoveryState) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }
  setSegment(segment: KitDiscoveryState["segment"]): void {
    this.#segment = segment;
    this.#emit();
  }
  setSearch(search: string): void {
    this.#search = search;
    this.#emit();
  }
  setQuery(query: KitQuery): void {
    this.#query = structuredClone(query);
    this.#emit();
  }
  setData(input: {
    catalog: CatalogV7;
    personal: PersonalKitV1[];
    statuses: ReadonlyMap<string, ReconciledKitStatus>;
  }): void {
    this.#catalog = input.catalog;
    this.#personal = structuredClone(input.personal);
    this.#statuses = input.statuses;
    this.#emit();
  }
  #emit(): void {
    const state = this.read();
    for (const listener of this.#listeners) listener(state);
  }
}

export function createKitDiscoveryController(
  input: ConstructorParameters<typeof KitDiscoveryController>[0],
): KitDiscoveryController {
  return new KitDiscoveryController(input);
}
