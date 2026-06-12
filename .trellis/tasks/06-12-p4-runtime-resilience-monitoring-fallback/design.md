# P4 runtime resilience and monitoring fallback design

## Architecture Boundary

Runtime owns:

- CPU snapshot capture.
- `Game.notify`.
- action execution error boundaries.
- live API check scripts under `scripts/screeps/`.

Kernel owns:

- choosing degraded tick execution path from explicit runtime health input.
- returning telemetry.

Domain modules should receive explicit survival/health inputs, not read `Game.cpu`.

## Contracts

```typescript
interface RuntimeCpuSnapshot {
  readonly bucket: number;
  readonly limit: number;
  readonly tickLimit: number;
  readonly usedAtTickStart: number;
}

type TickBudgetDecision =
  | { readonly type: 'fullTickBudget' }
  | { readonly type: 'survivalOnlyTickBudget' };

interface RuntimeAlertDecision {
  readonly groupInterval: number;
  readonly message: string;
  readonly type: 'notify';
}
```

Avoid `runMode: 'degraded'` or boolean flags. Use explicit budget decision variants.

## Degraded Rule

Initial thresholds must be documented in tests:

- Survival-only: skip construction planning, non-critical repair, opportunistic scanning, visuals, future remote/market work.
- Preserve: memory schema, spawn emergency worker, refill spawn/extensions, P0 downgrade upgrade, critical defense/safe mode.

Exact bucket floors should start conservative and be adjustable only through a named contract, not ad hoc constants scattered across modules.

## Error Boundary Rule

Wrap complete operation groups, not every nullable read:

- construction decisions are non-critical after P1/P0 safety exists;
- spawn/refill/P0 upgrade are critical;
- defense safe mode is critical when threat present.

Critical failures must be logged and optionally notified. Non-critical failures may skip that action and continue.

## Live Check Script

Add or extend a read-only script to report:

- shard/room/status;
- spawn energy/spawning;
- worker count/body summary;
- controller level/ticksToDowngrade/progress;
- construction site progress;
- hostiles;
- deployed module hash if relevant.

Script must use `X-Token` from ignored config and never print token.

## Tests

- Unit tests for budget decision variants.
- Unit tests for alert throttling.
- Integration tests for operation group error handling.
- System tests for live-check script existence and no inclusion in `pnpm check`.

## Rollback

Runtime resilience changes can affect every tick. Roll back code with `pnpm rollback:screeps` if deployed behavior suppresses critical work.
