import { createDefaultProfileState, type ProfileStateV1 } from "./profile-state";

export class UnsupportedProfileStateError extends Error {
  readonly formatVersion: number;

  constructor(formatVersion: number) {
    super(`Profile state format ${formatVersion} is newer than this Companion supports.`);
    this.name = "UnsupportedProfileStateError";
    this.formatVersion = formatVersion;
  }
}

export function migrateProfileState(value: unknown): ProfileStateV1 {
  if (!isRecord(value)) {
    return createDefaultProfileState();
  }

  if (Number.isInteger(value.formatVersion) && Number(value.formatVersion) > 1) {
    throw new UnsupportedProfileStateError(Number(value.formatVersion));
  }

  if (value.formatVersion !== 1) {
    return createDefaultProfileState();
  }

  const defaults = createDefaultProfileState();
  const preferences = isRecord(value.preferences) ? value.preferences : {};

  return {
    formatVersion: 1,
    trustAcknowledgedAt:
      typeof value.trustAcknowledgedAt === "string" ? value.trustAcknowledgedAt : null,
    preferences: {
      route:
        preferences.route === "kits" || preferences.route === "installed"
          ? preferences.route
          : defaults.preferences.route,
      density: preferences.density === "compact" ? "compact" : defaults.preferences.density,
    },
    managedExtensions: cloneRecord(value.managedExtensions),
    personalKits: cloneRecord(value.personalKits),
    installedKits: cloneRecord(value.installedKits),
    activeKitId: typeof value.activeKitId === "string" ? value.activeKitId : null,
    operationReceipt: cloneNullableRecord(value.operationReceipt),
  };
}

function cloneRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    return {};
  }
  try {
    return structuredClone(value);
  } catch {
    return {};
  }
}

function cloneNullableRecord(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) {
    return null;
  }
  try {
    return structuredClone(value);
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
