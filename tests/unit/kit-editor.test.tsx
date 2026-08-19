import { fireEvent, render, screen } from "@testing-library/preact";
import { afterEach, expect, it, vi } from "vitest";
import { createKitDraft, updateKitDraft } from "../../src/kits/kit-draft";
import { KitEditor } from "../../src/ui/kits/kit-editor";
import { catalogProjectFixture } from "../helpers/catalog-fixtures";

afterEach(() => document.body.replaceChildren());

it("renders the Tavernary Kit Builder without enumerating the catalog", () => {
  const alpha = catalogProjectFixture({ id: "alpha", folderName: "Alpha" });
  alpha.name = "Alpha";
  const draft = updateKitDraft(createKitDraft(), {
    title: "Writer",
    projectIds: ["alpha"],
  });
  const save = vi.fn();
  const update = vi.fn();
  render(
    <KitEditor
      draft={draft}
      projects={[alpha, catalogProjectFixture({ id: "beta", folderName: "Beta" })]}
      collapsed={false}
      onStart={vi.fn()}
      onUpdate={update}
      onCollapse={vi.fn()}
      onDiscard={vi.fn()}
      onSave={save}
    />,
  );

  expect(screen.getByRole("complementary", { name: "Kit Builder" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Kit Builder" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Create Kit" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Frontend" })).toBeVisible();
  expect(screen.getByText("SillyTavern")).toBeVisible();
  expect(screen.getByRole("heading", { name: "Extensions & Presets" })).toBeVisible();
  expect(screen.getByText("Alpha")).toBeVisible();
  expect(screen.queryByText("Beta")).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Add extensions" })).not.toBeInTheDocument();
  expect(screen.getByText("6/60 characters")).toBeVisible();
  expect(screen.getByText("1 project")).toBeVisible();

  fireEvent.click(screen.getByRole("button", { name: "Remove Alpha from Kit" }));
  expect(update).toHaveBeenCalledWith(expect.objectContaining({ projectIds: [] }));
  fireEvent.click(screen.getByRole("button", { name: "Save Kit" }));
  expect(save).toHaveBeenCalledOnce();
});

it("collapses to Tavernary's persistent desktop rail without discarding the draft", () => {
  const draft = updateKitDraft(createKitDraft(), { projectIds: ["alpha"] });
  const start = vi.fn();
  render(
    <KitEditor
      draft={draft}
      projects={[catalogProjectFixture({ id: "alpha", folderName: "Alpha" })]}
      collapsed
      onStart={start}
      onUpdate={vi.fn()}
      onCollapse={vi.fn()}
      onDiscard={vi.fn()}
      onSave={vi.fn()}
    />,
  );

  expect(screen.getByRole("complementary", { name: "Kit Builder" })).toHaveClass("collapsed");
  expect(screen.getByText("1 project in draft")).toBeVisible();
  expect(screen.queryByLabelText("Title")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Open Kit Builder" }));
  expect(start).toHaveBeenCalledOnce();
});

it("reveals draft validation only after the user tries to save", () => {
  const save = vi.fn();
  render(
    <KitEditor
      draft={createKitDraft()}
      projects={[]}
      collapsed={false}
      onStart={vi.fn()}
      onUpdate={vi.fn()}
      onCollapse={vi.fn()}
      onDiscard={vi.fn()}
      onSave={save}
    />,
  );

  expect(screen.queryByRole("list", { name: "Kit validation" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save Kit" })).toBeEnabled();

  fireEvent.click(screen.getByRole("button", { name: "Save Kit" }));

  expect(save).not.toHaveBeenCalled();
  expect(screen.getByLabelText("Title")).toHaveAccessibleDescription(
    "0/60 characters Title is required.",
  );
  expect(screen.queryByRole("list", { name: "Kit validation" })).not.toBeInTheDocument();
});
