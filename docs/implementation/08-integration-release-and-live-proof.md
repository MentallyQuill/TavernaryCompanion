# Integration, Release, and Live Proof Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove the exact Tavernary deployment and exact Companion release artifact satisfy V1 behavior in isolated SillyTavern desktop and mobile contexts.

**Architecture:** Deterministic release packaging produces a hash manifest over the installable extension. Contract, unit, browser-harness, simulated-host, and real-host layers remain distinct. Live acceptance binds Tavernary Pages evidence to its deployment SHA and Companion runtime evidence to the packaged artifact SHA.

**Tech Stack:** Vitest, Playwright, esbuild, Node.js 24, GitHub Actions/Pages, GitHub CLI, PowerShell, isolated SillyTavern profile.

**Spec:** `docs/superpowers/specs/2026-08-18-tavernary-companion-design.md`; `docs/design/README.md`

## Global Constraints

- Do not claim live behavior from fixtures, source tests, or build success.
- Do not claim publication from a generated catalog or accepted workflow dispatch.
- Test the exact release artifact installed into an isolated profile.
- Keep test profiles, caches, and harmless fixture repositories outside real user profiles.
- Never print authentication headers, tokens, full private settings, or unrelated SillyTavern data.
- Verify all required viewports, keyboard flow, reduced motion, and enlarged text.
- Distinguish source SHA, Tavernary deployment SHA, Companion artifact SHA, installed-file SHA, and observed live URL.
- Use GitHub CLI with network permission enabled for GitHub state and Actions evidence.

---

### Task 1: Create a harmless lifecycle fixture and simulated-host scenarios

**Files:**
- Create: `tests/fixtures/harmless-extension/manifest.json`
- Create: `tests/fixtures/harmless-extension/index.js`
- Create: `tests/fixtures/harmless-extension/style.css`
- Create: `tests/fixtures/catalog-v7-integration.json`
- Create: `tests/integration/lifecycle-scenarios.test.ts`
- Create: `tests/integration/kit-scenarios.test.ts`
- Create: `scripts/create-fixture-repository.mjs`

**Interfaces:**
- Consumes: production coordinators/planners/executors and FakeHost.
- Produces: deterministic success/failure/interruption scenario coverage and a local Git repository SillyTavern can clone.

- [ ] **Step 1: Write the failing end-to-end service scenario**

```ts
it("installs, activates, switches, and reference-uninstalls Kits", async () => {
  const app = createIntegrationApp(integrationCatalog);
  await app.installKit("kit-alpha", approveAll);
  await app.activateKit("kit-alpha", approveAll);
  await app.installKit("kit-beta", approveAll);
  await app.activateKit("kit-beta", approveAll);
  const receipt = await app.uninstallKit("kit-alpha", approveAll);
  expect(receipt.keptForOtherKits).toContain("shared-extension");
  expect(app.read().activeKitId).toBe("kit-beta");
});
```

- [ ] **Step 2: Run scenarios and observe fixture/harness failures**

Run: `npm.cmd test -- tests/integration/lifecycle-scenarios.test.ts tests/integration/kit-scenarios.test.ts`

Expected: FAIL until the integration app and fixture exist.

- [ ] **Step 3: Implement the harmless extension fixture**

The fixture creates one settings-menu text node and logs one namespaced initialization message. It makes no network requests, reads no chat data, and writes no settings. The repository-creation script initializes a temporary Git repository, commits fixed file contents with a fixed author, and prints its absolute path and commit SHA.

- [ ] **Step 4: Implement complete simulated scenarios**

Cover first install disclosure, material/immediate/stale warning, host rejection, verification mismatch, managed/external removal, self-protection, successful activation, partial clone, enable failure, shared uninstall, external context, stale plan, interrupted journal recovery, offline cache, corrupt catalog, and schema 8.

- [ ] **Step 5: Run integration tests**

Run: `npm.cmd test -- tests/integration`

Expected: PASS with no unhandled rejections and exact host call assertions.

- [ ] **Step 6: Commit**

```powershell
git add -- tests/fixtures/harmless-extension tests/fixtures/catalog-v7-integration.json tests/integration scripts/create-fixture-repository.mjs
git commit -m "test: add integrated lifecycle scenarios"
```

### Task 2: Add deterministic release packaging and verification

**Files:**
- Create: `scripts/package-release.mjs`
- Create: `scripts/verify-release.mjs`
- Create: `tests/unit/release-package.test.ts`
- Modify: `package.json`
- Modify: `.gitignore`
- Generate outside Git: a ZIP named from `manifest.version`, for example `artifacts/tavernary-companion-0.1.0.zip`
- Generate outside Git: the matching hash manifest, for example `artifacts/tavernary-companion-0.1.0.sha256.json`

