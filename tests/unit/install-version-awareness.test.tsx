import { cleanup, fireEvent, render, screen } from "@testing-library/preact";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PreparedInstallSelection } from "../../src/lifecycle/lifecycle-coordinator";
import { InstallVersionAwareness } from "../../src/ui/lifecycle/install-version-awareness";

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
});

function selection(): PreparedInstallSelection {
  const requestedSha = "b".repeat(40);
  return {
    target: { kind: "newest", requestedSha, resolvedAt: "2026-08-19T12:00:00.000Z" },
    binding: {
      projectId: "alpha",
      catalogGeneratedAt: "2026-08-19T10:00:00.000Z",
      install: {
        kind: "sillytavern-extension-git",
        repositoryUrl: "https://example.com/alpha.git",
        branch: "main",
        manifestPath: "manifest.json",
        folderName: "alpha",
      },
      report: null,
      target: { kind: "newest", requestedSha },
    },
  };
}

function anchor(): HTMLButtonElement {
  const button = document.createElement("button");
  button.textContent = "Install Alpha";
  document.body.append(button);
  return button;
}

describe("InstallVersionAwareness", () => {
  it("gently explains an exact scan mismatch before installing latest", () => {
    const onConfirm = vi.fn();
    const target = selection();
    const installButton = anchor();
    render(
      <InstallVersionAwareness
        projectId="alpha"
        projectName="Alpha"
        anchor={installButton}
        selection={target}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Install latest from creator?" })).toBeVisible();
    expect(screen.getByText("This installs the creator’s latest version.")).toBeVisible();
    expect(screen.getByText("TavernKeeper has not scanned this exact version.")).toBeVisible();
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("dialog")).not.toHaveTextContent(/unsafe|danger|risk|guarantee/i);
    expect(screen.getByRole("button", { name: "Install latest" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Install latest" }));
    expect(onConfirm).toHaveBeenCalledWith(target);
    expect(installButton).toHaveFocus();
  });

  it("contains keyboard focus within the awareness dialog", () => {
    render(
      <InstallVersionAwareness
        projectId="alpha"
        projectName="Alpha"
        anchor={anchor()}
        selection={selection()}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const cancel = screen.getByRole("button", { name: "Cancel" });
    const confirm = screen.getByRole("button", { name: "Install latest" });

    fireEvent.keyDown(document, { key: "Tab" });
    expect(cancel).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(confirm).toHaveFocus();
  });

  it("cancels on Escape and restores focus", () => {
    const installButton = anchor();
    const onCancel = vi.fn();
    render(
      <InstallVersionAwareness
        projectId="alpha"
        projectName="Alpha"
        anchor={installButton}
        selection={selection()}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledOnce();
    expect(installButton).toHaveFocus();
  });

  it("cancels from the explicit button and backdrop", () => {
    const firstCancel = vi.fn();
    const first = render(
      <InstallVersionAwareness
        projectId="alpha"
        projectName="Alpha"
        anchor={anchor()}
        selection={selection()}
        onConfirm={vi.fn()}
        onCancel={firstCancel}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(firstCancel).toHaveBeenCalledOnce();
    first.unmount();

    const backdropCancel = vi.fn();
    render(
      <InstallVersionAwareness
        projectId="beta"
        projectName="Beta"
        anchor={anchor()}
        selection={selection()}
        onConfirm={vi.fn()}
        onCancel={backdropCancel}
      />,
    );
    const dialog = screen.getByRole("dialog", { name: "Install latest from creator?" });
    fireEvent.pointerDown(dialog.parentElement!);
    expect(backdropCancel).toHaveBeenCalledOnce();
  });
});
