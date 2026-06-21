# Design: role composition safety and body specialization

## Current behavior

`src/spawning/spawn-decision.ts` already models role-split requests for `miner`, `hauler`, `builder`, and `upgrader`, but:

- role target gaps are normally bounded by the generic worker target gap;
- role replacement is checked before missing-role gaps;
- every role request uses `EARLY_WORKER_BODIES`.

A live-like RCL3 room can therefore have `miner > target`, `upgrader > target`, `hauler = 0`, source containers full, and spawn/extensions underfilled, yet fail to request a hauler if total population is at/above target or an expiring surplus role is selected first.

## Target behavior

### Spawn request ordering

For RCL3+ rooms with full source-container coverage:

1. Build role targets from the current snapshot.
2. Fill missing target roles before same-role replacement.
3. Allow population-surplus spawning only for a bounded logistics outage:
   - request type is `haulerWorker`;
   - source containers have meaningful stored energy;
   - primary/core energy sinks need energy;
   - current hauler count is below hauler target.
4. Keep existing generic target-gap bounds for non-critical role growth.
5. Keep role replacement after missing-role gaps, and only for roles whose current count is at or above target.

### Body catalogs

Use explicit role body catalogs:

- `worker` / survival / development: existing early worker fallback order.
- `miner`: more `WORK`, enough `CARRY` to keep current source-container deposit behavior valid.
- `hauler`: `CARRY/MOVE` bodies, including a 200-energy recovery option so a low-energy room can spawn logistics once it reaches the minimum creep body cost.
- `builder`: balanced worker-like bodies.
- `upgrader`: `WORK`-leaning bodies where affordable.

The body selector remains generic: each request type owns ordered body options; execution picks the first affordable body by room capacity and available energy.

## Boundaries

- Edit `src/spawning/spawn-decision.ts` for request ordering and body catalogs.
- Add/update tests in `test/unit/spawning/spawn-decision.test.ts`.
- Do not change runtime execution, live Memory, deployment scripts, or PM2 bridge behavior in this task.

## Risks and mitigations

- **Overpopulation:** only hauler logistics outage can bypass `genericTargetGap`; all other role growth remains bounded.
- **Miner behavior without CARRY:** miner bodies retain CARRY because current miner logic deposits carried energy into source-local containers.
- **Body expectation churn:** keep generic worker body tests unchanged; update only role-specific expectations and add explicit role body tests.
