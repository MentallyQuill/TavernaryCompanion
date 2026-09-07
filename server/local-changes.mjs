import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { realpath, lstat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);
export async function inspectLocalChanges(root, extensionName, targetSha) {
  if (
    typeof extensionName !== "string" ||
    !/^[\w.-]+$/.test(extensionName) ||
    extensionName === "." ||
    extensionName === ".."
  )
    throw new Error("Invalid extension");
  if (targetSha !== null && (typeof targetSha !== "string" || !/^[a-f0-9]{40}$/i.test(targetSha)))
    throw new Error("Invalid revision");
  const base = await realpath(root);
  const folder = await realpath(path.join(base, extensionName));
  if (
    path.dirname(folder) !== base ||
    (await lstat(path.join(base, extensionName))).isSymbolicLink()
  )
    throw new Error("Invalid extension location");
  const gitPath = path.join(folder, ".git");
  if (!(await lstat(gitPath)).isDirectory() || (await realpath(gitPath)) !== gitPath)
    throw new Error("Invalid checkout");
  const git = async (...args) =>
    (
      await exec("git", ["-c", "core.fsmonitor=false", ...args], {
        cwd: folder,
        timeout: 15000,
        maxBuffer: 16 * 1024 * 1024,
        windowsHide: true,
      })
    ).stdout;
  const installedSha = (await git("rev-parse", "HEAD")).trim();
  const target = targetSha ?? (await git("rev-parse", "--verify", "@{upstream}")).trim();
  if (!/^[a-f0-9]{40}$/i.test(target)) throw new Error("Invalid upstream");
  // Only diagnose ordinary forward updates; divergent branches have a different cause.
  await git("merge-base", "--is-ancestor", installedSha, target);
  const incoming = (await git("diff", "--name-only", "-z", installedSha, target, "--"))
    .split("\0")
    .filter(Boolean);
  const modified = (await git("diff", "--name-only", "-z", "HEAD", "--"))
    .split("\0")
    .filter(Boolean);
  const untracked = (await git("ls-files", "--others", "--exclude-standard", "-z"))
    .split("\0")
    .filter(Boolean);
  const files = [...new Set([...modified, ...untracked])];
  const normalize = (value) => (process.platform === "win32" ? value.toLowerCase() : value);
  const conflicting = files.some((file) =>
    incoming.some((changed) => {
      const a = normalize(file),
        b = normalize(changed);
      return a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);
    }),
  );
  const hash = createHash("sha256");
  hash
    .update(installedSha)
    .update(target)
    .update(await git("status", "--porcelain=v1", "-z", "--untracked-files=all"));
  hash.update(await git("diff", "--no-ext-diff", "--no-textconv", "--binary", "HEAD", "--"));
  for (const file of untracked)
    hash.update(file).update(await git("hash-object", "--no-filters", "--", file));
  return { installedSha, conflicting, fingerprint: hash.digest("hex") };
}

export const info = {
  id: "tavernary-companion",
  name: "Tavernary Companion update detection",
  description: "Read-only detection of local files blocking extension updates.",
};
export async function init(router) {
  router.post("/local-changes", async (request, response) => {
    if (!request.user?.directories?.extensions) return response.sendStatus(401);
    try {
      return response.json(
        await inspectLocalChanges(
          request.user.directories.extensions,
          request.body?.extensionName,
          request.body?.targetSha ?? null,
        ),
      );
    } catch {
      return response.status(409).json({ error: "Local file changes could not be checked." });
    }
  });
}
