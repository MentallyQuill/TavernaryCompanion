import { COMPANION_PROJECT_ID } from "../lifecycle/self-protection";
import type { InstalledKitStateV1, KitOriginV1, PersonalKitV1 } from "./kit-types";

const KIT_KEYS = [
  "formatVersion",
  "id",
  "title",
  "description",
  "targetFrontend",
  "projectIds",
  "createdAt",
  "updatedAt",
  "origin",
] as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const SHA256 = /^[0-9a-f]{64}$/u;

export function parsePersonalKit(value: unknown): PersonalKitV1 {
  const input = record(value, "Kit must be an object.");
  exactKeys(input, KIT_KEYS, "Kit");
  if (input.formatVersion !== 1) throw new Error("Unsupported Kit format version.");
  if (typeof input.id !== "string" || !UUID.test(input.id)) throw new Error("Invalid Kit ID.");
  const title = text(input.title, "title").trim();
  if (!title) throw new Error("Kit title is required.");
  const description = text(input.description, "description").trim();
  if (input.targetFrontend !== "sillytavern") throw new Error("Kit must target SillyTavern.");
  if (!Array.isArray(input.projectIds)) throw new Error("Kit projectIds must be an array.");
  const projectIds = input.projectIds.map((id) => text(id, "project ID").trim());
  if (projectIds.some((id) => !id)) throw new Error("Kit project IDs cannot be empty.");
  if (new Set(projectIds).size !== projectIds.length) throw new Error("Duplicate Kit project ID.");
  if (projectIds.includes(COMPANION_PROJECT_ID))
    throw new Error("Companion cannot belong to a Kit.");
  const createdAt = iso(input.createdAt, "createdAt");
  const updatedAt = iso(input.updatedAt, "updatedAt");
  return {
    formatVersion: 1,
    id: input.id,
    title,
    description,
    targetFrontend: "sillytavern",
    projectIds,
    createdAt,
    updatedAt,
    origin: parseOrigin(input.origin),
  };
}

export function parseInstalledKitState(value: unknown): InstalledKitStateV1 {
  const input = record(value, "Installed Kit state must be an object.");
  exactKeys(
    input,
    [
      "kitId",
      "definitionFingerprint",
      "installedProjectIds",
      "missingProjectIds",
      "status",
      "installedAt",
      "lastVerifiedAt",
    ],
    "Installed Kit state",
  );
  const kitId = text(input.kitId, "kitId");
  const definitionFingerprint = text(input.definitionFingerprint, "fingerprint");
  if (!SHA256.test(definitionFingerprint)) throw new Error("Invalid Kit fingerprint.");
  const installedProjectIds = uniqueStrings(input.installedProjectIds, "installedProjectIds");
  const missingProjectIds = uniqueStrings(input.missingProjectIds, "missingProjectIds");
  if (input.status !== "installed" && input.status !== "incomplete" && input.status !== "drifted") {
    throw new Error("Invalid installed Kit status.");
  }
  return {
    kitId,
    definitionFingerprint,
    installedProjectIds,
    missingProjectIds,
    status: input.status,
    installedAt: iso(input.installedAt, "installedAt"),
    lastVerifiedAt: iso(input.lastVerifiedAt, "lastVerifiedAt"),
  };
}

export async function fingerprintKit(kit: PersonalKitV1): Promise<string> {
  return fingerprintKitTopology(kit.projectIds);
}

export async function fingerprintKitTopology(projectIds: readonly string[]): Promise<string> {
  const body = JSON.stringify(projectIds);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function parseOrigin(value: unknown): KitOriginV1 {
  const origin = record(value, "Kit origin must be an object.");
  if (origin.kind === "local") {
    exactKeys(origin, ["kind"], "Kit origin");
    return { kind: "local" };
  }
  if (origin.kind === "published-copy") {
    exactKeys(origin, ["kind", "tavernaryKitId"], "Kit origin");
    return {
      kind: "published-copy",
      tavernaryKitId: text(origin.tavernaryKitId, "tavernaryKitId"),
    };
  }
  if (origin.kind === "imported") {
    exactKeys(origin, ["kind", "sourceId"], "Kit origin");
    return { kind: "imported", sourceId: text(origin.sourceId, "sourceId") };
  }
  throw new Error("Invalid Kit origin.");
}

function record(value: unknown, message: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(message);
  return value as Record<string, unknown>;
}
function exactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  label: string,
): void {
  const expectedSet = new Set(expected);
  if (Object.keys(value).some((key) => !expectedSet.has(key)))
    throw new Error(`${label} contains unknown fields.`);
  if (expected.some((key) => !Object.hasOwn(value, key)))
    throw new Error(`${label} is missing fields.`);
}
function text(value: unknown, label: string): string {
  if (typeof value !== "string") throw new Error(`Invalid ${label}.`);
  return value;
}
function iso(value: unknown, label: string): string {
  const result = text(value, label);
  if (!Number.isFinite(Date.parse(result)) || new Date(result).toISOString() !== result)
    throw new Error(`Invalid ${label}.`);
  return result;
}
function uniqueStrings(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) throw new Error(`Invalid ${label}.`);
  const result = value.map((entry) => text(entry, label));
  if (new Set(result).size !== result.length) throw new Error(`Duplicate ${label}.`);
  return result;
}
