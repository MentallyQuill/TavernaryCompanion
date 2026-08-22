import { DEFAULT_QUERY, type CatalogQuery } from "@tavernary/catalog-core";

export * from "@tavernary/catalog-core";

export const SUPPORTED_CATALOG_SCHEMA = 8 as const;

export const DEFAULT_COMPANION_QUERY: CatalogQuery = {
  ...DEFAULT_QUERY,
  frontends: ["sillytavern"],
  kinds: ["extension", "preset"],
  tags: [],
  modelFamilies: [],
  completionFormats: [],
  development: [],
  licenses: [],
  kits: {
    ...DEFAULT_QUERY.kits,
    frontends: [],
    purposes: [],
    modelFamilies: [],
  },
};
