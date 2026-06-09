# Official Screeps Docs

## Local Clone

The official Screeps docs are cloned locally at:

```text
references/screeps-docs/
```

Remote:

```text
https://github.com/screeps/docs.git
```

Current local clone status observed on 2026-06-09:

```text
c7cb981 (master, origin/master, origin/HEAD) refactor Game.cpu and Game.shard
```

This clone is ignored by Git and exists for local search.

## Search Rule

Use `rg` against the local docs before relying on remembered Screeps behavior:

```powershell
rg "Game.cpu" references\screeps-docs
rg "simultaneous" references\screeps-docs
rg "PathFinder" references\screeps-docs
```

Use official docs first for API contracts. Use player code only for design ideas, not for authoritative API behavior.

## Refresh Rule

When a task depends on current Screeps docs, refresh or verify the clone before writing code. If network access is unavailable, record the local commit hash used for the decision.
