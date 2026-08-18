import { render } from "preact";

import { createDiscoveryController } from "../../src/catalog/discovery-controller";
import { createKitDiscoveryController } from "../../src/kits/kit-discovery-controller";
import { toPersonalKitInspector } from "../../src/kits/kit-view-model";
import { createShellController } from "../../src/ui/shell/shell-controller";
import { CompanionShell } from "../../src/ui/shell/companion-shell";
import "../../src/styles/companion.css";
import { catalogFixture, catalogProjectFixture } from "../helpers/catalog-fixtures";

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
    id: index === 0 ? "alpha" : `project-${index + 1}`,
    folderName: index === 0 ? "Alpha" : `Project${index + 1}`,
  });
  project.name = index === 0 ? "Alpha" : `Project ${index + 1}`;
  project.summary =
    "A catalog extension with a concise, predictable summary for responsive testing.";
  return project;
});

const snapshot = {
  state: "ready-current" as const,
  canMutate: true as const,
  checkedAt: "2026-08-18T12:00:00.000Z",
  catalog,
};
const discovery = createDiscoveryController({
  snapshot,
  inventory: { managed: [], external: [], unknown: [], missingManaged: [] },
  now: () => "2026-08-18T12:00:00.000Z",
});
const shell = createShellController({ initialRoute: "projects" });
const personalKit = {
  formatVersion: 1 as const,
  id: "018f6f42-7142-7a1f-9b52-9d3a7d548120",
  title: "Writer's Kit",
  description: "A compact set of writing extensions.",
  targetFrontend: "sillytavern" as const,
  projectIds: ["alpha"],
  createdAt: "2026-08-18T10:00:00.000Z",
  updatedAt: "2026-08-18T10:00:00.000Z",
  origin: { kind: "local" as const },
};
const kitDiscovery = createKitDiscoveryController({
  catalog,
  personal: [personalKit],
  statuses: new Map([[personalKit.id, "installed" as const]]),
});
const root = document.createElement("div");
root.className = "tavernary-companion-root";
document.querySelector("#app")?.append(root);
render(
  <CompanionShell
    controller={shell}
    discovery={discovery}
    catalogSnapshot={snapshot}
    kitDiscovery={kitDiscovery}
    kitInspectors={{
      [personalKit.id]: toPersonalKitInspector(personalKit, catalog.projects, "installed"),
    }}
    onKitAction={() => undefined}
    onOpenTavernary={() => undefined}
  />,
  root,
);
