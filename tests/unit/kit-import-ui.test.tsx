import { fireEvent, render, screen, waitFor } from "@testing-library/preact";
import { afterEach, expect, it } from "vitest";
import { KitImportDialog } from "../../src/ui/kits/kit-import-dialog";
import { catalogProjectFixture } from "../helpers/catalog-fixtures";

afterEach(() => document.body.replaceChildren());

it("requires a validated preview before import", () => {
  render(<KitImportDialog onCancel={() => undefined} onImport={() => undefined} />);
  expect(screen.getByRole("button", { name: "Import Kit" })).toBeDisabled();
});

it("previews actionable, context-only, and unavailable members", async () => {
  const preset = catalogProjectFixture({ id: "preset", folderName: null, kind: "preset" });
  render(
    <KitImportDialog
      projects={[catalogProjectFixture({ id: "alpha", folderName: "Alpha" }), preset]}
      onCancel={() => undefined}
      onImport={() => undefined}
    />,
  );
  const file = new File(
    [
      JSON.stringify({
        formatVersion: 1,
        id: "018f6f42-7142-7a1f-9b52-9d3a7d548120",
        title: "Writer",
        description: "",
        targetFrontend: "sillytavern",
        projectIds: ["alpha", "preset", "missing"],
        createdAt: "2026-08-18T00:00:00.000Z",
        updatedAt: "2026-08-18T00:00:00.000Z",
        origin: { kind: "local" },
      }),
    ],
    "writer.tavernary-kit.json",
    { type: "application/json" },
  );

  fireEvent.change(screen.getByLabelText("Kit JSON file"), { target: { files: [file] } });

  await waitFor(() => expect(screen.getByRole("heading", { name: "Writer" })).toBeVisible());
  expect(screen.getByText("Actionable extensions").nextElementSibling).toHaveTextContent("1");
  expect(screen.getByText("Context-only projects").nextElementSibling).toHaveTextContent("1");
  expect(screen.getByText("Unavailable").nextElementSibling).toHaveTextContent("1");
});
