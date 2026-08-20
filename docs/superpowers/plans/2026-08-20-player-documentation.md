# Tavernary Companion Player Documentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite Tavernary Companion's public player documentation in plain language and make the README a screenshot-led tour of every current player-facing workflow.

**Architecture:** Keep the public documentation split by player task. The root README is the visual overview; `docs/user/README.md` is the task index; each topic page explains one workflow; `words-to-know.md` gives short definitions for recurring terms. Reuse existing tested E2E snapshots through relative links so the docs show real Companion states without creating a second screenshot source.

**Tech Stack:** Markdown, GitHub-rendered relative image links, existing PNG E2E snapshots, PowerShell/rg verification, repository npm checks.

**Spec:** `docs/superpowers/specs/2026-08-20-player-documentation-design.md`

## Global Constraints

- The public scope is limited to `README.md` and `docs/user/`; internal design and implementation docs remain unchanged.
- The audience is a player who may be new to SillyTavern, Git-style extension management, and Companion terminology.
- Use short sentences, familiar words, direct actions, and define technical terms the first time they appear.
- TavernKeeper checks are evidence about one version, not a guarantee; never describe a project as safe, approved, or guaranteed because of a scan.
- Keep saved, installed, active, managed, and externally installed states distinct.
- Do not claim features absent from the current build: preset installation, bulk update, background update polling, or automatic ownership transfer.
- Each referenced screenshot must exist and have useful alt text and a caption that explains what to notice.

---

### Task 1: Rewrite the public entry points

**Files:**
- Modify: `README.md`
- Modify: `docs/user/README.md`

**Interfaces:**
- Consumes: screenshot paths and terminology defined in `docs/superpowers/specs/2026-08-20-player-documentation-design.md`.
- Produces: a visual front page and a task-oriented player-doc index linking to every public guide.

- [ ] **Step 1: Replace the root README with the screenshot-led front page.**

  Use the Projects desktop screenshot near the top, then a compact “three places” section for Projects, Kits, and Installed. Add a first-install sequence, Checked/Newest and safety callouts, Kit Builder and Installed workflow images, boundaries, and links to the full player guide. Keep paragraphs short and use captions to teach the workflow.

- [ ] **Step 2: Rewrite the player-doc index as a task chooser.**

  Add “I want to…” links for starting, browsing/installing, updating/removing, using Kits, understanding safety, and fixing a problem. Explain Projects, Kits, and Installed in a few sentences and link to `words-to-know.md`.

- [ ] **Step 3: Verify the entry-point links and image paths.**

  Run:

  ```powershell
  $targets = @('README.md','docs/user/README.md')
  foreach ($target in $targets) {
    Select-String -Path $target -Pattern '\]\(([^)]+)\)' | ForEach-Object { $_.Line }
  }
  rg -n 'tests/e2e/.+\.png|docs/user/.+\.md' README.md docs/user/README.md
  ```

  Expected: every displayed target is one of the approved docs or screenshot paths from the spec.

### Task 2: Rewrite the first-use and discovery guides

**Files:**
- Modify: `docs/user/getting-started.md`
- Modify: `docs/user/browsing-and-installing.md`

**Interfaces:**
- Consumes: the three-room model from Task 1 and the current project-card/install behavior from the source and existing docs.
- Produces: complete instructions for opening Companion, browsing, installing, selecting versions, and uninstalling.

- [ ] **Step 1: Rewrite `getting-started.md` around the first five minutes.**

  Explain how to open Companion, what Projects/Kits/Installed mean, how loading and refresh work, how to choose a project, how to read the first-install disclosure, how to confirm, and when to reload SillyTavern. Include the mobile Projects screenshot with a caption about the search, route picker, filters, and project cards.

- [ ] **Step 2: Rewrite `browsing-and-installing.md` around player actions.**

  Cover search, filters, sort, cards, details, install eligibility, warnings, Checked/Newest choices, adding selected projects to a Kit, single uninstall, bulk selection, bulk uninstall review, disabled-action reasons, and browse-only presets. State that selection or Kit membership never transfers ownership.

- [ ] **Step 3: Verify the discovery guides mention every current discovery action.**

  Run:

  ```powershell
  rg -n -i 'search|filter|sort|details|install|checked|newest|warning|kit|uninstall|preset|browse-only|ownership' docs/user/getting-started.md docs/user/browsing-and-installing.md
  ```

  Expected: the output contains each required topic and no sentence promises preset installation or automatic ownership transfer.

### Task 3: Rewrite Installed, update, Kit, and safety guides

**Files:**
- Modify: `docs/user/updating-extensions.md`
- Modify: `docs/user/kits.md`
- Modify: `docs/user/safety-and-trust.md`

**Interfaces:**
- Consumes: the first-use and discovery vocabulary from Tasks 1–2 and the lifecycle/Kit rules in the source and spec.
- Produces: complete player instructions for Installed, updates, Kits, checks, trust, and ownership.

- [ ] **Step 1: Rewrite `updating-extensions.md` around the Installed route.**

  Explain Check again, Enabled/Disabled switches, Update available/Up to date/Could not check/Needs attention, Retry, native newest updates, exact scanned updates on capable hosts, forward-only protection, local changes, ownership, automatic cleanup after confirmed removal, reload, and the absence of bulk update. Include bulk uninstall and partial-failure receipt behavior with the Installed screenshot and operation screenshot.

