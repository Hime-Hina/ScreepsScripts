# Design: Stamp Primitive Layer

## Proposed Local Shape

Potential future files:

- `src/construction/layout-stamp.ts`
- `src/construction/layout-scoring.ts`
- tests in `test/unit/construction/`

## Model

```ts
StampCell = road | extension | core | reserved | exit | optional
Transform = rotation + reflection + translation
Candidate = transformed cells + metrics + score explanation
```

## Scoring Signals

Positive:

- connected road skeleton;
- extension cells adjacent to roads;
- multiple exits/open diagonals;
- compatibility with existing useful structures;
- enough RCL8 extension capacity.

Negative:

- terrain collision;
- road dead ends not justified by service targets;
- extension orthogonal clumps;
- refillAccess below 2;
- high built-structure demolition cost;
- overbuilding roads during backlog.
