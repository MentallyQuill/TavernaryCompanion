import {
  countKitsForFilter,
  DEFAULT_KIT_QUERY,
  selectKits,
  type Catalog,
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
  facets: KitDiscoveryFacets;
  visible: KitCardViewModel[];
}

export interface KitDiscoveryFacet {
  id: string;
  label: string;
  count: number;
}

export interface KitDiscoveryFacets {
  frontends: KitDiscoveryFacet[];
  purposes: KitDiscoveryFacet[];
  modelFamilies: KitDiscoveryFacet[];
  projects: KitDiscoveryFacet[];
  availableCount: number;
}

export class KitDiscoveryController {
  readonly #listeners = new Set<(state: KitDiscoveryState) => void>();
  #catalog: Catalog;
  #personal: PersonalKitV1[];
  #statuses: ReadonlyMap<string, ReconciledKitStatus>;
  #segment: KitDiscoveryState["segment"] = "personal";
  #search = "";
  #query: KitQuery = structuredClone(DEFAULT_KIT_QUERY);
  constructor(input: {
    catalog: Catalog;
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
      facets: this.#facets(),
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
    catalog: Catalog;
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

  #facets(): KitDiscoveryFacets {
    const frontendLabels = new Map<string, string>();
    const purposeLabels = new Map<string, string>();
    const modelFamilyLabels = new Map<string, string>();
    for (const project of this.#catalog.projects) {
      for (const frontend of project.frontends) frontendLabels.set(frontend.id, frontend.label);
      for (const family of project.preset?.modelFamilies ?? []) {
        modelFamilyLabels.set(family.id, family.label);
      }
    }
    for (const kit of this.#catalog.kits) {
      for (const frontend of kit.frontends) frontendLabels.set(frontend.id, frontend.label);
      for (const purpose of kit.purposes) purposeLabels.set(purpose.id, purpose.label);
      for (const family of kit.modelFamilies ?? []) {
        modelFamilyLabels.set(family.id, family.label);
      }
    }
    const counted = (
      labels: ReadonlyMap<string, string>,
      group: "frontends" | "purposes" | "modelFamilies",
    ) =>
      [...labels]
        .map(([id, label]) => ({
          id,
          label,
          count: countKitsForFilter(this.#catalog.kits, this.#query, group, id, this.#search),
        }))
        .sort((left, right) => left.label.localeCompare(right.label));
    return {
      frontends: counted(frontendLabels, "frontends"),
      purposes: counted(purposeLabels, "purposes"),
      modelFamilies: counted(modelFamilyLabels, "modelFamilies"),
      projects: this.#catalog.projects
        .map((project) => ({
          id: project.id,
          label: project.name,
          count: selectKits(
            this.#catalog.kits,
            { ...this.#query, includesProjectId: project.id },
            this.#search,
          ).length,
        }))
        .sort((left, right) => left.label.localeCompare(right.label)),
      availableCount: selectKits(
        this.#catalog.kits,
        { ...this.#query, allComponentsAvailable: true },
        this.#search,
      ).length,
    };
  }
}

export function createKitDiscoveryController(
  input: ConstructorParameters<typeof KitDiscoveryController>[0],
): KitDiscoveryController {
  return new KitDiscoveryController(input);
}
