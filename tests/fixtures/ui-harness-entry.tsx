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
  ];
  catalog.projects = Array.from({ length: 437 }, (_, index) => {
    const project = catalogProjectFixture({
      id: index === 0 ? "alpha" : index === 1 ? "writer-tool" : `project-${index + 1}`,
      folderName: index === 0 ? "Alpha" : index === 1 ? "WriterTool" : `Project${index + 1}`,
    });
    project.name = index === 0 ? "Alpha" : index === 1 ? "Writer Tool" : `Project ${index + 1}`;
    project.summary =
      "A catalog extension with a concise, predictable summary for responsive testing.";
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
    installedProjectIds: ["writer-tool"],
    missingProjectIds: [],
    status: "installed",
    installedAt: "2026-08-18T00:00:00.000Z",
    lastVerifiedAt: "2026-08-18T00:00:00.000Z",
  });
  const host = createFakeHost({ extensions: [extension("WriterTool", false)] });
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
    statuses: new Map([[personalKit.id, "installed"]]),
  });
  const prompts = new TrustPromptBroker();
  const lifecycle = createLifecycleCoordinator({
    host,
    store: profile,
    getSnapshot: () => catalogClient.read(),
    confirm: (prompt, project) => prompts.request(prompt, project),
  });
  const kitContext = { inventory };
  const kitExecutor = createKitExecutor({
    host,
    profile,
    kits,
    lock: lifecycle.lock,
    getCatalog: () => catalog,
    operationId: () => `browser-operation-${Date.now()}`,
    getInventoryFingerprint: () =>
      inventoryFingerprint({
        inventory: kitContext.inventory,
        managed: normalizeManagedExtensionMap(profile.read().managedExtensions),
        installedKits: kits.readInstalledStates(),
        activeKitId: kits.readActiveId(),
      }),
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
