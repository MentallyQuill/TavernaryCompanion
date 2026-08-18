import { fireEvent, render, screen } from "@testing-library/preact";
import { afterEach, expect, it, vi } from "vitest";
import { KitEditor } from "../../src/ui/kits/kit-editor";
import { catalogProjectFixture } from "../helpers/catalog-fixtures";

afterEach(() => document.body.replaceChildren());

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

it("requires an explicit discard choice before closing a dirty editor", () => {
  const cancel = vi.fn();
  render(
    <KitEditor
      projects={[catalogProjectFixture({ id: "alpha", folderName: "Alpha" })]}
      onSave={() => undefined}
      onCancel={cancel}
    />,
  );
  fireEvent.input(screen.getByLabelText("Title"), { target: { value: "Unsaved" } });

  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(cancel).not.toHaveBeenCalled();
  expect(screen.getByRole("alertdialog", { name: "Discard Kit changes?" })).toBeVisible();

  fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
  expect(cancel).toHaveBeenCalledOnce();
});
