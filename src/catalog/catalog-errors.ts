export type CatalogClientErrorCode =
  "network" | "http" | "content-type" | "invalid-json" | "invalid-catalog" | "cache";

export class CatalogClientError extends Error {
  readonly code: CatalogClientErrorCode;

  constructor(code: CatalogClientErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "CatalogClientError";
    this.code = code;
  }
}
