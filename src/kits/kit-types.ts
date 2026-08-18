export type KitOriginV1 =
  | { kind: "local" }
  | { kind: "published-copy"; tavernaryKitId: string }
  | { kind: "imported"; sourceId: string };

export interface PersonalKitV1 {
  formatVersion: 1;
  id: string;
  title: string;
  description: string;
  targetFrontend: "sillytavern";
  projectIds: string[];
  createdAt: string;
  updatedAt: string;
  origin: KitOriginV1;
}

export interface InstalledKitStateV1 {
  kitId: string;
  definitionFingerprint: string;
  installedProjectIds: string[];
  missingProjectIds: string[];
  status: "installed" | "incomplete" | "drifted";
  installedAt: string;
  lastVerifiedAt: string;
}

export interface CreatePersonalKitInput {
  title: string;
  description?: string;
  projectIds: string[];
  origin?: KitOriginV1;
}
