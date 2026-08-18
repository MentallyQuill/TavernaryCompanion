import { fireEvent, render, screen } from "@testing-library/preact";
import { expect, it, vi } from "vitest";
import { KitEditor } from "../../src/ui/kits/kit-editor";
import { catalogProjectFixture } from "../helpers/catalog-fixtures";

it("creates a valid SillyTavern Kit with ordered eligible extensions", () => {
  const save = vi.fn();
  render(
    <KitEditor
      projects={[catalogProjectFixture({ id: "alpha", folderName: "Alpha" })]}
      onSave={save}
      onCancel={() => undefined}
    />,
  );
  expect(screen.getByRole("button", { name: "Save Kit" })).toBeDisabled();
  fireEvent.input(screen.getByLabelText("Title"), { target: { value: "Writer" } });
  fireEvent.click(screen.getByRole("button", { name: "Add" }));
  fireEvent.click(screen.getByRole("button", { name: "Save Kit" }));
  expect(save).toHaveBeenCalledWith(
    expect.objectContaining({
      title: "Writer",
      targetFrontend: "sillytavern",
      projectIds: ["alpha"],
    }),
  );
});
