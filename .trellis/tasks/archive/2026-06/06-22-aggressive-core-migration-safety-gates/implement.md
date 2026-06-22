# Implementation Plan

1. Build a read-only migration diff report from P2/P4 candidate output.
2. Add tests or snapshots for classifying keep/remove/migrate structures.
3. If console/GM support is needed, design pretty multi-line output first.
4. Do not execute console writes or destruction; hand the plan to the user for confirmation.