- [ ] **Step 2: Rewrite `kits.md` around the saved/installed/active model.**

  Explain Personal vs Published Kits, Kit search and filters, Installed and Active, Partial/Missing/Drifted, creating and editing, Add to Kit from Projects or Installed, activation preflight, shared extensions, import/export, and incomplete Kit warnings. Include the Kit Builder, Kits mobile, Installed Kit, and selection screenshots.

- [ ] **Step 3: Rewrite `safety-and-trust.md` around informed choice.**

  Explain TavernKeeper evidence, the first-install unsandboxed-code disclosure, warnings, Checked/Newest tradeoffs, local changes, external ownership, and the player’s responsibility to review unfamiliar extensions. Include the disclosure and scan-result screenshots.

- [ ] **Step 4: Verify Installed, Kit, and safety claims against source-facing terms.**

  Run:

  ```powershell
  rg -n -i 'managed|external|saved|installed|active|enabled|disabled|automatic|partial|missing|drifted|check again|could not check|needs attention|retry|newest|checked|reload|bulk|receipt|tavernkeeper|guarantee|ownership|local changes|search|filter' docs/user/updating-extensions.md docs/user/kits.md docs/user/safety-and-trust.md
  ```

  Expected: all current status and boundary terms are explained in plain language and safety claims remain advisory.

### Task 4: Rewrite troubleshooting and add the glossary

**Files:**
- Modify: `docs/user/troubleshooting.md`
- Create: `docs/user/words-to-know.md`

**Interfaces:**
- Consumes: terms and recovery paths established by Tasks 1–3.
- Produces: symptom-first recovery help and a child-readable glossary linked from the public index and README.

- [ ] **Step 1: Rewrite `troubleshooting.md` by symptom.**

  Cover catalog loading, cached browsing, disabled actions, install verification, missing installed state, update statuses, local changes, safety warnings, Kit state, bulk-operation receipts, reload, and support reports. End each section with the smallest useful next action.

- [ ] **Step 2: Create `words-to-know.md`.**

  Define catalog, project, extension, preset, Kit, Personal Kit, Published Kit, managed, external, installed, active, Checked version, Newest version, TavernKeeper, cached catalog, Partial, Missing, Drifted, and receipt in one or two plain sentences each.

- [ ] **Step 3: Link the glossary from the README and player-doc index.**

  Use the label “Words you’ll see” so a young player can find it without knowing the word “glossary.”

- [ ] **Step 4: Verify the recovery and vocabulary coverage.**

  Run:

  ```powershell
  rg -n -i 'catalog|cache|disabled|install|installed|update|retry|warning|kit|receipt|reload|support' docs/user/troubleshooting.md
  rg -n -i 'catalog|project|extension|preset|kit|managed|external|installed|active|checked|newest|tavernkeeper|cached|partial|missing|drifted|receipt' docs/user/words-to-know.md
  ```

  Expected: every required recovery symptom and glossary word appears with an explanation.

### Task 5: Run documentation verification and prepare the scoped commit

**Files:**
- Inspect: `README.md`
- Inspect: `docs/user/*.md`
- Inspect: all screenshot paths in the spec

**Interfaces:**
- Consumes: all public docs written in Tasks 1–4.
- Produces: verified docs, a clean scoped diff, and a commit ready to push to `main`.

- [ ] **Step 1: Check all Markdown links point to existing files.**

  Run a PowerShell link audit that extracts relative Markdown targets from `README.md` and `docs/user/*.md`, skips external URLs and anchors, resolves each target from the file’s directory, and reports missing paths. Expected: no missing local targets.

- [ ] **Step 2: Check every referenced screenshot exists and is non-empty.**

  Run:

  ```powershell
  $images = rg -o 'tests/e2e/[^)]+\.png' README.md docs/user/*.md | ForEach-Object { ($_ -split ':',2)[1] } | Sort-Object -Unique
  $missing = @($images | Where-Object { -not (Test-Path -LiteralPath $_) })
  $empty = @($images | Where-Object { (Get-Item -LiteralPath $_).Length -le 0 })
  "MISSING=$($missing.Count)"
  $missing
  "EMPTY=$($empty.Count)"
  $empty
  ```

  Expected: `MISSING=0` and `EMPTY=0`.

- [ ] **Step 3: Scan for stale or forbidden claims.**

  Run:

  ```powershell
  rg -n -i 'safe|approved|guaranteed|automatic ownership|bulk update|background polling|preset installation|silently|always updates|never fails' README.md docs/user
  ```

  Review every match. Remove or rewrite any match that makes a misleading product claim; a factual use in a warning or negative statement is allowed.

- [ ] **Step 4: Run the repository verification command.**

  Run `npm.cmd test` from the repository root. Expected: exit code 0 with no failed tests.

- [ ] **Step 5: Inspect the final diff and status.**

  Run:

  ```powershell
  git status --short
  git diff --check
  git diff --stat
  git diff -- README.md docs/user docs/superpowers/specs/2026-08-20-player-documentation-design.md docs/superpowers/plans/2026-08-20-player-documentation.md
  ```

  Expected: only the approved documentation files and the spec/plan are changed; no whitespace errors are reported.

- [ ] **Step 6: Commit only the approved documentation files.**

  Run:

  ```powershell
  git add -- README.md docs/user docs/superpowers/specs/2026-08-20-player-documentation-design.md docs/superpowers/plans/2026-08-20-player-documentation.md
  git commit -m "docs: refresh Companion player guide"
  ```

- [ ] **Step 7: Push the verified commit to `main`.**

  Run `git push origin main`. Expected: the remote `main` branch accepts the commit without force-push or history rewrite.
