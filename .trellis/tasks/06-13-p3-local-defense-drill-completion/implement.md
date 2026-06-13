# P3 local defense drill completion implementation plan

## Behavior Slices

### Slice 1: Runner registry selects P3 local defense cases

Public interface:

- `createSingleCaseSelection(caseName)`
- `readSharedFixtureName(caseDefinitions)`
- `node scripts/screeps-server/run-suite.mjs case <case>`

Red test:

- Extend `test/system/screeps-server-suite.test.ts` to assert:
  - `defense-harmless-scout-continues` maps to fixture `defense-harmless-scout`.
  - `defense-distant-threat-defers-build` maps to fixture `defense-distant-threat`.
  - smoke suite remains unchanged.
  - mixed defense and smoke fixtures are rejected.

Green implementation:

- Add registry entries and fixture preparation routing.

### Slice 2: Harmless hostile local server case

Public interface:

- `node scripts/screeps-server/run-suite.mjs case defense-harmless-scout-continues`

Expected behavior:

- Natural tick heartbeat appears for `AliceBot`.
- Harmless MOVE-only hostile near core is observable.
- No safe mode becomes active during the watched window.
- Construction/economy continues, preferably observed through target construction site progress.

Mock boundary:

- No mocked engine behavior. Fixture seeding and status mod observation are local harness responsibilities.

Green implementation:

- Add `defense-harmless-scout` fixture.
- Add status event/wait helper for no-safe-mode plus construction progress.
- Add case assertion.

### Slice 3: Distant dangerous hostile local server case

Public interface:

- `node scripts/screeps-server/run-suite.mjs case defense-distant-threat-defers-build`

Expected behavior:

- Natural tick heartbeat appears for `AliceBot`.
- Dangerous hostile is observable away from core structures.
- No safe mode becomes active.
- Non-critical construction build is deferred or an equivalent worker fallback action is observed.

Mock boundary:

- No mocked engine behavior. Use fixture state and status stream only.

Green implementation:

- Add `defense-distant-threat` fixture.
- Reuse no-safe-mode watcher.
- Add construction-deferred or worker-fallback evidence.
- Add case assertion.

## Implementation Checklist

1. Update system registry test first.
2. Add explicit fixture constants and preparation functions for harmless scout and distant threat.
3. Extend suite runner fixture routing with named operations, not mode flags.
4. Extend status mod only as an observer:
   - hostile snapshot evidence
   - no-safe-mode evidence
   - construction progress or fallback action evidence
5. Add harness wait methods for new status conditions.
6. Add case assertions in registry.
7. Run focused system test.
8. Run each local server case explicitly.
9. Run smoke suite to ensure default local server behavior did not regress.
10. Run `pnpm check`.
11. Update docs/specs with final evidence.
12. Commit and finish Trellis task.

## Validation Commands

```powershell
node_modules\.bin\vitest.cmd run test\system\screeps-server-suite.test.ts
node scripts\screeps-server\run-suite.mjs case defense-core-threat-safe-mode
node scripts\screeps-server\run-suite.mjs case defense-harmless-scout-continues
node scripts\screeps-server\run-suite.mjs case defense-distant-threat-defers-build
node scripts\screeps-server\run-suite.mjs smoke
pnpm check
```

## Validation Results

All required validation commands passed in the local workspace:

- `node_modules\.bin\vitest.cmd run test\system\screeps-server-suite.test.ts`
- `node scripts\screeps-server\run-suite.mjs case defense-core-threat-safe-mode`
- `node scripts\screeps-server\run-suite.mjs case defense-harmless-scout-continues`
- `node scripts\screeps-server\run-suite.mjs case defense-distant-threat-defers-build`
- `node scripts\screeps-server\run-suite.mjs smoke`
- `pnpm check`

## Risky Files

- `scripts/screeps-server/fixtures/single-owned-spawn-fixture.mjs`
  - Loki fixture edits can break official server boot.
- `scripts/screeps-server/observability/status-mod.mjs`
  - Must observe only; no game semantic mutation.
- `scripts/screeps-server/framework/status-wait.mjs`
  - Watchdog failure messages must remain scenario-specific.
- `scripts/screeps-server/cases/`
  - Registry must keep suite/case/fixture boundaries explicit.
- `docs/game-state.md`
  - Must distinguish local official server evidence from PTR/live evidence.
