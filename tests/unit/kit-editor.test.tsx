import { act, fireEvent, render, screen } from "@testing-library/preact";
import { useState } from "preact/hooks";
import { afterEach, expect, it, vi } from "vitest";
import { createKitDraft, updateKitDraft } from "../../src/kits/kit-draft";
import { KitEditor } from "../../src/ui/kits/kit-editor";
import { catalogProjectFixture } from "../helpers/catalog-fixtures";

afterEach(() => {
  document.body.replaceChildren();
  vi.useRealTimers();
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
});

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

  const rail = screen.getByRole("complementary", { name: "Kit Builder" });
  const open = screen.getByRole("button", { name: "Open Kit Builder" });
  expect(rail).toHaveClass("collapsed");
  expect(screen.getByText("1 project in draft")).toBeVisible();
  expect(open).not.toHaveClass("tavernary-companion-kit-builder-rail");
  expect(open).not.toHaveTextContent("Kit Builder");
  expect(screen.queryByLabelText("Title")).not.toBeInTheDocument();
  fireEvent.click(open);
  expect(start).toHaveBeenCalledOnce();
});

it("keeps the mobile Kit Builder mounted through its closing transition", () => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
  vi.useFakeTimers();
  const draft = updateKitDraft(createKitDraft(), { projectIds: ["alpha"] });

  function Harness() {
    const [collapsed, setCollapsed] = useState(true);
    return (
      <div class="tavernary-companion-root">
        <main class="tavernary-companion-shell__content">Catalog</main>
        <KitEditor
          draft={draft}
          projects={[catalogProjectFixture({ id: "alpha", folderName: "Alpha" })]}
          collapsed={collapsed}
          onStart={() => setCollapsed(false)}
          onUpdate={vi.fn()}
          onCollapse={() => setCollapsed(true)}
          onDiscard={vi.fn()}
          onSave={vi.fn()}
        />
      </div>
    );
  }

  render(<Harness />);
  fireEvent.click(screen.getByRole("button", { name: "Open Kit Builder" }));
  fireEvent.click(screen.getByRole("button", { name: "Close Kit Builder" }));

  expect(screen.getByRole("dialog", { name: "Kit Builder" })).toHaveAttribute(
    "data-motion-phase",
    "exiting",
  );
  expect(screen.getByRole("main")).toHaveProperty("inert", true);

  act(() => {
    vi.advanceTimersByTime(220);
  });
  act(() => {
    vi.advanceTimersByTime(0);
  });

  expect(screen.queryByRole("dialog", { name: "Kit Builder" })).not.toBeInTheDocument();
  const pill = screen.getByRole("button", { name: "Open Kit Builder" });
  expect(pill.querySelector('[data-icon="kit-builder"]')).not.toBeNull();
  expect(pill).toHaveFocus();
  expect((screen.getByRole("main") as HTMLElement).inert).toBeFalsy();
});

it("keeps the title focused while a controlled mobile draft updates", () => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
  const alpha = catalogProjectFixture({ id: "alpha", folderName: "Alpha" });

  function Harness() {
    const [draft, setDraft] = useState(
      updateKitDraft(createKitDraft(), { title: "Writer", projectIds: ["alpha"] }),
    );
    return (
      <div class="tavernary-companion-root">
        <main class="tavernary-companion-shell__content">Catalog</main>
        <KitEditor
          draft={draft}
          projects={[alpha]}
          collapsed={false}
          onStart={vi.fn()}
          onUpdate={setDraft}
          onCollapse={() => undefined}
          onDiscard={vi.fn()}
          onSave={vi.fn()}
        />
      </div>
    );
  }

  render(<Harness />);
  const title = screen.getByLabelText("Title");
  title.focus();
  fireEvent.input(title, { target: { value: "Writer revised" } });

  expect(title).toHaveValue("Writer revised");
  expect(title).toHaveFocus();
});

