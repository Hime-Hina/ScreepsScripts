# Remote intel scoring research notes

## Date

2026-06-17

## Exact external files studied

1. `bencbartlett/Overmind` — `src/intel/RoomIntel.ts` — MIT
   - Evidence fetched from: `https://raw.githubusercontent.com/bencbartlett/Overmind/master/src/intel/RoomIntel.ts`
   - Relevant concept: room intel persists controller owner / reservation data and source metadata in a dedicated intel module.
2. `TooAngel/screeps` — `src/brain_nextroom.js` — AGPL-3.0
   - Evidence fetched from: `https://raw.githubusercontent.com/TooAngel/screeps/master/src/brain_nextroom.js`
   - Relevant concept: claimable-room filtering explicitly rejects rooms that are already owned, controller-less, have fewer than two sources, or are hostile reserved.
3. `The-International-Screeps-Bot/The-International-Open-Source` — `src/room/remotePlanner.ts` — MIT
   - Evidence fetched from: `https://raw.githubusercontent.com/The-International-Screeps-Bot/The-International-Open-Source/Main/src/room/remotePlanner.ts`
   - Relevant concept: remote planning is its own subsystem and path / distance cost matters before execution.
4. `The-International-Screeps-Bot/The-International-Open-Source` — `src/room/commune/remotesManager.ts` — MIT
   - Evidence fetched from: `https://raw.githubusercontent.com/The-International-Screeps-Bot/The-International-Open-Source/Main/src/room/commune/remotesManager.ts`
   - Relevant concept: enemy reservation and remote danger are tracked independently from spawn / creep execution.

## Local adoption for this task

- Adopt a dedicated `src/intel/room-intel.ts` pure scoring module instead of scattering remote checks through runtime or creep code.
- Adopt source-count preference and hostile-reservation rejection / penalty concepts.
- Adopt distance-aware ranking, but keep it snapshot-driven and deterministic.
- Adopt the repo-local rule from the mature bot survey: intel / scoring first, remote execution later.

## Explicit rejections for this task

- Reject copying any external implementation verbatim.
- Reject Memory writes, `Game` reads, scout API calls, or runtime wiring in this slice.
- Reject The International / Overmind top-level manager architecture (`commune`, `overlord`, etc.) because local domain boundaries require a small pure module.
- Reject full remote execution concerns such as reserver / miner / hauler spawn logic, road planning, or claim flow.

## Local constraints satisfied

- Snapshot-only input; no direct Screeps global access.
- Deterministic ranking with room-name tie-break.
- Unknown-data policy must be explicit in the scoring contract.
- Intended frequency remains low: recompute on scout/intel refresh, not every creep action.
