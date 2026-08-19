import { render } from "preact";

import type { CatalogClient, CatalogSnapshot } from "../../src/catalog/catalog-client";
import { createDiscoveryController } from "../../src/catalog/discovery-controller";
import { reconcileInventory } from "../../src/inventory/inventory-reconciler";
import { normalizeManagedExtensionMap } from "../../src/inventory/managed-registry";
import { createKitDiscoveryController } from "../../src/kits/kit-discovery-controller";
import { createKitExecutor } from "../../src/kits/kit-executor";
import { inventoryFingerprint } from "../../src/kits/kit-planner";
import { KitStore } from "../../src/kits/kit-store";
import { fingerprintKitTopology } from "../../src/kits/kit-validation";
import { createLifecycleCoordinator } from "../../src/lifecycle/lifecycle-coordinator";
import { TrustPromptBroker } from "../../src/lifecycle/trust-prompt-broker";
import { ProfileStore } from "../../src/state/profile-store";
import { CompanionPopupHost, type PopupRuntime } from "../../src/ui/popup-host";
import "../../src/styles/companion.css";
import { catalogFixture, catalogProjectFixture } from "../helpers/catalog-fixtures";
import { createFakeHost } from "../helpers/fake-host";
import { extension } from "../helpers/kit-executor-fixture";

