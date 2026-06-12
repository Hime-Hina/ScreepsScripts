# PTR Room Founding

## Scenario: Create Or Verify The Official PTR Main Room

### 1. Scope / Trigger

This contract applies when a task creates or verifies an owned room on official Screeps PTR.

PTR room founding is a credentialed online mutation. It is not code deployment, live production verification, room scouting, rollback, or local official server e2e.

### 2. Signatures

Current command:

```text
found:ptr-room:screeps
```

Current target:

- `shard1 / W51N21`
- spawn `Spawn1`
- position `35,23`

### 3. Contracts

- Use `screeps.ptr.json`, not `screeps.json`.
- Use fixed API base `https://screeps.com/ptr/api/`.
- Authenticate through `X-Token`; do not put tokens in URLs or logs.
- Read PTR account, overview, shards, target room status, and target room objects before reporting success.
- If PTR already owns the target room, verify the target spawn exists at the target coordinate instead of placing another spawn.
- If PTR owns a different room, stop and report the conflict. Do not silently choose another room.
- If PTR has no owned room, use the PTR `game/place-spawn` operation for the recorded target only.
- Record observed or blocked PTR facts in `docs/game-state.md`.

### 4. Validation & Error Matrix

| Condition | Required Behavior |
| --- | --- |
| Missing PTR token | Stop without printing secret values |
| PTR network timeout | Record PTR feasibility as blocked |
| PTR target room status is not spawnable | Stop and record the status |
| PTR already owns a different room | Stop and report the owned room |
| PTR place-spawn succeeds but readback lacks target spawn | Treat as blocked and record the mismatch |
| PTR room is created | Record shard, room, spawn name, position, and evidence source |

### 5. Good/Base/Bad Cases

- Good: the command verifies no owned room, places `Spawn1` at `35,23` in `shard1 / W51N21`, then reads the target spawn back.
- Base: PTR is unreachable; record the timeout as blocked and do not attempt local fallback as if it were PTR.
- Bad: the command reads live config, uses browser cookies, changes live room state, or switches into local official server behavior through a flag.

### 6. Tests Required

- Integration tests for PTR account, overview, shards, room status, room objects, and place-spawn endpoint construction.
- Command tests proving no-room founding, already-founded verification, and different-owned-room blocking.
- System tests proving the command is explicit and excluded from default `pnpm check`.
