import { createHash, randomUUID } from "node:crypto";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = "packages/catalog-core";

function git(arguments_, cwd) {
  const result = spawnSync("git", ["-c", `safe.directory=${resolve(cwd)}`, ...arguments_], {
    cwd,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.status !== 0) {
    throw new Error(`Git command failed: git ${arguments_.join(" ")}\n${result.stderr.trim()}`);
  }
  return result.stdout.trim();
}

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = (
    await Promise.all(
      entries.map(async (entry) => {
        const path = resolve(directory, entry.name);
        return entry.isDirectory() ? filesUnder(path) : [path];
      }),
    )
  ).flat();
  return files.sort((left, right) => left.localeCompare(right));
}

function portablePath(root, path) {
  return relative(root, path).split(sep).join("/");
}

async function hashTree(directory) {
  return Promise.all(
    (await filesUnder(directory)).map(async (path) => ({
      path: portablePath(directory, path),
      sha256: createHash("sha256")
        .update(await readFile(path))
        .digest("hex"),
    })),
  );
}

function assertCommit(value) {
  if (!/^[0-9a-f]{40}$/u.test(value)) {
    throw new Error("Tavernary commit must be a full 40-character SHA.");
  }
}

async function assertPackageTree(directory) {
  for (const path of [
    "package.json",
    "src/index.ts",
    "fixtures/catalog-core-behavior-v1.json",
    "tests/contract-fixtures.test.ts",
  ]) {
    const candidate = resolve(directory, path);
    if (!(await stat(candidate)).isFile()) {
      throw new Error(`CatalogCore package is missing ${path}.`);
    }
  }
}

async function prepareRemote(repository, commit) {
  const temporaryRoot = await mkdtemp(resolve(tmpdir(), "tavernary-core-"));
  const checkout = resolve(temporaryRoot, "repository");
  await mkdir(checkout);
  git(["init", "--quiet"], checkout);
  git(["remote", "add", "origin", repository], checkout);
  git(["fetch", "--quiet", "--depth=1", "origin", commit], checkout);
  git(["checkout", "--quiet", "--detach", "FETCH_HEAD"], checkout);
  return { checkout, cleanup: () => rm(temporaryRoot, { recursive: true }) };
}

export async function syncVendor({
  root = defaultRoot,
  repository = "https://github.com/MentallyQuill/Tavernary.git",
  commit,
  local,
}) {
  assertCommit(commit);
  const rootPath = resolve(root);
  const prepared = local
    ? { checkout: resolve(local), cleanup: async () => undefined }
    : await prepareRemote(repository, commit);
  try {
    const actualCommit = git(["rev-parse", "HEAD"], prepared.checkout);
    if (actualCommit !== commit) {
      throw new Error(`Tavernary checkout is ${actualCommit}; expected ${commit}.`);
    }
    if (local) {
      const dirty = git(["status", "--porcelain", "--untracked-files=all"], prepared.checkout);
      if (dirty) {
        throw new Error("Local Tavernary checkout must be clean before sync.");
      }
    }

    const packageDirectory = resolve(prepared.checkout, sourcePath);
    await assertPackageTree(packageDirectory);
    const vendorDirectory = resolve(rootPath, "vendor");
    const destination = resolve(vendorDirectory, "tavernary-core");
    const stage = resolve(vendorDirectory, `.tavernary-core-${randomUUID()}`);
    const backup = resolve(vendorDirectory, `.tavernary-core-backup-${randomUUID()}`);
    await mkdir(vendorDirectory, { recursive: true });
    await cp(packageDirectory, stage, { recursive: true, errorOnExist: true });
    const files = await hashTree(stage);
    const lock = {
      schemaVersion: 1,
      repository,
      commit,
      sourcePath,
      files,
    };

    let movedExisting = false;
    try {
      try {
        await rename(destination, backup);
        movedExisting = true;
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
      await rename(stage, destination);
      const lockPath = resolve(vendorDirectory, "tavernary-core.lock.json");
      const temporaryLock = `${lockPath}.tmp-${randomUUID()}`;
      await writeFile(temporaryLock, `${JSON.stringify(lock, null, 2)}\n`);
      await rename(temporaryLock, lockPath);
      if (movedExisting) await rm(backup, { recursive: true });
    } catch (error) {
      await rm(stage, { recursive: true, force: true });
      if (movedExisting) {
        await rm(destination, { recursive: true, force: true });
        await rename(backup, destination);
      }
      throw error;
    }

    return { commit, files: files.length };
  } finally {
    await prepared.cleanup();
  }
}

export async function verifyVendorLock({ root = defaultRoot } = {}) {
  const vendorDirectory = resolve(root, "vendor");
  const lock = JSON.parse(
    await readFile(resolve(vendorDirectory, "tavernary-core.lock.json"), "utf8"),
  );
  assertCommit(lock.commit);
  if (lock.schemaVersion !== 1 || lock.sourcePath !== sourcePath || !Array.isArray(lock.files)) {
    throw new Error("Tavernary CatalogCore lock is invalid.");
  }
  const actualFiles = await hashTree(resolve(vendorDirectory, "tavernary-core"));
  if (JSON.stringify(actualFiles) !== JSON.stringify(lock.files)) {
    throw new Error("Vendored CatalogCore files do not match the lock.");
  }
  return { ok: true };
}

function argument(name) {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

async function main() {
  const commit = argument("--commit");
  if (!commit) throw new Error("--commit is required.");
  const result = await syncVendor({
    commit,
    local: argument("--local"),
    repository: argument("--repo") ?? "https://github.com/MentallyQuill/Tavernary.git",
  });
  console.log(`Locked ${result.files} CatalogCore files at ${result.commit}`);
}

if (
  process.argv[1] &&
  basename(fileURLToPath(import.meta.url)) === basename(process.argv[1]) &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main();
}
