# Room Scouting

## Scenario: Starting Room Scout

### 1. Scope / Trigger

This contract applies when code changes read live Screeps room facts for starting-room selection.
Room scouting is a live API observation operation, but it must be read-only: no deployment, no IDE save, no spawn placement, and no memory or game-object mutation.

### 2. Signatures

Project command:

```text
pnpm scout:screeps -- --shard <shard> --room <room>
pnpm scout:screeps -- --shard <shard> --area <corner>:<corner>
```

Allowed API reads:

```text
GET /api/game/room-objects?room=<room>&shard=<shard>
GET /api/game/room-status?room=<room>&shard=<shard>
GET /api/game/room-terrain?room=<room>&shard=<shard>
```

Authentication must use the `X-Token` header from the typed `screeps.json` main profile.

### 3. Contracts

- `--shard` is required.
- At least one `--room` or `--area` is required.
- `--area` expands inclusive room-name corners such as `W10S20:W19S29`.
- The scout command may read cardinal neighbors for risk scoring.
- Area scans must count adjacent requested candidate rooms as cardinal neighbors, not only rooms outside the requested area.
- Output must include candidate rank, room status, starting suitability, accepted/rejected state, source count, score, spawn coordinate, source distances, controller distance, local open area, local swamp count, room swamp/wall percentages, path penalty, terrain penalty, risk details, mineral, warning reasons, and rejection reasons.
- Terrain decoder must support live sparse terrain arrays with entries like `{ room, x, y, type }`, where omitted tiles are plain and `type` is `wall` or `swamp`.
- Terrain decoder may also accept a top-level 2500-character terrain string or an array entry with `{ room, terrain }` when returned by compatible API variants.

### 4. Validation & Error Matrix

| Condition | Required Behavior |
| --- | --- |
| Missing `--shard` | Fail with a non-secret command error |
| No rooms requested | Fail with a non-secret command error |
| Invalid room name or area syntax | Fail before API reads |
| Missing token or malformed config | Fail through the config boundary without printing token contents |
| Transient GET network failure | Retry read-only API calls a small bounded number of times |
| HTTP/auth/API semantic failure | Do not retry as if it were transient; surface a non-secret API error |
| Candidate-room API read fails inside a multi-room scout | Keep the room as rejected `api-error` instead of aborting the whole scout |
| Neighbor-room API read fails inside a multi-room scout | Keep the neighbor as `unknown` with empty objects instead of aborting candidate scoring |
| Terrain payload has invalid tile coordinate or type | Fail with room-specific non-secret error |
| `room-status` returns `ok=1` with `room=null` | Decode status as `unknown` and reject through normal room status rules |
| Candidate is owned, reserved, missing controller, or has fewer than two sources | Keep it in output as rejected with reasons |

### 5. Good/Base/Bad Cases

- Good: `pnpm scout:screeps -- --shard shard3 --area W10S20:W19S29` ranks candidates and records important observations in `docs/game-state.md`.
- Base: local tests pass but live API is unavailable; record the environment blocker instead of inventing room facts.
- Bad: temporary shell commands choose a room without durable scoring logic or leave token values in logs.

### 6. Tests Required

- Unit tests for room ranking, suitability labels, score breakdown, warnings, and rejection reasons.
- Unit tests for room-name area expansion and world-axis boundary behavior.
- Unit tests for terrain and argument validation failures.
- Integration tests for API endpoint URLs, `X-Token` header use, live terrain payload shapes, and bounded GET retry behavior.
- Integration tests for command-level area scans where an adjacent requested candidate contributes neighbor risk.
- System tests that expose `scout:screeps` as an explicit script and keep it outside `pnpm check`.

### 7. Wrong vs Correct

#### Wrong

```text
Invoke-RestMethod ... | manually compare swamp counts in the terminal
```

#### Correct

```text
pnpm scout:screeps -- --shard shard3 --room W13S27 --room W12S29
```

Then record the observed candidate facts and derived scoring in `docs/game-state.md` before any spawn placement.
