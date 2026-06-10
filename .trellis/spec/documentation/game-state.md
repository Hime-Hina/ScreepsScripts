# Game State Documentation

## Source of Truth

`docs/game-state.md` records live Screeps facts. It must be updated whenever production observations change.
Use the evidence labels from [Fact Confidence](./fact-confidence.md) when a fact can affect production logic.

Current known facts include:

- Account: `Dragon_King`
- World: Persistent World
- Visible shard: `shard3`
- Active production room: `shard3 / W15S27`
- Spawn: `Spawn1` at `44,30`
- Deployed branch: `main`
- Current remaining blockers: CPU bucket and CPU tick limit are not yet observed.

Do not hard-code room, spawn, source, mineral, route, branch, or hostile assumptions that are listed as blocked facts.

Blocked facts are not lower-priority documentation. They are constraints that prevent code from depending on unverified production state.

## Secrets

Never write tokens, passwords, cookies, or full local `screeps.json` content into docs.

Allowed:

- Endpoint shape.
- Header name such as `X-Token`.
- Config file path.
- Branch name.
- Hashes of deployed artifacts.

## Live Verification

When live verification becomes possible, record:

- Date and time.
- Shard and room.
- Branch and deployed module.
- Observable effect.
- Previous remote hash when deployment replaced code.
- Deployed hash.
- Verification outcome.
- Rollback path.
- Blocked reason, if any.
- Any blocked or uncertain facts.

API readback is deployment synchronization evidence. It is not live runtime verification.