async function main() {
  const scenario = new URL(window.location.href).searchParams.get("scenario");
  const catalog = catalogFixture("2026-08-18T10:00:00.000Z");
  catalog.tagVocabulary = [
    {
      id: "memory",
      label: "Memory",
      description: "Memory and retrieval",
      facet: "goal",
      aliases: [],
      applicable_kinds: ["extension"],
    },
    {
      id: "modular",
      label: "Modular",
      description: "Modular project architecture",
      facet: "trait",
      aliases: [],
      applicable_kinds: ["extension", "preset", "frontend"],
    },
  ];
  catalog.projects = Array.from({ length: 438 }, (_, index) => {
    const kind = index === 2 ? "preset" : index === 3 ? "frontend" : "extension";
    const project = catalogProjectFixture({
      id:
        index === 0
          ? "alpha"
          : index === 1
            ? "writer-tool"
            : index === 2
              ? "beta-preset"
              : index === 3
                ? "gamma-frontend"
                : `project-${index + 1}`,
      folderName:
        index === 0
          ? "Alpha"
          : index === 1
            ? "WriterTool"
            : index === 2 || index === 3
              ? null
              : `Project${index + 1}`,
      kind,
    });
    project.name =
      index === 0
        ? "Alpha"
        : index === 1
          ? "Writer Tool"
          : index === 2
            ? "Beta Preset"
            : index === 3
              ? "Gamma Frontend"
              : `Project ${index + 1}`;
    project.summary =
      "A catalog extension with a concise, predictable summary for responsive testing.";
    project.frontends = [{ id: "sillytavern", label: "SillyTavern", description: "SillyTavern" }];
    project.search.kind = [kind];
    project.activity.weeklyActivity = [
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      true,
    ];
    if (index === 0) {
      project.primaryFunction = "memory-retrieval";
      project.search.primaryFunction = ["memory-retrieval"];
      project.tags = [
        { id: "memory", label: "Memory", description: "Memory tools", facet: "goal" },
        { id: "modular", label: "Modular", description: "Modular project", facet: "trait" },
      ];
      project.search.tags = ["memory", "modular"];
      project.activity.latestSourceActivityAt = "2026-08-18T00:00:00.000Z";
      project.activity.activeWeeks12 = 6;
      project.activity.weeklyActivity = [
        false,
        true,
        false,
        true,
        false,
        true,
        false,
        true,
        false,
        true,
        false,
        true,
      ];
      project.community = { stars: 8, forks: 2, watchers: 1, aggregate: 11 };
      project.repositorySizeKb = 2048;
      project.attribution = {
        owner: { provider: "github", login: "tavernary-author" },
        contributors: [],
        humanContributorCount: 1,
        status: "current",
      };
      project.tavernKeeper = {
        state: "gray",
        riskLevel: null,
        freshness: "unassessed",
        currentSha: "a".repeat(40),
        report: null,
        history: [],
        historyUrl: null,
      };
    } else if (index === 2) {
      project.primaryFunction = "preset";
      project.search.primaryFunction = ["preset"];
      project.tags = [
        { id: "modular", label: "Modular", description: "Modular project", facet: "trait" },
      ];
      project.search.tags = ["modular"];
      project.preset = {
        version: "1.2.0",
        publishedAt: "2026-08-17T12:00:00.000Z",
        artifactSizeBytes: 2048,
        modelFamilies: [
          { id: "model-agnostic", label: "Model-Agnostic", description: "Any model" },
        ],
        completionFormats: [
          {
            id: "chat-completion",
            label: "Chat Completion",
            description: "Chat completion",
          },
        ],
      };
    } else if (index === 3) {
      project.primaryFunction = "frontend";
      project.search.primaryFunction = ["frontend"];
      project.tags = [
        { id: "modular", label: "Modular", description: "Modular project", facet: "trait" },
      ];
      project.search.tags = ["modular"];
    }
    return project;
  });

  const snapshot: CatalogSnapshot = {
    state: "ready-current",
    canMutate: true,
    checkedAt: "2026-08-18T12:00:00.000Z",
    catalog,
  };
  const catalogClient = staticCatalogClient(snapshot);
  const profile = new ProfileStore({
    extensionSettings: {},
    saveSettingsDebounced: () => undefined,
  });
  let kitSequence = 1;
  const kits = new KitStore(profile, {
    uuid: () => `018f6f42-7142-7a1f-9b52-${String(kitSequence++).padStart(12, "0")}`,
    now: () => new Date().toISOString(),
  });
  const personalKit = await kits.create({
    title: "Writer's Kit",
    description: "A compact set of writing extensions.",
    projectIds: ["writer-tool"],
  });
  const sharedKit =
    scenario === "shared"
      ? await kits.create({
          title: "Shared Writer Kit",
          description: "A second Kit sharing the same managed extension.",
          projectIds: ["writer-tool"],
        })
      : null;
  await profile.update((draft) => {
    draft.managedExtensions["writer-tool"] = {
      projectId: "writer-tool",
      internalName: "third-party/WriterTool",
      folderName: "WriterTool",
      installedAt: "2026-08-18T00:00:00.000Z",
      installedBy: "kit",
    };
  });
  await kits.recordInstalledState({
    kitId: personalKit.id,
    definitionFingerprint: await fingerprintKitTopology(personalKit.projectIds),
    definitionProjectIds: personalKit.projectIds,
    installedProjectIds: ["writer-tool"],
    missingProjectIds: [],
    status: "installed",
    installedAt: "2026-08-18T00:00:00.000Z",
    lastVerifiedAt: "2026-08-18T00:00:00.000Z",
  });
  if (sharedKit) {
    await kits.recordInstalledState({
      kitId: sharedKit.id,
      definitionFingerprint: await fingerprintKitTopology(sharedKit.projectIds),
      definitionProjectIds: sharedKit.projectIds,
      installedProjectIds: ["writer-tool"],
      missingProjectIds: [],
      status: "installed",
      installedAt: "2026-08-18T00:00:00.000Z",
      lastVerifiedAt: "2026-08-18T00:00:00.000Z",
    });
  }
  const host = createFakeHost({
    extensions: [extension("WriterTool", false)],
    failures: scenario === "failure" ? { enable: new Error("Enable failed") } : undefined,
  });
  const inventory = reconcileInventory({
    projects: catalog.projects,
    hostExtensions: await host.discover(),
    managed: normalizeManagedExtensionMap(profile.read().managedExtensions),
  });
  const discovery = createDiscoveryController({
    snapshot,
    inventory,
    now: () => "2026-08-18T12:00:00.000Z",
  });
  const kitDiscovery = createKitDiscoveryController({
    catalog,
    personal: kits.readDefinitions(),
    statuses: new Map([
      [personalKit.id, "installed"],
      ...(sharedKit ? ([[sharedKit.id, "installed"]] as const) : []),
    ]),
  });
  const prompts = new TrustPromptBroker();
  const lifecycle = createLifecycleCoordinator({
    host,
    store: profile,
    getSnapshot: () => catalogClient.read(),
    confirm: (prompt, project) => prompts.request(prompt, project),
  });
  const kitContext = { inventory };
  if (scenario === "interrupted") {
    await profile.update((draft) => {
      draft.kitOperationJournal = {
        formatVersion: 1,
        operationId: "interrupted-browser-operation",
        planId: "interrupted-plan",
        operation: "activate",
        kitId: personalKit.id,
        phase: "activating",
        startedAt: "2026-08-18T00:00:00.000Z",
        currentProjectId: "writer-tool",
        completedProjects: [],
        preOperationActiveKitId: null,
        requiredProjectIds: ["writer-tool"],
      };
    });
  }
  const kitExecutor = createKitExecutor({
    host,
    profile,
    kits,
    lock: lifecycle.lock,
    getCatalog: () => catalog,
    operationId: () => `browser-operation-${Date.now()}`,
    getInventoryFingerprint: async () => {
      const freshInventory = reconcileInventory({
        projects: catalog.projects,
        hostExtensions: await host.discover(),
        managed: normalizeManagedExtensionMap(profile.read().managedExtensions),
      });
      kitContext.inventory = freshInventory;
      discovery.setInventory(freshInventory);
      return inventoryFingerprint({
        inventory: freshInventory,
        managed: normalizeManagedExtensionMap(profile.read().managedExtensions),
        installedKits: kits.readInstalledStates(),
        activeKitId: kits.readActiveId(),
      });
    },
  });
  const runtime: PopupRuntime = {
    catalog: catalogClient,
    discovery,
    lifecycle,
    prompts,
    kits,
    kitDiscovery,
    kitExecutor,
    kitContext,
  };

  const root = document.createElement("div");
  root.className = "tavernary-companion-root";
  document.querySelector("#app")?.append(root);
  render(<CompanionPopupHost store={profile} host={host} runtime={runtime} />, root);
}

function staticCatalogClient(snapshot: CatalogSnapshot): CatalogClient {
  const listeners = new Set<(next: CatalogSnapshot) => void>();
  const publish = () => {
    for (const listener of listeners) listener(snapshot);
  };
  return {
    async open() {
      publish();
    },
    async refresh() {
      publish();
    },
    async onFocus() {},
    read: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

void main();
