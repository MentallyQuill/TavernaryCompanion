# Tavernary Companion

Tavernary Companion is a responsive SillyTavern extension for browsing Tavernary's living catalog, installing validated SillyTavern extensions, and saving or switching managed extension Kits. External and manually installed extensions remain outside Companion control.

## Development

Use Node.js 24 and install with `npm ci`. The local source gate is `npm run check`; Chromium interaction and responsive acceptance run with `npm run test:e2e`.

The production extension consists of exactly `manifest.json`, `dist/extension.js`, and `dist/companion.css`. Create and verify a deterministic installable archive from a clean commit with:

```powershell
npm.cmd run release:package
npm.cmd run release:verify
```

Generated archives and their SHA-256 manifests are written under the ignored `artifacts/` directory.

## Security boundary

Extensions execute inside SillyTavern and are not sandboxed. Companion displays a one-time execution disclosure and requires an explicit warning confirmation for every install involving a current or stale TavernKeeper material/high assessment. Companion never installs or removes itself and never mutates externally installed extensions.

See [the implementation roadmap](docs/implementation/README.md) for the complete behavioral contract and verification layers.
