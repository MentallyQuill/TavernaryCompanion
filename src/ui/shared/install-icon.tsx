const INSTALL_PATH =
  "M9 2v2H5l-.001 10h14L19 4h-4V2h5a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h5zm9.999 14h-14L5 20h14l-.001-4zM17 17v2h-2v-2h2zM13 2v5h3l-4 4-4-4h3V2h2z";

const UNINSTALL_PATH =
  "M8 2v2H5l-.001 10h14L19 4h-3V2h4a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h4zm10.999 14h-14L5 20h14l-.001-4zM17 17v2h-2v-2h2zM12 2l4 4h-3v5h-2V6H8l4-4z";

export function InstallIcon(): preact.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      data-icon="install"
      data-testid="install-icon"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d={INSTALL_PATH} />
    </svg>
  );
}

export function UninstallIcon(): preact.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      data-icon="uninstall"
      data-testid="uninstall-icon"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d={UNINSTALL_PATH} />
    </svg>
  );
}
