# P3 local defense drill completion design

## Boundary

This task extends only the local official server e2e boundary:

```text
scripts/screeps-server/run-suite.mjs
  -> case registry
  -> one fixture per defense scenario
  -> local official screeps@4.3.0 server
  -> run-scoped status mod
  -> status.jsonl evidence
```

It does not read `screeps.json`, `screeps.ptr.json`, browser cookies, live API, or PTR API. It does not deploy code or mutate official servers.

## Scenario Set

The local P3 drill should cover three existing P3 behaviors:

1. `defense-core-threat-safe-mode`
   - Fixture: `defense-core-threat`
   - Hostile: dangerous hostile near `Spawn1`
   - Expected: natural tick heartbeat, safe mode intent/active evidence

2. `defense-harmless-scout-continues`
   - Fixture: `defense-harmless-scout`
   - Hostile: harmless MOVE-only hostile near `Spawn1`
   - Expected: natural tick heartbeat, no safe mode active, construction/economy continues

3. `defense-distant-threat-defers-build`
   - Fixture: `defense-distant-threat`
   - Hostile: dangerous hostile away from core structures
   - Expected: natural tick heartbeat, no safe mode active, non-critical construction is deferred or fallback upgrade/refill action is observed

Each scenario is a separate case plus fixture. Do not add a shared options bag, string mode, bool flag, or a package script per scenario.

## Fixture Shape

Use the existing `single-owned-spawn` seed as the base for all defense fixtures:

- active user: `AliceBot`
- room: `W1N9`
- spawn: `Spawn1`
- user code replaced with current `dist/main.js`
- controller owned and safe-mode fields configured by the fixture

Add scenario-specific room objects:

- hostile creep id/name/user/body/position
- optional extension construction site when the scenario must prove build continues or is deferred
- optional worker energy state only when the case needs observable build/upgrade behavior

Fixture helpers may share base Loki rewrite steps, but the public prepared-run operations should stay named after scenario concepts, such as `prepareDefenseHarmlessScoutRun()` and `prepareDefenseDistantThreatRun()`.

## Status Evidence

The current status mod already records:

- `player-heartbeat`
- `safe-mode-intent`
- `safe-mode-accepted`
- `safe-mode-active`

This task may add local-only defense status events if needed:

- `defense-hostile-observed`: records hostile id, body, position, and controller/core context.
- `defense-no-safe-mode`: records that no active safe mode appeared after the watched natural tick window.
- `defense-construction-progress`: records construction site progress or lack of progress for the watched site.
- `defense-worker-console`: optional derived evidence from player heartbeat console lines only if the runtime already logs it.

The status mod must only observe engine/storage/player output. It must not call game intents, mutate room objects after fixture setup, change constants, or force player decisions.

## Case Assertions

Case assertions live in `scripts/screeps-server/cases/case-registry.mjs` and wait through `ScreepsLocalServerHarness`.

Required assertion owners:

- `waitForPlayerHeartbeat`: all cases
- `waitForDefenseSafeModeActivation`: near-core dangerous hostile only
- `waitForDefenseNoSafeMode`: harmless scout and distant dangerous hostile
- `waitForDefenseConstructionContinues`: harmless scout
- `waitForDefenseConstructionDeferred`: distant dangerous hostile, unless equivalent worker fallback status is more direct and stable

The watchdog failure message should name the scenario-specific missing evidence. A passing case should not depend on exact tick number unless the official engine fixture requires it.

## Registry Contracts

The runner already rejects mixed fixtures in one invocation. Extend registry/system tests so:

- each new case resolves to exactly one fixture
- smoke suite remains only `single-owned-spawn`
- defense cases are selected explicitly through `node scripts/screeps-server/run-suite.mjs case <case>`
- mixed fixture lists still fail before server startup

## Documentation

Update:

- `docs/game-state.md`: local official server evidence for the three P3 scenario classes.
- `docs/development.md`: local server PoC paragraph should mention the expanded P3 local drill cases.
- `.trellis/spec/testing/test-layers.md`: if new status events or fixture contracts are added.

## Rollback

Rollback is ordinary git rollback for local tooling changes. Generated `.screeps/server/` runs remain ignored and must not be committed.
