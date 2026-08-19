import { createRuntimeId } from "../runtime-id";
import type { PersonalKitV1 } from "./kit-types";
import { parsePersonalKit } from "./kit-validation";

export const MAX_KIT_FILE_BYTES = 1024 * 1024;

export function serializeKit(kit: PersonalKitV1): {
  text: string;
  filename: string;
  mimeType: "application/json";
} {
  const parsed = parsePersonalKit(kit);
  return {
    text: `${JSON.stringify(parsed, null, 2)}\n`,
    filename: `${slug(parsed.title)}.tavernary-kit.json`,
    mimeType: "application/json",
  };
}
export function parseKitText(text: string): PersonalKitV1 {
  if (new TextEncoder().encode(text).byteLength > MAX_KIT_FILE_BYTES)
    throw new Error("Kit file exceeds 1 MiB.");
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("Kit file is not valid JSON.");
  }
  return parsePersonalKit(value);
}
export function parseKitBytes(bytes: Uint8Array): PersonalKitV1 {
  if (bytes.byteLength > MAX_KIT_FILE_BYTES) throw new Error("Kit file exceeds 1 MiB.");
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("Kit file is not valid UTF-8.");
  }
  return parseKitText(text);
}
export function prepareImportedKit(
  kit: PersonalKitV1,
  existingIds: ReadonlySet<string>,
  uuid: () => string = createRuntimeId,
  now: () => string = () => new Date().toISOString(),
): PersonalKitV1 {
  if (!existingIds.has(kit.id)) return structuredClone(kit);
  const timestamp = now();
  return parsePersonalKit({
    ...kit,
    id: uuid(),
    createdAt: timestamp,
    updatedAt: timestamp,
    origin: { kind: "imported", sourceId: kit.id },
  });
}
function slug(value: string): string {
  return (
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/gu, "")
      .toLocaleLowerCase("en-US")
      .replace(/[^a-z0-9]+/gu, "-")
      .replace(/^-|-$/gu, "") || "kit"
  );
}
