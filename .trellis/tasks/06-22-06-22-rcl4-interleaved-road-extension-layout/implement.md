# Implementation Plan

1. Add a focused unit test showing RCL4+ extensions prefer road-adjacent staggered positions over compact non-road-adjacent ring positions.
2. Add regression coverage for high construction backlog so interleaved roads do not bypass the existing road throttle.
3. Run the focused test and confirm it fails for the expected candidate ordering.
4. Update RCL4+ extension candidate scoring to prefer road-adjacent interleaving, emit bounded local roads under throttle, and return extension sites before road sites.
5. Run focused unit tests, then `pnpm check`.
6. If green, deploy with `pnpm deploy:screeps`, verify readback, restart `screeps-ops-event-bridge`, and short-monitor W51N21.
