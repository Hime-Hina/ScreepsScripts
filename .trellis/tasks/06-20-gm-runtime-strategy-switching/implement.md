# GM runtime strategy switching implementation plan

## Planning gate

Do not start implementation until GM console v1 is complete and deployed/verified or the user explicitly reprioritizes strategy switching ahead of v1.

## RED tests

1. Add pure strategy selector tests:
   - no override keeps autonomous full/survival decision;
   - active `survival-only` override changes effective mode;
   - expired override is ignored;
   - worker floor, downgrade, defense, and CPU safety gates take precedence.
2. Add GM command tests:
   - `gm.strategy(room)` prints effective mode, source, expiry, and safety state;
   - `gm.setStrategy(room, 'survival-only', { ticks })` stores a bounded override and returns pretty output;
   - invalid mode/scope/TTL returns pretty actionable errors;
   - `gm.clearStrategy(room)` clears only the target room;
   - ephemeral mode does not write `Memory`.
3. Add integration tests for `runTick`:
   - room override causes survival-only spawning/worker input selection for the target room;
   - safety gates still win;
   - non-target rooms remain autonomous.

## GREEN implementation

1. Add a small `src/strategy/runtime-strategy.ts` module with:
   - mode types;
   - override state type;
   - TTL validation/clamp;
   - pure effective strategy selector.
2. Extend GM console state with `strategyOverrides` only if GM v1 state exists.
3. Add inspect/set/clear GM commands after pretty-output utilities are already available.
4. Thread effective strategy into `runTick` with the smallest possible surface change.
5. Keep strategy state ephemeral in `globalThis` unless a later design explicitly adds Memory persistence.

## Verification commands

```bash
pnpm vitest run test/unit/strategy test/unit/console/gm-console.test.ts test/integration/main-loop.test.ts
pnpm check
git diff --check
python3 ./.trellis/scripts/task.py validate 06-20-gm-runtime-strategy-switching
```

## Review gate

Request a read-only review focused on:

- safety gate precedence;
- accidental persistent state/Memory writes;
- whether strategy switching overreaches current bootstrap architecture;
- pretty output and command UX.
