# Operations Guidelines

These rules apply to deployment, live Screeps verification, rollback, and credentials.

## Pre-Development Checklist

- Read `docs/development.md` and `docs/game-state.md`.
- Confirm whether the task can affect live Screeps code, branch state, credentials, or production observations.
- Run local verification before any live deployment.
- Do not perform live operations unless the task explicitly requires them and the rollback path is documented.

## Guides

| Guide | Applies When |
| --- | --- |
| [Deployment](./deployment.md) | Building, uploading, branch selection, readback, or rollback |
| [Live Verification](./live-verification.md) | Confirming behavior in Screeps production or console |
| [Rollback](./rollback.md) | Restoring the previous Screeps remote module set |
| [Credentials](./credentials.md) | Screeps tokens, local deploy config, API calls, or secret handling |

## Quality Check

Before live-affecting changes are considered complete:

```powershell
pnpm check
```

Then record either the live verification result or the blocked reason in `docs/game-state.md`.
