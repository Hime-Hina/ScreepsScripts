# GM runtime strategy switching design

## Relationship to GM console v1

`06-20-gm-console-room-monitor` remains inspect-first and runtime-only. It may show the current autonomous strategy/budget state, but it must not add mutation commands for planner strategy.

This task owns the later strategy-switching design and implementation.

## Existing autonomous strategy inputs

Current code already has strategy-like decisions:

- `src/kernel/tick-budget.ts` selects `fullTickBudget` vs `survivalOnlyTickBudget` from CPU bucket.
- `src/kernel/run-tick.ts` uses the tick-budget decision to choose full vs survival spawning/worker world inputs.
- `src/spawning/spawn-decision.ts` derives survival/development worker requests from room snapshots.
- `src/colony/bootstrap-economy.ts` derives worker demand and construction eligibility from controller, energy, worker population, and defense state.
- `src/defense/defense-planner.ts` and construction gates already protect survival behavior from unsafe room state.

A manual strategy layer should be a narrow input to this existing selection flow, not a replacement planner.

## Proposed command shape

```js
gm.strategy(roomName?)
gm.setStrategy(roomName, 'auto' | 'survival-only', { ticks?: number, reason?: string })
gm.clearStrategy(roomName?)
```

Default behavior:

- `gm.strategy()` resolves the default room with the same resolver as `gm.room()`.
- `gm.setStrategy()` requires an explicit room name in the first version.
- `ticks` defaults to a short TTL, e.g. 500 ticks, and must be clamped to a safe maximum.
- `gm.clearStrategy(roomName)` clears that room's override.
- `gm.clearStrategy()` may clear only the resolved default room, not all rooms, unless an explicit `{ all: true }` option is designed later.

## Mode semantics

| Mode | Meaning |
|---|---|
| `auto` | No override; runtime uses existing autonomous selection. |
| `survival-only` | Prefer survival-only spawning/worker inputs for the room while the override is active, unless an even stricter safety gate applies. |

Defer `build-focus`, `upgrade-focus`, `repair-focus`, expansion, combat, and claim modes until the bot has stronger role/request abstractions. Adding those now would couple operator commands to unstable bootstrap internals.

## State model

Preferred first implementation:

```ts
interface GmStrategyOverride {
  readonly roomName: string;
  readonly mode: 'survival-only';
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly reason?: string;
}
```

Store in `globalThis.__gm.strategyOverrides` first. Memory persistence can be a later explicit option after schema design.

## Effective strategy calculation

Use a pure function:

```ts
selectEffectiveRuntimeStrategy({
  autonomousTickBudget,
  roomState,
  override,
  gameTime,
})
```

Output should include both the effective mode and the reason:

- `auto-full`
- `auto-survival-only-cpu`
- `manual-survival-only`
- `safety-survival-worker-floor`
- `safety-controller-downgrade`
- `safety-defense-risk`

Safety reasons must take precedence over less restrictive manual choices. Expired overrides are ignored and cleaned up.

## Output style

Example:

```text
[gm:strategy] W51N21 @ shard1 tick 71,783,790
Effective
  Mode: survival-only
  Reason: manual override
Override
  Requested: survival-only
  Expires: 71,784,290
  TTL: 500
Safety
  Worker floor: stable
  Controller: safe
  Defense: safe
```

All set/clear/error output follows the same pretty-print rule as GM v1.

## Testing

- Unit tests for mode parsing, TTL clamp, expiry, and pretty output.
- Pure selector tests proving safety gates override manual choices.
- Integration tests proving `runTick` consumes the effective strategy without bypassing defense/downgrade/survival safeguards.
- Regression tests proving no Memory writes in ephemeral mode.
