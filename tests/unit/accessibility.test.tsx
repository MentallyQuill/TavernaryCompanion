import axe from "axe-core";
import { render } from "@testing-library/preact";
import { afterEach, expect, it } from "vitest";

import { createShellController } from "../../src/ui/shell/shell-controller";
import { CompanionShell } from "../../src/ui/shell/companion-shell";

afterEach(() => document.body.replaceChildren());

it("has no serious or critical structural accessibility violations", async () => {
  const { container } = render(
    <CompanionShell controller={createShellController({ initialRoute: "projects" })} />,
  );
  const results = await axe.run(container, {
    rules: { "color-contrast": { enabled: false } },
  });
  expect(
    results.violations.filter(({ impact }) => impact === "serious" || impact === "critical"),
  ).toEqual([]);
});
