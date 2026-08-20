import { fireEvent, render, screen } from "@testing-library/preact";
import { afterEach, expect, it, vi } from "vitest";

import { AddToKitDialog } from "../../src/ui/installed/add-to-kit-dialog";
import type { PersonalKitV1 } from "../../src/kits/kit-types";

afterEach(() => document.body.replaceChildren());

const kits: PersonalKitV1[] = [
  {
    formatVersion: 1,
    id: "writer-kit",
    title: "Writer Kit",
    description: "",
    targetFrontend: "sillytavern",
    projectIds: ["alpha"],
    createdAt: "2026-08-19T00:00:00.000Z",
    updatedAt: "2026-08-19T00:00:00.000Z",
    origin: { kind: "local" },
  },
];

it("offers a new Kit and personal Kit targets without changing ownership", () => {
  const onChoose = vi.fn();
  render(<AddToKitDialog selectedCount={2} kits={kits} onChoose={onChoose} onCancel={vi.fn()} />);

  expect(screen.getByRole("dialog", { name: "Add 2 extensions to a Kit" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Create a new Kit" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Add to Writer Kit" })).toBeVisible();
  expect(screen.getByText("Adding to a Kit does not change extension ownership.")).toBeVisible();

  fireEvent.click(screen.getByRole("button", { name: "Add to Writer Kit" }));
  expect(onChoose).toHaveBeenCalledWith({ kind: "existing", kitId: "writer-kit" });
});
