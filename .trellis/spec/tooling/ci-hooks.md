# CI and Local Hooks

## CI Contract

Current status: no `.github/workflows/` or `.husky/` setup is part of the project contract yet.

When CI is added, it must run:

```powershell
corepack enable
pnpm install --frozen-lockfile
pnpm check
```

CI must not require live Screeps credentials for ordinary pull requests.

Live Screeps verification belongs in an explicit protected workflow or manual operation, not the default CI gate.

Recommended default CI path:

```text
.github/workflows/check.yml
```

Recommended triggers:

- `pull_request`
- `push` to the main integration branch

CI failures block task completion unless the failure is an external platform issue and the blocker is recorded.

## Local Hooks

Pre-commit hooks are optional until explicitly configured. If added, they may run lightweight checks such as:

```powershell
pnpm lint
pnpm format
pnpm typecheck
```

Do not run live deployment or live e2e from pre-commit hooks.

If a local hook tool is adopted, record the tool and scope in an ADR. Hooks must not write production state.

## Generated Files

`dist/` is generated and ignored. CI and local verification should build it as needed.

Do not commit generated bundles unless an ADR changes the deployment model.

## Script Ownership

Any new script must have:

- A specific name.
- A documented purpose in `docs/development.md`.
- A system test when it becomes part of the required project contract.
