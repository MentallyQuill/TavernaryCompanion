import { useEffect, useState } from "preact/hooks";

import type { ShellController } from "./shell-controller";
import { ShellHeader } from "./shell-header";
import { RouteTabs } from "./route-tabs";

interface ShellProjectStub {
  id: string;
  name: string;
}

interface CompanionShellProps {
  controller: ShellController;
  projects?: ShellProjectStub[];
  onRequestClose?: () => void;
}

export function CompanionShell({
  controller,
  projects = [],
  onRequestClose,
}: CompanionShellProps): preact.JSX.Element {
  const [state, setState] = useState(controller.read());

  useEffect(() => controller.subscribe(setState), [controller]);
  useEffect(() => {
    const onPopState = () => restoreAfterBack(controller);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [controller]);

  const detail = state.detailStack.at(-1);
  return (
    <section
      class="tavernary-companion-shell"
      aria-labelledby="tavernary-companion-heading"
      data-testid="companion-shell"
    >
      <ShellHeader onRequestClose={onRequestClose} />
      <RouteTabs route={state.route} onNavigate={(route) => controller.navigate(route)} />
      <main class="tavernary-companion-shell__content">
        <section
          aria-labelledby="tavernary-companion-projects-heading"
          hidden={state.route !== "projects" || Boolean(detail)}
        >
          <h2 id="tavernary-companion-projects-heading">Projects</h2>
          {projects.map((project) => {
            const focusKey = `project-${project.id}`;
            return (
              <button
                type="button"
                data-focus-key={focusKey}
                aria-label={`View ${project.name}`}
                onClick={() => controller.openDetail({ kind: "project", id: project.id, focusKey })}
              >
                {project.name}
              </button>
            );
          })}
        </section>
        <section
          aria-labelledby="tavernary-companion-kits-heading"
          hidden={state.route !== "kits" || Boolean(detail)}
        >
          <h2 id="tavernary-companion-kits-heading">Kits</h2>
        </section>
        <section
          aria-labelledby="tavernary-companion-installed-heading"
          hidden={state.route !== "installed" || Boolean(detail)}
        >
          <h2 id="tavernary-companion-installed-heading">Installed extensions</h2>
        </section>
        {detail ? (
          <section aria-label={`${detail.kind} detail`}>
            <button type="button" onClick={() => restoreAfterBack(controller)}>
              Back
            </button>
            <h2>{projectName(projects, detail.id)}</h2>
          </section>
        ) : null}
      </main>
    </section>
  );
}

function restoreAfterBack(controller: ShellController): void {
  const result = controller.back();
  if (!result.handled || !result.focusKey) return;
  queueMicrotask(() => {
    const candidates = document.querySelectorAll<HTMLElement>("[data-focus-key]");
    for (const candidate of candidates) {
      if (candidate.dataset.focusKey === result.focusKey) {
        candidate.focus();
        return;
      }
    }
  });
}

function projectName(projects: ShellProjectStub[], id: string): string {
  return projects.find((project) => project.id === id)?.name ?? id;
}
