# Live Verification

## Source Levels

Live Screeps facts must be classified by evidence level:

- `observed`: directly confirmed through UI, API readback, or console output.
- `derived`: inferred from code, local artifacts, hashes, or deterministic build results.
- `blocked`: cannot currently be confirmed.
- `assumption`: temporary planning input; not allowed in production logic.

`docs/game-state.md` should prefer `observed`, `derived`, and `blocked`. Avoid `assumption`; when unavoidable, label it explicitly.

API readback proves code synchronization only. It does not prove natural Screeps runtime execution.

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

## Completion Rule

Deployment-affecting tasks are not complete until one of these is true:

- Live behavior was observed and recorded.
- Live verification is blocked by a documented external condition.
- The task was local-only and explicitly did not deploy.
