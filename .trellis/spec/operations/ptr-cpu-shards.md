# PTR CPU Shards

## Scenario: Verify Or Reassign Official PTR CPU Shard Allocation

### 1. Scope / Trigger

This contract applies when a task checks or changes official Screeps PTR CPU shard allocation.

PTR CPU shard allocation is a credentialed account mutation with a 12-hour cooldown. It is not code deployment, room founding, hostile creation, or local server fallback.

### 2. Signatures

Read account allocation:

```text
GET https://screeps.com/ptr/api/auth/me
```

Read runtime shard limits:

```text
GET https://screeps.com/ptr/api/game/shards/info
```

Change account allocation:

```text
POST https://screeps.com/ptr/api/user/cpu-shards
```

Request body:

```json
{
  "cpu": {
    "shard0": 0,
    "shard1": 80,
    "shard2": 0,
    "shard3": 0
  }
}
```

Browser UI route:

```text
https://screeps.com/ptr/#!/shards2
```

### 3. Contracts

- Use `screeps.ptr.json`, not `screeps.json`.
- Use `X-Token`; do not put tokens in URLs or logs.
- `auth/me.cpuShard` is the account allocation source of truth.
- `game/shards/info[].cpuLimit` is runtime execution evidence. It can lag or contradict account allocation.
- Browser `#!/shards2` shows both "CPU assigned" and runtime "CPU limit"; record both if they contradict.
- Reassigning CPU must submit `{ cpu: <shardLimits> }`, not `{ cpuShard: <shardLimits> }`.
- Do not click or POST a CPU change when `auth/me.cpuShard` already equals the intended allocation unless the user explicitly accepts the cooldown risk.
- `POST user/cpu-shards` may return `error = "too soon"` during the 12-hour cooldown. Treat this as blocked.
- `POST user/console` with `{ shard, expression }` queues a console expression, but it only executes if the target shard ticks. Do not rely on console to fix CPU for a non-ticking shard.

### 4. Validation & Error Matrix

| Condition | Required Behavior |
| --- | --- |
| Missing PTR token | Stop without printing secret values |
| `auth/me.cpuShard` already matches target | Do not reassign unless cooldown risk was explicitly accepted |
| `auth/me.cpuShard` and `shards/info.cpuLimit` disagree | Record account allocation and runtime limit separately |
| Browser UI shows assigned CPU but no runtime CPU limit | Record PTR natural tick as blocked until runtime evidence changes |
| `POST user/cpu-shards` returns `too soon` | Record cooldown block and next known eligibility time if available |
| Console expression is queued on a non-ticking shard | Do not treat it as executed evidence |

### 5. Good/Base/Bad Cases

- Good: `auth/me` shows `shard1: 80`, browser `#!/shards2` shows `80 CPU assigned`, and room-object samples show natural tick progress after `shards/info` grants `shard1` runtime CPU.
- Base: `auth/me` shows `shard1: 80`, but `shards/info` still shows `shard1` CPU limit `0`; record account transfer complete and runtime tick blocked.
- Bad: submit `{ cpuShard: ... }`, infer tick from account allocation alone, or repeatedly POST during cooldown.

### 6. Tests Required

- Network-boundary tests for any project script that writes `user/cpu-shards` must assert the exact `{ cpu: ... }` body.
- Tests must prove tokens are passed through `X-Token` and not logged.
- Completion evidence must include `auth/me`, `shards/info`, and either room-object progression or an explicit blocked reason.

### 7. Wrong vs Correct

#### Wrong

```json
{ "cpuShard": { "shard1": 80 } }
```

#### Correct

```json
{ "cpu": { "shard0": 0, "shard1": 80, "shard2": 0, "shard3": 0 } }
```
