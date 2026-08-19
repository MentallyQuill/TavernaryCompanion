import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { RELEASE_FILES } from "./package-release.mjs";

export function readStoredZip(buffer) {
  const entries = new Map();
  let offset = 0;
  while (offset + 4 <= buffer.length && buffer.readUInt32LE(offset) === 0x04034b50) {
    const method = buffer.readUInt16LE(offset + 8);
    if (method !== 0) throw new Error("Release ZIP uses an unsupported compression method.");
    const size = buffer.readUInt32LE(offset + 18);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const name = buffer.subarray(nameStart, nameStart + nameLength).toString("utf8");
    if (!name || name.startsWith("/") || name.includes("..") || name.includes("\\"))
      throw new Error("Release ZIP contains an unsafe path.");
    entries.set(name, Buffer.from(buffer.subarray(dataStart, dataStart + size)));
    offset = dataStart + size;
  }
  return entries;
}

export function verifyRelease({ archivePath, hashManifestPath }) {
  const archive = readFileSync(archivePath);
  const manifest = JSON.parse(readFileSync(hashManifestPath, "utf8"));
  if (sha256(archive) !== manifest.archiveSha256) throw new Error("Release archive hash mismatch.");
  const entries = readStoredZip(archive);
  const names = [...entries.keys()].sort();
  if (JSON.stringify(names) !== JSON.stringify([...RELEASE_FILES].sort()))
    throw new Error("Release archive contains unexpected files.");
  for (const expected of manifest.files) {
    const data = entries.get(expected.path);
    if (!data || data.byteLength !== expected.size || sha256(data) !== expected.sha256)
      throw new Error(`Release file hash mismatch: ${expected.path}`);
  }
  if (!/^[0-9a-f]{40}$/u.test(manifest.sourceCommit))
    throw new Error("Release source commit is invalid.");
  return {
    entries: names,
    archiveSha256: manifest.archiveSha256,
    sourceCommit: manifest.sourceCommit,
    version: manifest.version,
  };
}
function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const packageManifest = JSON.parse(readFileSync(resolve(root, "manifest.json"), "utf8"));
  const archivePath = resolve(
    process.argv[2] ??
      resolve(root, "artifacts", `tavernary-companion-${packageManifest.version}.zip`),
  );
  const hashManifestPath = resolve(
    process.argv[3] ??
      resolve(dirname(archivePath), `${basename(archivePath, ".zip")}.sha256.json`),
  );
  process.stdout.write(
    `${JSON.stringify(verifyRelease({ archivePath, hashManifestPath }), null, 2)}\n`,
  );
}
