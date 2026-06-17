# Mature Screeps bot research roadmap

## Problem

The current codebase is intentionally small and has recently reached a stable RCL2 bootstrap loop. It now needs a research-grounded roadmap before adding larger systems such as richer spawning, role split, logistics, RCL3 planning, remote mining, or market/terminal automation.

Preliminary external signals checked on 2026-06-17:

| Repository | Evidence | Useful patterns | License caveat |
| --- | --- | --- | --- |
| `TooAngel/screeps` | GitHub topic `screeps`: 644 stars, 161 forks, pushed 2026-05-27. README says it is a fully automated bot covering important game features. | Automatic base building, remote harvesting, room revival, mineral/market/reactions, visualization, manual ops. | AGPL-3.0; learn patterns only, do not copy code. |
| `bencbartlett/Overmind` | 615 stars, 158 forks, TypeScript, MIT. README describes Colony + Overlord + Directive architecture and logistics networks. | Colony-level orchestration, directives, spawn groups, logistics networks, room planner, intel/pathing. | MIT but still prefer local rewrite through tests. |
| `The-International-Screeps-Bot/The-International-Open-Source` | 124 stars, 37 forks, TypeScript, large active automated bot. Tree shows room managers, remotes manager, spawn requests, tower manager, commune planner. | Current TS manager split, remote planner, spawn requests, tower/room managers. | Check license before any code-level adoption. |
| `bonzaiferroni/bonzAI` | 108 stars, TypeScript. README describes Operation/Mission structure. | Operation/Mission hierarchy, mining/link/transport/terminal missions, auto room survey. | No license surfaced in quick metadata; do not copy. |
| `ScreepsQuorum/screeps-quorum` | 162 stars, JS. Tree shows `extends/room/*`, `programs/*`, roles, room logistics/territory/intel. | Room-level programs, intel/economy/logistics separation. | Check license before adoption. |
| `screepers/screeps-typescript-starter` | 475 stars, 340 forks, TypeScript starter. | Tooling/deploy/typescript patterns, not game strategy. | Unlicense. |

Local project constraints:

- Keep pure planners and runtime boundaries: `runtime snapshot -> kernel -> domain decision -> runtime execution`.
- Do not recreate a broad `Roles/` folder architecture.
- Use mature bots as concept sources, not direct code sources.
- Add one behavior slice per Trellis task with RED/GREEN tests.

## Goal

Produce a short research matrix and use it to guide bounded implementation tasks that improve the local codebase without wholesale architecture import.

## Proposed scope

- Summarize mature bot patterns relevant to the next 3-5 local improvements.
- Keep tasks ordered by local payoff and dependency:
  1. construction throttling/phasing;
  2. spawn request priority foundation;
  3. RCL3 tower/extension planner;
  4. room intel / remote scoring;
  5. later logistics role split after spawn/request foundation.
- Capture external repository paths studied, license notes, adopted concepts, rejected concepts, and local tests required.

## Out of scope

- Copying external source code.
- Deploying live code.
- Market/terminal/labs/power creep automation in the first wave.
- Full Overmind/TooAngel architecture transplant.

## Acceptance criteria

- `research/mature-bot-survey.md` exists with repository/path evidence, patterns, adoption/rejection notes, and license caveats.
- Child Trellis tasks exist for at least three independently verifiable local improvements.
- Each child task has PRD/design/implementation notes and curated context manifests if delegated.
- No production source code is changed by this research task itself.
