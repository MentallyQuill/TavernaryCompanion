import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

import { build } from "esbuild";

export default async function globalSetup(): Promise<void> {
  const root = resolve(import.meta.dirname, "../..");
  const outdir = resolve(root, ".tmp");
  await mkdir(outdir, { recursive: true });
  await build({
    absWorkingDir: root,
    entryPoints: { "ui-harness": "tests/fixtures/ui-harness-entry.tsx" },
    outdir,
    bundle: true,
    format: "esm",
    platform: "browser",
    target: ["es2022"],
    alias: {
      "@tavernary/catalog-core": resolve(root, "vendor/tavernary-core/src/index.ts"),
    },
    logLevel: "silent",
  });
}
