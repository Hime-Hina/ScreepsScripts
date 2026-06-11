# Deployment

## Scenario: Screeps Code Deployment

### 1. Scope / Trigger

This contract applies when a task changes any of:

- `dist/main.js` deployment behavior.
- Screeps branch selection.
- Upload or sync scripts.
- API readback checks.
- Rollback workflow.

### 2. Signatures

Current local deployment shape:

- Source entrypoint: `src/main.ts`
- Build command: `pnpm build`
- Local output: `dist/main.js`
- Full local gate: `pnpm check`
- Local credential file: `screeps.json`
- Example credential file: `screeps.example.json`

Future deployment commands must use explicit names such as:

```text
deploy:screeps
deploy:ptr:screeps
verify:live:screeps
verify:ptr:screeps
rollback:screeps
rollback:ptr:screeps
```

Do not hide live operations behind generic names such as `sync`, `push`, or `release`.

### 3. Contracts

Deployment contract:

- Build from TypeScript source.
- Rebuild `dist/main.js` immediately before deployment.
- Capture the current remote module set before replacement.
- Upload only the intended branch and module.
- Read the deployed code back through Screeps API or IDE state.
- Compare the remote module with local `dist/main.js` or a recorded hash.
- Record branch, module, timestamp, and hash in `docs/game-state.md`.

Remote module-set contract:

- Decide whether unexpected remote modules are preserved, removed, or blocked for review before upload.
- Record that decision when remote modules such as `main.js.map` exist.
- Do not silently clean or preserve remote modules without documenting ownership.

Rollback contract:

- Record the previous deployed module or branch before replacement.
- A rollback operation must be able to restore that previous code without rebuilding current source.
- If rollback cannot be automated yet, document the exact manual restore path before deployment.

PTR deployment contract:

- PTR operations use `screeps.ptr.json`, not `screeps.json` or the live `main` profile.
- PTR API base is fixed in code as `https://screeps.com/ptr/api/`.
- PTR code read/write requests target `https://screeps.com/ptr/api/user/code`.
- PTR deploy snapshots the prior PTR module set under `.screeps/ptr/`, uploads only local `dist/main.js` as `main`, then readback verifies.
- PTR verify compares PTR remote `main` with local `dist/main.js` and reports natural tick as not verified by that script.
- PTR rollback restores `.screeps/ptr/latest.json`, stops on missing snapshot or branch mismatch, and readback verifies the restored module set.
- PTR API readback is not natural tick evidence. PTR reset, missing credentials, or inactive PTR CPU subscription must be recorded as blocked when they prevent online validation.

### 4. Validation & Error Matrix

| Condition | Required Behavior |
| --- | --- |
| `pnpm check` fails | Do not deploy |
| `dist/main.js` missing or stale | Run `pnpm build` and rerun relevant tests |
| Branch is not confirmed | Stop and update `docs/game-state.md` with blocked status |
| Readback differs from local artifact | Treat deployment as failed; do not mark live verification complete |
| Token missing or invalid | Stop; do not print token contents |
| Rollback artifact missing | Stop unless the user explicitly accepts manual risk for this task |
| Unexpected remote module exists | Preserve, remove, or block through an explicit recorded decision |

### 5. Good/Base/Bad Cases

- Good: `pnpm check` passes, `dist/main.js` is uploaded to confirmed branch, API readback hash matches, live observation is recorded.
- Base: bundle smoke and local server e2e pass but no live credentials are available; record blocked live verification.
- Bad: code is uploaded through the UI without recording branch, hash, previous state, or rollback path.

### 6. Tests Required

Deployment tooling must include:

- Unit tests for config parsing and branch/module selection.
- System tests for required scripts and ignored credentials.
- Bundle smoke tests that execute `dist/main.js`.
- Local server e2e when deployment-affecting behavior must be observed inside the real standalone Screeps engine.
- Live smoke only when credentials, branch, rollback, and expected observable effect are documented.

### 7. Wrong vs Correct

#### Wrong

```text
pnpm build
# Manually paste dist/main.js into an unknown Screeps branch.
```

#### Correct

```text
pnpm check
pnpm build
# Upload to the documented branch, read back the module, compare hash, record result.
```

## Operation Boundaries

If browser IDE save, HTTP API deploy, and future GitHub sync are all supported, expose them as separate operations. Do not use a mode, flag, or options bag to switch between live deployment mechanisms.
