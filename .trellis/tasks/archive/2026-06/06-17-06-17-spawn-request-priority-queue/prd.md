# Spawn request priority queue and early role body catalog

## Problem

The current spawning module directly computes one bootstrap worker decision. This is enough for a single generic worker role, but mature bots use spawn groups/requests/queues to arbitrate survival, economy, defense, and logistics demands.

Evidence:

- Overmind tree includes `logistics/SpawnGroup.ts`, creep setups, overlords, and request-like logistics networks.
- The International tree includes `SpawnRequestsManager`, `spawnRequests`, and spawn request constructors.
- bonzAI has `SpawnGroup.ts` and mission/operation structures.

Local constraint: do not rewrite the whole bot into roles/managers. Add a minimal pure request scheduler that preserves current public `SpawnDecision` behavior.

## Goal

Introduce a small spawn-request intermediate model and priority selection path that is behavior-compatible today and can support dedicated miner/hauler/defender requests later.

## Requirements

- Preserve existing `SpawnDecision` output for current bootstrap/survival cases.
- Represent spawn candidates as typed requests with priority, target room, body options, and reason/type.
- Keep `planBootstrapWorkerSpawn` and `planBootstrapSurvivalWorkerSpawn` public interfaces stable unless a narrow change is justified.
- Body selection must continue to use captured body part costs, not hard-coded costs.
- No Memory schema changes.
- No new role execution behavior in this task.

## Acceptance criteria

- Unit tests prove survival worker requests outrank development worker requests.
- Unit tests prove 550/300/200 body fallback behavior is unchanged.
- Unit tests prove unavailable/spawning spawns are skipped.
- Existing spawn tests still pass.
- `pnpm vitest run test/unit/spawning/spawn-decision.test.ts` passes.
- `pnpm check` and `git diff --check` pass.

## Non-goals

- Dedicated miner/hauler role implementation.
- Multi-spawn empire-level allocation.
- Defense creep spawning.
- Live deploy/restart unless separately authorized.
