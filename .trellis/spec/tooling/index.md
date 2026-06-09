# Tooling Guidelines

These rules apply to package management, build config, lint config, formatter config, and project scripts.

## Pre-Development Checklist

- Check ADR 0002 before changing tools.
- Check `package.json` scripts before adding new commands.
- Use `pnpm`; do not run `npm install`, `yarn`, or `bun` in this repository.
- Verify external tool config against official docs when the behavior may have changed.

## Guides

| Guide | Applies When |
| --- | --- |
| [Package Manager](./package-manager.md) | Dependencies, lockfiles, scripts, install commands |
| [ESLint and Formatting](./eslint-formatting.md) | Lint, Prettier, flat config, import style |
| [Build and Typecheck](./build-typecheck.md) | Rollup, TypeScript projects, generated output |
| [CI and Local Hooks](./ci-hooks.md) | CI gates, pre-commit hooks, generated files, required scripts |

## Quality Check

```powershell
pnpm typecheck
pnpm lint
pnpm format
pnpm build
pnpm check
```
