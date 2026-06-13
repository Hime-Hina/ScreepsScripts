# P5 recovery and rebuild fallback design

## Architecture Boundary

Initial implementation should be diagnostic and planning only.

Recommended owner:

- `src/colony/` if room-level recovery state is introduced.
- Runtime captures room/spawn/controller/creep availability.
- Kernel returns recovery telemetry or decisions.

Do not implement cross-room pathfinding or claim behavior in the first P5 slice.

## Contracts

```typescript
type RoomRecoveryState =
  | { readonly roomName: string; readonly type: 'roomHealthy' }
  | { readonly roomName: string; readonly reason: string; readonly type: 'roomDegraded' }
  | { readonly roomName: string; readonly type: 'spawnMissing' }
  | { readonly roomName: string; readonly type: 'creepPopulationMissing' }
  | { readonly roomName: string; readonly type: 'controllerLost' }
  | { readonly roomName: string; readonly reason: string; readonly type: 'rebuildBlocked' };

interface RebuildRequest {
  readonly targetRoomName: string;
  readonly supportRoomName: string;
  readonly type: 'requestRebuildSupport';
}
```

Do not create `RecoveryManager`. Expose a complete operation such as `planRoomRecovery`.

## State Rules

- `roomHealthy`: spawn exists, controller owned, population above minimum, no critical P3/P4 alert.
- `roomDegraded`: spawn exists but survival signals are below thresholds.
- `spawnMissing`: controller still owned/visible but spawn absent.
- `creepPopulationMissing`: spawn exists but no creeps or below minimum.
- `controllerLost`: controller no longer owned.
- `rebuildBlocked`: no support room or capability exists for automatic rebuild.

## Multi-room Future

Only emit `requestRebuildSupport` when a support room snapshot proves:

- owned spawn exists;
- enough energy/body plan exists;
- pathing/reachability contract exists;
- target room still has a valid recovery target.

Until those contracts exist, return `rebuildBlocked`.

## Trapped Detection Signals

Record design but do not implement full trapped logic:

- single owned room for a long tick window;
- no progress in controller/extension/worker count;
- neighbors controlled/reserved by enemies;
- CPU/bucket/Memory constraints ruled out.

## Tests

- Pure state classification tests.
- Unit tests that no support room means blocked, not fake action.
- Future multi-room request tests only after support room snapshot exists.
- Documentation check that `docs/game-state.md` records blocked recovery facts.

## Rollback

Diagnostic-only P5 is low live risk. If future rebuild actions deploy incorrectly, rollback code and record live room state immediately.
