# Package Manager

## pnpm Only

This project uses `pnpm` as the package manager.

Current references:

- `package.json` has `packageManager: "pnpm@10.20.0"`.
- `pnpm-lock.yaml` is the committed lockfile.
- `test/system/project-scripts.test.ts` checks the `pnpm@` package manager contract.
- ADR 0002 records the decision.

Forbidden:

- `npm install`
- `yarn`
- `bun install`
- `package-lock.json`
- `yarn.lock`
- `bun.lock`

## Scripts

Prefer adding explicit `pnpm` scripts for repeatable project operations. Required verification scripts are:

- `build`
- `check`
- `lint`
- `test:coverage`
- `test:e2e`
- `test:integration`
- `test:system`
- `test:unit`
- `typecheck`

Do not add scripts that require live Screeps credentials unless the command name and documentation make the production effect explicit.

Production-affecting scripts must use explicit names such as:

- `deploy:screeps`
- `verify:live:screeps`
- `rollback:screeps`

These scripts must not be called by `pnpm check`.

Do not use a flag, mode, or options bag to switch one script between local validation, live deployment, and rollback. Those are separate operations.