**Interfaces:**
- Consumes: clean source tree, `manifest.json`, production build outputs, version, and Git SHA.
- Produces: deterministic ZIP and sorted file-hash manifest.

- [ ] **Step 1: Write failing package-content tests**

```ts
expect(packageEntries).toEqual([
  "dist/companion.css",
  "dist/extension.js",
  "manifest.json",
]);
expect(hashManifest.sourceCommit).toMatch(/^[0-9a-f]{40}$/u);
```

Also prove the ZIP contains no `src`, tests, docs, `.git`, source maps, lockfiles, caches, credentials, or absolute paths.

- [ ] **Step 2: Run focused test and observe missing-packager failure**

Run: `npm.cmd test -- tests/unit/release-package.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement deterministic packaging**

Require a clean tracked tree, run production build, normalize ZIP paths and timestamps, sort entries, hash every unpacked file, record source commit/version/archive SHA-256, and write artifacts atomically. Add scripts `release:package` and `release:verify`.

- [ ] **Step 4: Verify reproducibility**

Run packaging twice from the same commit into two temporary output directories.

Expected: archive SHA-256 and per-file hashes are byte-identical.

- [ ] **Step 5: Run release verification**

Run: `npm.cmd run release:package`

Run: `npm.cmd run release:verify`

Expected: PASS and exactly three installable files are reported.

- [ ] **Step 6: Commit**

```powershell
git add -- scripts/package-release.mjs scripts/verify-release.mjs tests/unit/release-package.test.ts package.json package-lock.json .gitignore
git commit -m "build: add verified release package"
```

### Task 3: Add the full continuous-integration gate

**Files:**
- Create: `.github/workflows/check.yml`
- Create: `.github/workflows/release-artifact.yml`
- Modify: `README.md`
- Test: `tests/unit/workflow-contract.test.ts`
- Test: local commands matching workflows

**Interfaces:**
- Consumes: pull request/push source and optional version tag.
- Produces: reproducible check results and uploaded verified artifact for release tags.

- [ ] **Step 1: Add a workflow-contract test**

Assert `check.yml` pins Node 24, uses `npm ci`, runs format/lint/typecheck/unit/build/browser gates, uploads Playwright diagnostics only on failure, and grants read-only contents permission. Assert release workflow packages only after the same gate succeeds.

- [ ] **Step 2: Run the contract test and observe missing-workflow failure**

Run: `npm.cmd test -- tests/unit/workflow-contract.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement workflows**

Use `permissions: contents: read`, concurrency cancellation by workflow/ref, npm cache, Playwright Chromium install, `npm ci`, `npm run check`, and browser tests. Release artifacts use the packager and verifier; publishing a GitHub Release remains a separately reviewed repository operation.

- [ ] **Step 4: Run the exact local workflow commands**

Run: `npm.cmd ci`

Run: `npx.cmd playwright install chromium`

Run: `npm.cmd run check`

Run: `npm.cmd run test:e2e`

Run: `npm.cmd run release:package`

Run: `npm.cmd run release:verify`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- .github/workflows/check.yml .github/workflows/release-artifact.yml README.md tests/unit/workflow-contract.test.ts
git commit -m "ci: verify Companion releases"
```

### Task 4: Verify the exact Tavernary Pages deployment

**Files:**
- Record evidence in: `docs/implementation/evidence/tavernary-pages-v1.md`
- No Tavernary source changes unless verification finds a defect.

**Interfaces:**
- Consumes: merged Tavernary Phase 1 commit and successful Pages deployment.
- Produces: deployment-bound live catalog proof.

- [ ] **Step 1: Confirm repository and workflow state**

Run with GitHub network permission:

```powershell
gh auth status
gh repo view MentallyQuill/Tavernary --json nameWithOwner,defaultBranchRef,url
gh run list -R MentallyQuill/Tavernary --limit 20 --json databaseId,workflowName,status,conclusion,headSha,url,createdAt
```

Expected: authentication succeeds and the completed Pages run identifies the exact merged Phase 1 SHA.

- [ ] **Step 2: Fetch live headers twice**

Request `https://tavernary.org/catalog/tavernary-catalog.json`, record status, `Content-Type`, `Access-Control-Allow-Origin`, ETag, Last-Modified, Content-Length, and body SHA-256. Repeat with `If-None-Match`.

Expected: 200 JSON with permissive CORS, then 304 for the recorded ETag.

- [ ] **Step 3: Validate live catalog content**

Run the live body through the locked CatalogCore validator. Record schema 7, `generatedAt`, project/Kit/installable counts, and representative eligible/browse-only contracts. Compare its SHA-256 to the exact `public/catalog/tavernary-catalog.json` from the deployed Tavernary commit.

- [ ] **Step 4: Record evidence**

