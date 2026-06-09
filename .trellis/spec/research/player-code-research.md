# Player Code Research

## Purpose

Studying other Screeps code is required before building large systems such as colony planning, logistics, pathfinding, market automation, defense, or remote mining. The goal is to avoid uninformed reinvention while preserving this project's architecture and tests.

## Repositories

Start from `docs/references.md`. Current high-value references include:

- `screepers/screeps-typescript-starter`: TypeScript and Rollup starter patterns.
- `bencbartlett/Overmind`: mature colony-level architecture and documentation.
- `The-International-Screeps-Bot/The-International-Open-Source`: current TypeScript automated bot structure.
- `TooAngel/screeps`: mature automation breadth.
- `screepers/screeps-server-mockup`: possible local test infrastructure.
- `screepers/node-screeps-api`: possible deployment and sync API.

GitHub topic/search pages can change. Re-check when starting major research:

- https://github.com/search?o=desc&q=screeps&s=stars&type=Repositories
- https://github.com/topics/screeps-ai

## Local Clones

Clone selected player repositories only when a task needs focused research:

```text
references/player-code/
```

This directory is ignored by Git.

## Adoption Rule

Before adopting an external pattern, document:

- The repository and path studied.
- The problem the pattern solves.
- The local constraint that makes it fit.
- Tests that will prove the local behavior.
- Any license constraint.

Do not copy a mature bot architecture wholesale before the local room, spawn, CPU, and branch facts are known.

## License Rule

Do not copy code from another Screeps repository unless:

- The license permits the intended use.
- The copied scope is minimal.
- Attribution requirements are recorded.
- A local test proves the behavior under this project's boundary model.

Prefer extracting concepts and rewriting them through this project's TDD workflow.
