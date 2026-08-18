import { useMemo, useState } from "preact/hooks";
import type { CatalogProject } from "../../catalog/catalog-core";
import {
  addDraftMember,
  createKitDraft,
  moveDraftMember,
  updateKitDraft,
  type KitDraftState,
} from "../../kits/kit-draft";
import type { PersonalKitV1 } from "../../kits/kit-types";
import { DialogFrame } from "../lifecycle/dialog-frame";
import { KitMemberPicker } from "./kit-member-picker";
import { KitMemberRow } from "./kit-member-row";

export function KitEditor({
  source,
  projects,
  onSave,
  onCancel,
}: {
  source?: PersonalKitV1;
  projects: readonly CatalogProject[];
  onSave(draft: KitDraftState): void;
  onCancel(): void;
}): preact.JSX.Element {
  const [draft, setDraft] = useState(() => createKitDraft(source));
  const byId = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);
  return (
    <DialogFrame label={source ? "Edit personal Kit" : "New personal Kit"} onCancel={onCancel}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!draft.issues.length) onSave(draft);
        }}
      >
        <label>
          Title
          <input
            value={draft.title}
            onInput={(event) =>
              setDraft(updateKitDraft(draft, { title: event.currentTarget.value }))
            }
          />
        </label>
        <label>
          Description
          <textarea
            value={draft.description}
            onInput={(event) =>
              setDraft(updateKitDraft(draft, { description: event.currentTarget.value }))
            }
          />
        </label>
        <p>
          Frontend: <strong>SillyTavern</strong>
        </p>
        <section>
          <h3>Kit members</h3>
          {draft.projectIds.length ? (
            <ol>
              {draft.projectIds.map((id, index) => (
                <KitMemberRow
                  key={id}
                  id={id}
                  name={byId.get(id)?.name ?? id}
                  first={index === 0}
                  last={index === draft.projectIds.length - 1}
                  onMove={(direction) => setDraft(moveDraftMember(draft, id, direction))}
                  onRemove={() =>
                    setDraft(
                      updateKitDraft(draft, {
                        projectIds: draft.projectIds.filter((candidate) => candidate !== id),
                      }),
                    )
                  }
                />
              ))}
            </ol>
          ) : (
            <p>No extensions selected yet.</p>
          )}
        </section>
        <KitMemberPicker
          projects={projects}
          selected={draft.projectIds}
          onAdd={(id) => setDraft(addDraftMember(draft, id))}
        />
        {draft.issues.length ? (
          <ul role="alert">
            {draft.issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        ) : null}
        <footer>
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" disabled={draft.issues.length > 0}>
            Save Kit
          </button>
        </footer>
      </form>
    </DialogFrame>
  );
}
