# Design: Migration Safety Gates

## Aggressive Migration Ladder

1. **Site-only cleanup**: remove zero/low-progress construction sites that conflict with confirmed lattice.
2. **Road-first preparation**: build roads and replacement extension sites before capacity loss.
3. **Capacity-neutral replacement**: wait until replacement extensions are built before removing old built extensions.
4. **Core relocation candidate**: storage/tower/spawn moves require separate user confirmation and survival analysis.
5. **Final cleanup**: remove obsolete roads/sites only after new traffic path is proven.

## Required Checks Before Destruction

- room status normal;
- no hostiles;
- heartbeat verified;
- controller downgrade safe;
- worker/hauler population healthy;
- spawn energy and replacement body affordability acceptable;
- replacement sites exist and/or built capacity is sufficient;
- user explicitly confirms the exact coordinates.
