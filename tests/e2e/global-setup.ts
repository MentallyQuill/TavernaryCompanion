import { cp, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

import { build } from "esbuild";

export default async function globalSetup(): Promise<void> {
  const root = resolve(import.meta.dirname, "../..");
  const outdir = resolve(root, ".tmp");
  await mkdir(resolve(outdir, "assets"), { recursive: true });
  await Promise.all(
    [
      "inter-latin-ext-wght-normal.woff2",
      "inter-latin-wght-normal.woff2",
      "tavernary-trihex.png",
    ].map((asset) => cp(resolve(root, "src/assets", asset), resolve(outdir, "assets", asset))),
  );
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
    external: ["./assets/*"],
    logLevel: "silent",
  });
}