it("keeps the mobile sheet mounted while a saved draft exits", () => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
  vi.useFakeTimers();
  const alpha = catalogProjectFixture({ id: "alpha", folderName: "Alpha" });

  function Harness() {
    const [draft, setDraft] = useState<ReturnType<typeof createKitDraft> | null>(
      updateKitDraft(createKitDraft(), { title: "Writer", projectIds: ["alpha"] }),
    );
    const [collapsed, setCollapsed] = useState(false);
    return (
      <div class="tavernary-companion-root">
        <main class="tavernary-companion-shell__content">Catalog</main>
        <KitEditor
          draft={draft}
          projects={[alpha]}
          collapsed={collapsed}
          onStart={() => setCollapsed(false)}
          onUpdate={(nextDraft) => setDraft(nextDraft)}
          onCollapse={() => setCollapsed(true)}
          onDiscard={vi.fn()}
          onSave={() => {
            setDraft(null);
            setCollapsed(true);
          }}
        />
      </div>
    );
  }

  render(<Harness />);
  fireEvent.click(screen.getByRole("button", { name: "Save Kit" }));

  expect(screen.getByRole("dialog", { name: "Kit Builder" })).toHaveAttribute(
    "data-motion-phase",
    "exiting",
  );
  expect(screen.getByRole("main")).toHaveProperty("inert", true);

  act(() => {
    vi.advanceTimersByTime(220);
  });

  expect(screen.queryByRole("dialog", { name: "Kit Builder" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Open Kit Builder" })).not.toBeInTheDocument();
  expect((screen.getByRole("main") as HTMLElement).inert).toBeFalsy();
});

it("keeps the mobile sheet mounted while a discarded draft exits", () => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
  vi.useFakeTimers();

  function Harness() {
    const [draft, setDraft] = useState<ReturnType<typeof createKitDraft> | null>(
      updateKitDraft(createKitDraft(), { title: "Unsaved" }),
    );
    const [collapsed, setCollapsed] = useState(false);
    return (
      <div class="tavernary-companion-root">
        <main class="tavernary-companion-shell__content">Catalog</main>
        <KitEditor
          draft={draft}
          projects={[]}
          collapsed={collapsed}
          onStart={() => setCollapsed(false)}
          onUpdate={(nextDraft) => setDraft(nextDraft)}
          onCollapse={() => setCollapsed(true)}
          onDiscard={() => {
            setDraft(null);
            setCollapsed(true);
          }}
          onSave={vi.fn()}
        />
      </div>
    );
  }

  render(<Harness />);
  fireEvent.click(screen.getByRole("button", { name: "Discard draft" }));
  fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));

  expect(screen.getByRole("dialog", { name: "Kit Builder" })).toHaveAttribute(
    "data-motion-phase",
    "exiting",
  );
  expect(screen.getByRole("main")).toHaveProperty("inert", true);

  act(() => {
    vi.advanceTimersByTime(220);
  });

  expect(screen.queryByRole("dialog", { name: "Kit Builder" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Open Kit Builder" })).not.toBeInTheDocument();
  expect((screen.getByRole("main") as HTMLElement).inert).toBeFalsy();
});

it("uses Tavernary's focused, dismissible discard dialog", () => {
  const draft = updateKitDraft(createKitDraft(), { title: "Unsaved" });
  render(
    <KitEditor
      draft={draft}
      projects={[]}
      collapsed={false}
      onStart={vi.fn()}
      onUpdate={vi.fn()}
      onCollapse={vi.fn()}
      onDiscard={vi.fn()}
      onSave={vi.fn()}
    />,
  );

  const trigger = screen.getByRole("button", { name: "Discard draft" });
  fireEvent.click(trigger);
  const dialog = screen.getByRole("dialog", { name: "Discard Kit changes?" });
  expect(dialog).toHaveAccessibleDescription("Your unsaved changes will be lost.");
  expect(screen.getByRole("button", { name: "Keep editing" })).toHaveFocus();
  expect(screen.getByRole("button", { name: "Discard changes" })).toHaveClass(
    "tavernary-companion-kit-discard-confirm",
  );

  fireEvent.keyDown(window, { key: "Escape" });

  expect(screen.queryByRole("dialog", { name: "Discard Kit changes?" })).not.toBeInTheDocument();
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
