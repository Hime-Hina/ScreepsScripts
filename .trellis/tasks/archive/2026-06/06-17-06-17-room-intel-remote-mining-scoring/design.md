# Design: Room intel and remote mining candidate scoring

## Proposed module

Add `src/intel/room-intel.ts` only if implementing this task. It should expose a pure function such as:

```ts
scoreRemoteMiningCandidates(world: RoomIntelWorldSnapshot): readonly RemoteMiningCandidate[]
```

The exact names can change, but the module must own intel/scoring decisions and return deterministic typed results.

## Candidate data

Minimum snapshot fields:

- home room name;
- candidate room name;
- route distance or linear distance;
- source count;
- controller owner/reservation state;
- hostile creep / hostile structure summary;
- source keeper / invader core risk if visible;
- whether room is already owned.

## Scoring direction

Prefer:

- more sources;
- shorter distance;
- neutral/unreserved rooms;
- no hostile/keeper risk;
- deterministic room-name tie-break.

## CPU

Scoring should run on scout result changes or low frequency, not every creep action. Unit tests should not depend on wall-clock time.
