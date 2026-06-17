# Bootstrap adaptive spawn roadmap PRD

## Goal

Translate mature Screeps bot worker/spawn demand patterns into this repo without preserving the old fixed worker-cap behavior. The roadmap should move bootstrap economy from a fixed RCL2 worker count toward throughput-based demand, priority spawn requests, replacement pressure, and later role-specific economy demand while preserving local snapshot-driven boundaries.

## Source evidence

- Local research artifact: `/home/hh/.hermes/cache/documents/screeps-worker-scaling-mature-bots-2026-06-18.md`.
- Skill reference: `screeps-agent-operations/references/mature-worker-demand-patterns.md`.
- Current live room at planning time: W51N21 RCL2, workerCount=5, spawn energy heartbeat 550/550, construction backlog about 33.5k work, no hostiles, CPU bucket full.

## Child tasks

1. `06-18-adaptive-bootstrap-worker-demand` — replace fixed RCL2 target with source/backlog/body-throughput demand.
2. `06-18-priority-bootstrap-spawn-requests` — promote internal spawn requests into a first-class priority request model.
3. `06-18-bootstrap-ttl-replacement-pressure` — count near-expiring workers as replacement pressure.
4. `06-18-role-split-bootstrap-economy` — split universal bootstrap worker demand into miner/hauler/builder/upgrader after request model exists.

## Non-goals

- Do not transplant Overmind/TooAngel/Quorum architecture wholesale.
- Do not preserve a compatibility switch for fixed `RCL2_DEVELOPMENT_WORKER_COUNT = 5`.
- Do not deploy automatically from this roadmap unless explicitly authorized in the active task.

## Acceptance criteria

- Each child task has PRD/design/implement artifacts and can be implemented independently.
- The first child is implemented immediately after this planning step.
- Active Trellis task list reflects roadmap and children.
