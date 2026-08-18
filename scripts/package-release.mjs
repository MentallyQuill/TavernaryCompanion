import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const RELEASE_FILES = [
  "LICENSES/Inter-OFL-1.1.txt",
  "dist/assets/inter-latin-ext-wght-normal.woff2",
  "dist/assets/inter-latin-wght-normal.woff2",
  "dist/assets/tavernary-trihex.png",
  "dist/companion.css",
  "dist/extension.js",
  "manifest.json",
];

export function createReleasePackage({
  root,
  outputDirectory,
  sourceCommit,
  requireClean = false,
}) {
  if (requireClean) assertClean(root);
  const manifest = JSON.parse(readFileSync(resolve(root, "manifest.json"), "utf8"));
  const files = RELEASE_FILES.map((path) => ({ path, data: readFileSync(resolve(root, path)) }));
  const archive = createStoredZip(files);
  const archiveSha256 = sha256(archive);
  const hashManifest = {
    formatVersion: 1,
    version: manifest.version,
    sourceCommit,
    archiveSha256,
    files: files.map(({ path, data }) => ({ path, size: data.byteLength, sha256: sha256(data) })),
  };
  mkdirSync(outputDirectory, { recursive: true });
  const base = `tavernary-companion-${manifest.version}`;
  const archivePath = resolve(outputDirectory, `${base}.zip`);
  const hashManifestPath = resolve(outputDirectory, `${base}.sha256.json`);
  atomicWrite(archivePath, archive);
  atomicWrite(hashManifestPath, Buffer.from(`${JSON.stringify(hashManifest, null, 2)}\n`));
  return { archivePath, hashManifestPath, hashManifest };
}

export function createStoredZip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const { path, data: input } of [...files].sort((a, b) => a.path.localeCompare(b.path))) {
    const name = Buffer.from(path.replaceAll("\\", "/"));
    const data = Buffer.from(input);
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0x21, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, name, data);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0x21, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);
    offset += local.length + name.length + data.length;
  }
  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, centralDirectory, end]);
}

function assertClean(root) {
  const status = execFileSync("git", ["status", "--porcelain", "--untracked-files=no"], {
    cwd: root,
    encoding: "utf8",
  });
  if (status.trim()) throw new Error("Release packaging requires a clean tracked tree.");
}
function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
function atomicWrite(path, data) {
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, data);
  renameSync(temporary, path);
}
function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
const CRC_TABLE = Array.from({ length: 256 }, (_, number) => {
  let value = number;
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const outputDirectory = resolve(process.argv[2] ?? resolve(root, "artifacts"));
  try {
    const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
    }).trim();
    const result = createReleasePackage({
      root,
      outputDirectory,
      sourceCommit,
      requireClean: true,
    });
    process.stdout.write(`${JSON.stringify(result.hashManifest, null, 2)}\n`);
  } catch (error) {
    rmSync(resolve(outputDirectory, `.${process.pid}.tmp`), { force: true });
    throw error;
  }
}
