import { render, screen } from "@testing-library/preact";
import { expect, it } from "vitest";
import { KitOperationTray } from "../../src/ui/kits/kit-operation-tray";

it("announces per-project progress and preserves prior-active failure context", () => {
  const { rerender } = render(
    <KitOperationTray
      active={{ operationId: "kit:plan", phase: "installing:alpha" }}
      receipt={null}
      onDismiss={() => undefined}
    />,
  );
  expect(screen.getByRole("status")).toHaveTextContent("Installing alpha");
  rerender(
    <KitOperationTray
      active={null}
      onDismiss={() => undefined}
      receipt={{
        formatVersion: 1,
        kind: "kit-operation",
        id: "op",
        planId: "plan",
        operation: "activate",
        kitId: "new",
        startedAt: "2026-08-18T00:00:00.000Z",
        completedAt: "2026-08-18T00:01:00.000Z",
        outcome: "failed",
        previousActiveKitId: "old",
        activeKitId: "old",
        projects: [
          {
            projectId: "alpha",
            action: "install",
            status: "failed",
            message: "No clone",
            retryable: true,
          },
        ],
        keptForOtherKits: [],
      }}
    />,
  );
  expect(screen.getByText("old remains active.")).toBeVisible();
  expect(screen.getByRole("button", { name: "Review retry" })).toBeVisible();
});
