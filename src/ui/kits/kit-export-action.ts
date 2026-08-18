import type { PersonalKitV1 } from "../../kits/kit-types";
import { serializeKit } from "../../kits/kit-portability";

export function exportKitFile(kit: PersonalKitV1): void {
  const file = serializeKit(kit);
  const url = URL.createObjectURL(new Blob([file.text], { type: file.mimeType }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
