# Live Verification

## Source Levels

Live Screeps facts must be classified by evidence level:

- `observed`: directly confirmed through UI, API readback, or console output.
- `derived`: inferred from code, local artifacts, hashes, or deterministic build results.
- `blocked`: cannot currently be confirmed.
- `assumption`: temporary planning input; not allowed in production logic.

`docs/game-state.md` should prefer `observed`, `derived`, and `blocked`. Avoid `assumption`; when unavoidable, label it explicitly.

API readback proves code synchronization only. It does not prove natural Screeps runtime execution.

For controller downgrade verification, live `room-objects` API readback exposes controller `downgradeTime` as an absolute game tick. Runtime code reads Screeps `StructureController.ticksToDowngrade` inside the game sandbox. Do not record API `downgradeTime` as `ticksToDowngrade`; either compute the remaining ticks from a trusted shard game time readback or record the absolute `downgradeTime` trend directly.

## Required Record

Every live verification entry must include:

- Date.
- Shard.
- Room, when known.
- Branch.
- Module.
- Local artifact or hash.
- Observable behavior.
- Evidence level.
- Blocked facts, if any.

For the current heartbeat behavior, the minimum live runtime evidence is a natural production tick that emits:

```text
[tick <time>] cpu=<used>
```

Manual `require('main').loop()` is console debugging evidence, not natural tick verification.

## Console Verification

Console commands must be copied into docs only when they do not contain credentials.

Allowed:

```javascript
require('main').loop();
```

Forbidden:

- Tokens.
- Cookies.
- Account passwords.
- Full local deployment config.

## Scenario: live console heartbeat readback

### 1. Scope / Trigger

Use this contract when a live command must prove natural runtime execution through Screeps console output. API readback remains deployment synchronization evidence only; it cannot satisfy this scenario.

### 2. Signatures

- Command: `pnpm status:live:screeps`
- Script: `node scripts/screeps/live-survival-status.mjs --shard <name> --room <name>`
- Live account API: `GET /api/auth/me`
- Live overview API: `GET /api/user/overview?interval=8`
- Console websocket subscription: `user:<accountId>/console`

### 3. Contracts

- `screeps.json` supplies `protocol`, `server`, `branch`, and `token`; the command validates this at the boundary.
- HTTP requests use `X-Token`, never `_token`.
- `/api/auth/me` must provide `_id`; `username` is optional diagnostic context only.
- `/api/user/overview?interval=8` supplies owned room names used only for support-room diagnostics. It must not trigger room founding, rebuild, pathfinding, claim, or deployment behavior.
- The websocket URL is derived from `protocol/server`: `https -> wss`, `http -> ws`, path `/socket/<serverId>/<sessionId>/websocket`.
- After SockJS open frame `o`, send `["auth <token>"]`; after `auth ok`, send `["subscribe user:<accountId>/console"]`.
- The command must not send `POST /api/user/console` or any console expression.
- Passing heartbeat evidence must be a target-shard console log matching:

```text
[tick <time>] cpu=<used> bucket=<bucket> limit=<limit> tickLimit=<tickLimit> budget=<decision> rooms=<room>:workers=<n>:spawnEnergy=<n>/<n>:construction=<n>:hostiles=<n>
```

### 4. Validation & Error Matrix

| Condition | Required Behavior |
| --- | --- |
| `/api/auth/me` lacks `_id` | Fail with a non-secret API decode error |
| WebSocket unavailable | Fail before claiming heartbeat verification |
| WebSocket auth fails | Fail without printing token or auth response payload |
| WebSocket closes before target heartbeat | Fail closed |
| Console event is for another shard | Keep waiting until timeout/close |
| Target-shard tick line lacks CPU, bucket, limit, tickLimit, budget, or room summary | Fail closed; do not downgrade to API-only success |
| Target room summary is absent | Fail closed |
| Target room has no owned spawn and overview contains no other owned room | Print `recoveryStates=<room>:spawnMissing,<room>:rebuildBlocked` and `recoveryBlockers=<room>:noOwnedSupportRoom`; do not print or imply rebuild action evidence |
| Target room has no owned spawn and overview contains another owned room | Print `recoveryBlockers=<room>:rebuildSupportContractMissing`; do not generate `requestRebuildSupport` until cross-room contracts exist |

### 5. Good/Base/Bad Cases

- Good: `status:live:screeps` reports room/API summary plus `naturalTickHeartbeat=verified`, tick, shard, room, CPU, bucket, limit, tickLimit, budget, and room survival summary.
- Good: `status:live:screeps` reports `recoveryStates` and `recoveryBlockers` from read-only room objects plus overview.
- Base: API readback succeeds but no target heartbeat appears; the command fails and docs record the blocked reason.
- Bad: command prints token, remote module source, browser cookies, or full `screeps.json`.
- Bad: command sends `require('main').loop()` or any `POST /api/user/console` expression to manufacture evidence.

### 6. Tests Required

- Integration test for `/api/auth/me` URL and `X-Token` header.
- Integration test for `/api/user/overview?interval=8` URL and `X-Token` header.
- Integration test for successful websocket readback that asserts subscribe channel and `naturalTickHeartbeat=verified` output.
- Integration test for single-room `spawnMissing` plus `rebuildBlocked` status output.
- Integration tests for malformed heartbeat, missing target room summary, wrong shard, auth failure, and websocket close.
- System test must keep `status:live:screeps` explicit and outside `pnpm check`.

### 7. Wrong vs Correct

#### Wrong

```text
GET /api/user/code matched local dist/main.js
# Treat this as natural P4 heartbeat verification.
```

#### Correct

```text
pnpm status:live:screeps
# Require naturalTickHeartbeat=verified from target-shard console websocket output.
```

## Completion Rule

Deployment-affecting tasks are not complete until one of these is true:

- Live behavior was observed and recorded.
- Live verification is blocked by a documented external condition.
- The task was local-only and explicitly did not deploy.
