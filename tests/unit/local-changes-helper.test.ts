// @vitest-environment node
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { afterEach, expect, it } from "vitest";
import { inspectLocalChanges } from "../../server/local-changes.mjs";
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
  roots.length = 0;
});
it("detects overlapping edited and untracked files without changing the checkout", async () => {
  const root = await mkdtemp(join(tmpdir(), "companion-changes-"));
  roots.push(root);
  const dir = join(root, "Alpha");
  await mkdir(dir);
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: dir, encoding: "utf8" }).trim();
  git("init");
  git("config", "user.name", "Test");
  git("config", "user.email", "test@example.test");
  await writeFile(join(dir, "code.js"), "original");
  git("add", ".");
  git("commit", "-m", "base");
  const base = git("rev-parse", "HEAD");
  await writeFile(join(dir, "code.js"), "updated");
  await writeFile(join(dir, "new.js"), "remote");
  git("add", ".");
  git("commit", "-m", "update");
  const target = git("rev-parse", "HEAD");
  git("reset", "--hard", base);
  await writeFile(join(dir, "code.js"), "local edit");
  const first = await inspectLocalChanges(root, "Alpha", target);
  expect(first.conflicting).toBe(true);
  expect(first.installedSha).toBe(base);
  git("restore", "code.js");
  await writeFile(join(dir, "new.js"), "local new file");
  const second = await inspectLocalChanges(root, "Alpha", target);
  expect(second.conflicting).toBe(true);
  expect(second.fingerprint).not.toBe(first.fingerprint);
  await rm(join(dir, "new.js"));
  await writeFile(join(dir, "notes.txt"), "unrelated");
  expect((await inspectLocalChanges(root, "Alpha", target)).conflicting).toBe(false);
  expect(git("rev-parse", "HEAD")).toBe(base);
});
it("rejects paths outside the authenticated user's extension directory", async () => {
  await expect(inspectLocalChanges(tmpdir(), "../other-user/Alpha", null)).rejects.toThrow();
  await expect(inspectLocalChanges(tmpdir(), "Alpha", "--help")).rejects.toThrow();
});
