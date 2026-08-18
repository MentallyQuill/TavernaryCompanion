import { render } from "preact";

import { createDiscoveryController } from "../../src/catalog/discovery-controller";
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
const root = document.createElement("div");
root.className = "tavernary-companion-root";
document.querySelector("#app")?.append(root);
render(
  <CompanionShell
    controller={shell}
    discovery={discovery}
    catalogSnapshot={snapshot}
    onOpenTavernary={() => undefined}
  />,
  root,
);
