import type { CatalogCacheCorruption } from "./catalog-cache";

export type CatalogCacheStatus =
  | { state: "empty"; issue: null }
  | { state: "ready"; issue: null }
  | { state: "recoverable-corruption"; issue: CatalogCacheCorruption };
