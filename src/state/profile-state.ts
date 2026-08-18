export interface ProfilePreferencesV1 {
  route: "projects" | "kits";
  density: "standard" | "compact";
}

export interface ProfileStateV1 {
  formatVersion: 1;
  trustAcknowledgedAt: string | null;
  preferences: ProfilePreferencesV1;
  managedExtensions: Record<string, unknown>;
  personalKits: Record<string, unknown>;
  installedKits: Record<string, unknown>;
  activeKitId: string | null;
  operationReceipt: Record<string, unknown> | null;
}

export function createDefaultProfileState(): ProfileStateV1 {
  return {
    formatVersion: 1,
    trustAcknowledgedAt: null,
    preferences: { route: "projects", density: "standard" },
    managedExtensions: {},
    personalKits: {},
    installedKits: {},
    activeKitId: null,
    operationReceipt: null,
  };
}
