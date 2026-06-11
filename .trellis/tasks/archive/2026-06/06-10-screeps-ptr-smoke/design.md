# 接入 Screeps 官方 PTR 冒烟验证 Design

## Boundaries

- Live operations keep their current ownership: `screeps.json`, `readMainScreepsConfig`, `deploy:screeps`, `verify:live:screeps`, `rollback:screeps`, and live API URL construction stay live-only.
- PTR operations get separate public commands and separate local config. A PTR command must not call the live config reader or derive its API origin from `server`.
- PTR API base is a code constant: `https://screeps.com/ptr/api/`. URL builders append endpoint paths relative to that base, for example `user/code`, so the resulting endpoint is `https://screeps.com/ptr/api/user/code`.
- API readback and natural tick evidence remain different verification levels. The automated PTR readback command proves module synchronization only; natural tick observation is recorded separately or blocked.
- Default local verification remains deterministic and offline. `pnpm check` must not read PTR credentials or connect to PTR.

## Proposed Shape

- Add an ignored PTR credential file:
  - local file: `screeps.ptr.json`
  - tracked example: `screeps.ptr.example.json`
  - fields: `branch`, `token`
- Do not include `protocol`, `server`, or base URL in the PTR config. The PTR base is fixed by the PTR API module to prevent accidental live targeting.
- Add a PTR config reader that validates `screeps.ptr.json` at the command boundary and returns a typed PTR config shape.
- Add PTR API functions for `readPtrRemoteModuleSet` and `uploadPtrRemoteModuleSet`. They should reuse only narrow shared Screeps HTTP/token response behavior when that reduces duplication without hiding the PTR/live base distinction.
- Add explicit scripts:
  - `deploy:ptr:screeps`: run local gate/build, snapshot current PTR modules, upload local `main`, read back and compare.
  - `verify:ptr:screeps`: build, read PTR `main`, compare with local `dist/main.js`, and report natural tick as not verified by this script.
  - `rollback:ptr:screeps`: restore the saved PTR snapshot and read back the restored PTR module set.

## Contracts

- PTR credential loading validates once at the command boundary. Internal PTR deploy/verify functions receive a decoded config and do not re-read config files.
- PTR config errors must name missing or invalid fields without printing token values or the full config.
- PTR upload sends only the intended local module set from `dist/main.js`.
- PTR readback failure or hash mismatch fails the command and must not be reported as a successful PTR smoke.
- PTR snapshot storage belongs under ignored `.screeps/ptr/`.
- PTR rollback uses only the saved snapshot and current PTR config branch. It does not rebuild current source and does not read live config.
- PTR rollback stops if the snapshot branch differs from the PTR config branch.
- Logs may include command name, branch, module names, hash, snapshot path, and blocked natural tick status. Logs must not include tokens, cookies, full config, or full module source.
- Documentation must state that PTR reset wipes scripts and Memory weekly, CPU subscription must be activated after reset, construction/controller rules differ from live, and PTR evidence does not replace live production verification.

## Observable Behavior

- Public interface under test: `package.json` scripts, `scripts/screeps/*` command modules, `screeps.ptr.example.json`, `.gitignore`, and documentation.
- Input/action: a user provides `screeps.ptr.json`, then runs an explicit PTR deploy or verify command.
- Expected outcome: commands target `https://screeps.com/ptr/api/user/code`, compare remote `main` with local `dist/main.js`, and print readback status without exposing secrets.
- Boundary mocked in tests: network `fetch`, filesystem temp workspace, console output.
- Boundary not mocked when manually validating PTR: official PTR API and PTR runtime tick.

## Trade-Offs

- A separate PTR config file is stricter than adding a `ptr` profile to `screeps.json`; it avoids sharing the live config reader and makes accidental live targeting easier to test.
- Keeping PTR base out of user config removes flexibility, but PTR has one official target and this task prioritizes preventing live mistakes.
- Automated natural tick verification is deferred unless existing project tooling already exposes a non-secret console/WebSocket path. The first slice should make readback exact and make blocked natural tick evidence explicit.
- PTR rollback automation adds another online-mutating command, but it gives PTR deploy the same recovery boundary expected by the deployment contract.

## Documentation Impact

- `docs/development.md`: add PTR config, commands, reset/subscription warning, readback vs natural tick distinction.
- `docs/architecture.md`: keep PTR as an explicit online smoke layer outside default check.
- `docs/game-state.md`: record PTR smoke result or blocked reason with date, branch, module/hash, and evidence level.
- `.trellis/spec/testing/test-layers.md` and operations specs may need small updates if the implemented command shape becomes project policy.

## Rollback

- Revert PTR scripts, tests, docs, example config, and `.gitignore` additions.
- Delete ignored `.screeps/ptr/` local snapshots if needed.
- No live rollback is involved because live commands and `screeps.json` are not changed.
