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
- `test:bundle`
- `test:integration`
- `test:screeps-server`
- `test:system`
- `test:unit`
- `typecheck`

`test:bundle` is the compiled bundle smoke and may be part of `pnpm check`.

`test:screeps-server` starts the local official Screeps standalone server from generated state under `.screeps/server/`. It must run `pnpm build` itself and must stay outside default `pnpm check` until the project records enough steady-state cost and stability data.

Do not add one package script per local server e2e behavior. Local official server e2e may expose a small number of stable suite scripts such as smoke/full, while individual behavior cases belong to the runner registry under `scripts/screeps-server/`. Case selection arguments are only valid inside the local official server boundary and must not switch a command into PTR, live, deploy, rollback, credentialed, or production-mutating behavior.

Do not add scripts that require live Screeps credentials unless the command name and documentation make the production effect explicit.

Production-affecting scripts must use explicit names such as:

- `deploy:screeps`
- `verify:live:screeps`
- `rollback:screeps`

These scripts must not be called by `pnpm check`.

Do not use a flag, mode, or options bag to switch one script between local validation, live deployment, and rollback. Those are separate operations.
