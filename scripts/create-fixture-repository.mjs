import { cpSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const target = mkdtempSync(resolve(tmpdir(), "tavernary-harmless-extension-"));
cpSync(resolve(root, "tests/fixtures/harmless-extension"), target, { recursive: true });
const git = (args) =>
  execFileSync("git", args, {
    cwd: target,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "Tavernary Fixture",
      GIT_AUTHOR_EMAIL: "fixture@tavernary.invalid",
      GIT_COMMITTER_NAME: "Tavernary Fixture",
      GIT_COMMITTER_EMAIL: "fixture@tavernary.invalid",
      GIT_AUTHOR_DATE: "2026-08-18T00:00:00Z",
      GIT_COMMITTER_DATE: "2026-08-18T00:00:00Z",
    },
  }).trim();
git(["init", "--initial-branch=main"]);
git(["add", "--all"]);
git(["commit", "-m", "test: harmless extension fixture"]);
process.stdout.write(`${JSON.stringify({ path: target, commit: git(["rev-parse", "HEAD"]) })}\n`);
