# 补部署验证回滚脚本 Implementation

## Checklist

- [x] Add tests for package scripts and ignored rollback snapshot path.
- [x] Add Node modules for config loading, module hashing, Screeps API readback/upload, and rollback snapshots.
- [x] Add three explicit command entrypoints for deploy, verify live readback, and rollback.
- [x] Wire `package.json` scripts so deploy runs local verification and rebuilds immediately before upload.
- [x] Update `docs/development.md`, `docs/game-state.md`, and `screeps.example.json`.
- [x] Run focused tests, then `pnpm typecheck`, `pnpm lint`, `pnpm test:system`, and `pnpm check`.
- [x] Commit this task independently.

## Validation Commands

```powershell
pnpm test:system
pnpm test:unit
pnpm typecheck
pnpm lint
pnpm check
```

## Rollback Points

- If script implementation fails before any live deploy, revert only this task's local files.
- If a live deploy is later attempted and readback mismatches, run `pnpm rollback:screeps` before further code changes.
- Do not run live rollback unless a snapshot exists and the configured branch matches.
