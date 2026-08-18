import { render, screen } from "@testing-library/preact";
import { expect, it } from "vitest";
import { KitImportDialog } from "../../src/ui/kits/kit-import-dialog";
it("requires a validated preview before import", () => {
  render(<KitImportDialog onCancel={() => undefined} onImport={() => undefined} />);
  expect(screen.getByRole("button", { name: "Import Kit" })).toBeDisabled();
});
