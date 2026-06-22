# Design: Planner Integration

## Current Issue

The existing implementation improved spacing but remains locally greedy: extension candidates are selected and then optional interleaved roads are attached. Mature layouts should invert that relationship.

## Target Behavior

```text
room snapshot
  -> derive anchors and reserved routes
  -> select road-lattice / garden candidate
  -> choose RCL-appropriate extension pockets
  -> emit extension sites first
  -> emit bounded road sites second
```

## Compatibility

- RCL2/RCL3 near-spawn extension bootstrap remains unchanged.
- Backlog throttles still apply to new road sites.
- Refill target access invariant remains `min >= 2` where enforceable.
