import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { build, context } from "esbuild";

const SILLYTAVERN_MODULES = ["/script.js", "/scripts/extensions.js", "/scripts/popup.js"];
const BRAND_ASSETS = [
  "inter-latin-ext-wght-normal.woff2",
  "inter-latin-wght-normal.woff2",
  "tavernary-trihex.png",
];

function buildOptions(root) {
  return {
    absWorkingDir: root,
    entryPoints: {
      extension: "src/extension/index.ts",
      companion: "src/styles/companion.css",
    },
    outdir: "dist",
    entryNames: "[name]",
    bundle: true,
    format: "esm",
    platform: "browser",
    target: ["es2022"],
    external: [...SILLYTAVERN_MODULES, "./assets/*"],
    logLevel: "silent",
  };
}

export async function buildExtension({ root, watch = false }) {
  const absoluteRoot = resolve(root);
  await Promise.all([
    rm(resolve(absoluteRoot, "dist/extension.js"), { force: true }),
    rm(resolve(absoluteRoot, "dist/companion.css"), { force: true }),
    rm(resolve(absoluteRoot, "dist/assets"), { force: true, recursive: true }),
  ]);

  await mkdir(resolve(absoluteRoot, "dist/assets"), { recursive: true });
  await Promise.all(
    BRAND_ASSETS.map((asset) =>
      cp(resolve(absoluteRoot, "src/assets", asset), resolve(absoluteRoot, "dist/assets", asset)),
    ),
  );

  if (watch) {
    const buildContext = await context(buildOptions(absoluteRoot));
    await buildContext.watch();
    return buildContext;
  }

  const result = await build(buildOptions(absoluteRoot));
  if (result.warnings.length > 0) {
    throw new Error(`Companion build emitted ${result.warnings.length} warning(s).`);
  }
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await buildExtension({ root: process.cwd(), watch: process.argv.includes("--watch") });
}