The evidence document names observation time, live URL, deployment workflow URL, deployment SHA, file SHA-256, headers, validation counts, and parity result. Do not mark live proof when the deployment SHA differs from the intended source.

- [ ] **Step 5: Commit evidence**

```powershell
git add -- docs/implementation/evidence/tavernary-pages-v1.md
git commit -m "docs: record live catalog proof"
```

### Task 5: Install and exercise the exact Companion artifact

**Files:**
- Install into an isolated SillyTavern profile extension directory.
- Record evidence in: `docs/implementation/evidence/companion-installed-v1.md`
- Store diagnostic screenshots/traces under ignored `artifacts/acceptance/`.

**Interfaces:**
- Consumes: verified Companion release ZIP, isolated SillyTavern profile, harmless fixture repository, and live Tavernary catalog.
- Produces: installed-runtime and responsive acceptance proof bound to artifact hashes.

- [ ] **Step 1: Back up and identify the exact isolated target**

Resolve the SillyTavern root, profile name, extension target directory, current Git SHA, and whether the target already exists. Use a new acceptance-only profile. If a prior Companion target exists, move it to a timestamped backup inside that profile before copying the verified artifact.

- [ ] **Step 2: Install only verified artifact files**

Extract the ZIP into the exact user-extension folder. Hash `manifest.json`, `dist/extension.js`, and `dist/companion.css` in place and compare them with the release hash manifest.

Expected: all three hashes match before SillyTavern starts.

- [ ] **Step 3: Exercise core catalog journeys**

Verify first open, default SillyTavern extension/preset filters, clearing defaults, search `+` union, all filters/sorts, project detail Back restoration, Installed reconciliation, manual refresh, 304 current state, offline cache, and simulated schema 8 browse-only behavior.

- [ ] **Step 4: Exercise lifecycle and Kit journeys**

Use only the harmless fixture for mutations. Verify disclosure, material/immediate/stale warnings, report review/return, install verification, managed removal, external removal, self-protection, personal Kit create/edit/export/import, successful activation, failed activation preserving prior active Kit, shared-member uninstall, and interruption recovery.

- [ ] **Step 5: Exercise responsive and accessible contexts**

At every required viewport, measure shell bounds/overflow and verify routes/actions. Run keyboard-only navigation, Escape layer order, focus restoration, reduced motion, 200% text, screen-reader names, and axe. Confirm mobile Back behavior and safe-area/full-height layout.

- [ ] **Step 6: Capture console and network evidence**

Record unexpected console errors as zero, catalog requests as same-origin host to Tavernary with no credentials, no remote JavaScript loads, and no lifecycle requests outside approved actions. Redact only user-specific paths; do not omit failures.

- [ ] **Step 7: Rehash installed files after acceptance**

Expected: installed production hashes still match the release manifest.

- [ ] **Step 8: Commit evidence**

```powershell
git add -- docs/implementation/evidence/companion-installed-v1.md
git commit -m "docs: record installed V1 proof"
```

### Task 6: Complete release-readiness reconciliation

**Files:**
- Modify: `docs/implementation/README.md`
- Create: `docs/implementation/evidence/v1-release-readiness.md`

**Interfaces:**
- Consumes: every phase gate, live Pages evidence, installed artifact evidence, GitHub check state, and clean repository status.
- Produces: final V1 readiness decision with explicit gaps if any.

- [ ] **Step 1: Run fresh full gates**

Run in Tavernary:

```powershell
npm.cmd run check
```

Run in Companion:

```powershell
npm.cmd run check
npm.cmd run test:e2e
npm.cmd run release:verify
```

Expected: all commands exit 0 in the current trees.

- [ ] **Step 2: Inspect GitHub checks and deployment state**

Use GitHub CLI with network permission to record current branch commits, check conclusions, open PRs relevant to V1, and Pages deployment SHA. A queued or merely dispatched workflow is not completion.

- [ ] **Step 3: Reconcile every global definition-of-done item**

For each roadmap item, link a command result, workflow URL, Pages evidence section, installed evidence section, or record it as incomplete with the exact blocker. Do not convert an incomplete external deployment into a source-complete claim.

- [ ] **Step 4: Update roadmap statuses**

Mark phases Verified or Live proven only where current evidence supports the label. Record the exact Tavernary and Companion commits beside each status.

- [ ] **Step 5: Commit readiness record**

```powershell
git add -- docs/implementation/README.md docs/implementation/evidence/v1-release-readiness.md
git commit -m "docs: reconcile V1 readiness"
```

## Phase exit gate

The phase is complete only when the full Tavernary and Companion gates pass, exact GitHub checks are successful, the canonical catalog is proven live at the intended deployment SHA, the exact Companion artifact is proven in the isolated host, installed hashes match, and the release-readiness document contains no unacknowledged gap.
