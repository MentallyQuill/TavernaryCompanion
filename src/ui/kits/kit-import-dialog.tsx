import { useState } from "preact/hooks";
import { parseKitText } from "../../kits/kit-portability";
import type { PersonalKitV1 } from "../../kits/kit-types";
import type { CatalogProject } from "../../catalog/catalog-core";
import { DialogFrame } from "../lifecycle/dialog-frame";

export function KitImportDialog({
  onCancel,
  onImport,
  projects = [],
}: {
  onCancel(): void;
  onImport(kit: PersonalKitV1): void;
  projects?: readonly CatalogProject[];
}): preact.JSX.Element {
  const [preview, setPreview] = useState<PersonalKitV1 | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = async (file: File | undefined) => {
    if (!file) return;
    try {
      setPreview(parseKitText(await file.text()));
      setError(null);
    } catch (cause) {
      setPreview(null);
      setError(cause instanceof Error ? cause.message : "Kit file is invalid.");
    }
  };
  return (
    <DialogFrame label="Import personal Kit" onCancel={onCancel}>
      <h2>Import personal Kit</h2>
      <label>
        Kit JSON file
        <input
          type="file"
          accept=".json,application/json"
          onChange={(event) => void load(event.currentTarget.files?.[0])}
        />
      </label>
      {error ? <p role="alert">{error}</p> : null}
      {preview ? (
        <section>
          <h3>{preview.title}</h3>
          <p>{preview.description}</p>
          <dl>
            <dt>Frontend</dt>
            <dd>SillyTavern</dd>
            <dt>Members</dt>
            <dd>{preview.projectIds.length}</dd>
            <dt>Available</dt>
            <dd>{previewCounts(preview, projects).available}</dd>
            <dt>Actionable extensions</dt>
            <dd>{previewCounts(preview, projects).actionable}</dd>
            <dt>Context-only projects</dt>
            <dd>{previewCounts(preview, projects).context}</dd>
            <dt>Unavailable</dt>
            <dd>{previewCounts(preview, projects).unavailable}</dd>
            <dt>Origin</dt>
            <dd>{preview.origin.kind}</dd>
          </dl>
        </section>
      ) : null}
      <footer>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" disabled={!preview} onClick={() => preview && onImport(preview)}>
          Import Kit
        </button>
      </footer>
    </DialogFrame>
  );
}

function previewCounts(kit: PersonalKitV1, projects: readonly CatalogProject[]) {
  const byId = new Map(projects.map((project) => [project.id, project]));
  let actionable = 0;
  let context = 0;
  let unavailable = 0;
  for (const id of kit.projectIds) {
    const project = byId.get(id);
    if (!project) {
      unavailable += 1;
    } else if (
      project.kind === "extension" &&
      project.frontends.some((frontend) => frontend.id === "sillytavern") &&
      project.install?.kind === "sillytavern-extension-git"
    ) {
      actionable += 1;
    } else {
      context += 1;
    }
  }
  return {
    available: actionable + context,
    actionable,
    context,
    unavailable,
  };
}
