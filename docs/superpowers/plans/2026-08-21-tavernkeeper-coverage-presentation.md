# TavernKeeper Coverage Presentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consume Catalog v8 and present TavernKeeper risk and JavaScript/TypeScript coverage truthfully across Companion.

**Architecture:** The catalog client fetches the new v8 endpoint, parses both v7 cached records and v8 remote records, and normalizes them into the vendored CatalogCore model. UI components render coverage as a secondary fact while trust policy remains risk-driven.

**Tech Stack:** TypeScript, Preact, IndexedDB, AJV, Vitest, Testing Library, Playwright

**Spec:** `docs/superpowers/specs/2026-08-21-tavernkeeper-coverage-presentation.md`

## Global Constraints

- Low risk copy is exactly “Low concern observed.”
- Incomplete-low remains informational and installable.
- Never infer coverage from prose or filenames.
- Keep Catalog v7 cache continuity, but refresh it immediately from v8.
- Keep material/high warnings unchanged.

---

### Task 1: Vendor the v8 contract and migrate catalog loading

**Files:**
- Modify: `vendor/tavernary-core/**`
- Modify: `vendor/tavernary-core.lock.json`
- Modify: `src/catalog/catalog-core.ts`
- Modify: `src/catalog/catalog-transport.ts`
- Modify: `src/catalog/catalog-cache.ts`
- Modify: `src/catalog/catalog-client.ts`
- Test: `tests/unit/catalog-core.test.ts`
- Test: `tests/unit/catalog-client.test.ts`

**Interfaces:**
- Consumes: merged Tavernary CatalogCore commit and `/catalog/tavernary-catalog-v8.json`
- Produces: catalog snapshots containing normalized coverage values

- [ ] Add failing tests proving v8 is fetched and cached, v7 cache opens, and a v7 cache never suppresses the first v8 refresh.
- [ ] Run focused tests and confirm failures identify the old URL/schema-only behavior.
- [ ] Vendor the merged CatalogCore commit and implement schema-aware cache parsing and refresh behavior.
- [ ] Run focused tests and confirm they pass.

### Task 2: Render truthful coverage and accessible copy

**Files:**
- Modify: `src/ui/projects/tavernkeeper-scan-indicator.tsx`
- Modify: `src/ui/projects/tavernkeeper-history-strip.tsx`
- Modify: `src/styles/projects.css`
- Test: `tests/unit/tavernkeeper-scan-indicator.test.tsx`
- Test: `tests/e2e/installed-updates.spec.ts`

**Interfaces:**
- Consumes: `report.javascriptAnalysisStatus`
- Produces: risk-plus-coverage trigger names, popover facts, and history labels

- [ ] Add failing tests for complete, incomplete, legacy, and v7-cache coverage copy, including accessible names and history.
- [ ] Run focused tests and confirm they fail against the old “Low concern” presentation.
- [ ] Implement “Low concern observed,” the neutral limited marker, coverage detail copy, and history labels.
- [ ] Run focused tests and update only intentional end-to-end accessibility expectations.

### Task 3: Prove informational install behavior

**Files:**
- Test: `tests/unit/trust-policy.test.ts`
- Test: `tests/unit/kit-planner.test.ts`

**Interfaces:**
- Consumes: incomplete-low catalog assessment
- Produces: no assessment-warning prompt while preserving material/high prompts

- [ ] Add explicit regression tests showing incomplete-low stays non-blocking for individual and Kit operations.
- [ ] Run the tests and confirm the existing risk-only policy satisfies them; no production trust-policy change is expected.

### Task 4: Verify and publish Companion

**Files:**
- Modify generated extension artifacts only through repository build scripts.

**Interfaces:**
- Produces: a released Companion build consuming the live Catalog v8 endpoint.

- [ ] Run `npm.cmd run check` and inspect the complete output.
- [ ] Run focused Playwright coverage for cards and version choices.
- [ ] Review `git diff --check`, vendor lock integrity, and release packaging checks.
- [ ] Commit, push, open a PR, merge after checks, and verify the merged build against the live v8 catalog.

