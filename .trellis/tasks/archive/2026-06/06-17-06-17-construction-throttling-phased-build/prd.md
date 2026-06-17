# Construction site throttling and phased logistics build

## Problem

The current RCL2 logistics planner can emit many `createConstructionSite` decisions in one tick. After the roads/container slice deployed, live `W51N21` reported `constructionSites=48` and `constructionProgress=0/44100`. This is legal but too bursty: it can fill the room with road backlog before workers finish nearer, higher-value structures.

Mature bot pattern:

- TooAngel advertises automatic base building and room revival, implying staged construction rather than dumping all possible sites at once.
- Overmind has room planner / road logistics assets and separates planning from execution.
- The International has `CommunePlanner`, `RemotePlanner`, and room construction managers.

Local constraint: keep `src/construction/` as a pure planner and do not delete existing live sites. Only cap/phasing future site creation decisions.

## Goal

Add deterministic construction-site throttling so each room creates only a bounded number of new sites per tick/plan and prioritizes high-value early economy structures before long road backlogs.

## Requirements

- Preserve existing extension behavior and tests.
- Preserve existing container/road candidate selection rules.
- Introduce a room-level cap for new construction decisions, with priority order documented and tested.
- Prioritize missing extensions first, then RCL3 tower when available, then source/controller containers, then roads.
- If existing construction site count is already above a configurable active-site cap, planner should avoid adding low-priority roads.
- Do not remove or cancel existing construction sites.
- Do not add Memory writes or console output.

## Acceptance criteria

- Unit test proves a room with many road candidates emits at most the configured number of new road decisions.
- Unit test proves extension buildout is not starved by road/container backlog.
- Unit test proves existing construction sites count toward an active-site throttle for roads.
- Existing construction planner tests still pass.
- Integration/main-loop behavior remains through `executeConstructionDecisions` only.
- `pnpm vitest run test/unit/construction/construction-planner.test.ts test/integration/main-loop.test.ts` passes.
- `pnpm check` and `git diff --check` pass.

## Non-goals

- Removing current live sites.
- Full bunker/base planner.
- New creep roles.
- Live deploy/restart unless separately authorized.
