import {
  BOOTSTRAP_SURVIVAL_WORKER_COUNT,
  type BootstrapControllerDowngradeState,
} from './bootstrap-economy';
import type { RoomDefenseState } from '../defense/defense-planner';

export type RoomRecoveryControllerSnapshot =
  | {
      readonly downgradeState: BootstrapControllerDowngradeState;
      readonly type: 'controllerOwned';
    }
  | {
      readonly type: 'controllerLost';
    };

export type RoomRecoverySpawnSnapshot =
  | {
      readonly type: 'ownedSpawnPresent';
    }
  | {
      readonly type: 'ownedSpawnMissing';
    };

export interface RoomRecoverySnapshot {
  readonly controller: RoomRecoveryControllerSnapshot;
  readonly roomDefenseState: RoomDefenseState;
  readonly roomName: string;
  readonly spawn: RoomRecoverySpawnSnapshot;
  readonly workerCreepCount: number;
}

export interface RoomRecoveryWorldSnapshot {
  readonly rooms: readonly RoomRecoverySnapshot[];
}

export type RoomRecoveryState =
  | {
      readonly roomName: string;
      readonly type: 'roomHealthy';
    }
  | {
      readonly reason: string;
      readonly roomName: string;
      readonly type: 'roomDegraded';
    }
  | {
      readonly roomName: string;
      readonly type: 'spawnMissing';
    }
  | {
      readonly roomName: string;
      readonly type: 'creepPopulationMissing';
    }
  | {
      readonly roomName: string;
      readonly type: 'controllerLost';
    }
  | {
      readonly reason: string;
      readonly roomName: string;
      readonly type: 'rebuildBlocked';
    };

export interface RebuildRequest {
  readonly supportRoomName: string;
  readonly targetRoomName: string;
  readonly type: 'requestRebuildSupport';
}

export interface RoomRecoveryPlan {
  readonly rebuildRequests: readonly RebuildRequest[];
  readonly roomRecoveryStates: readonly RoomRecoveryState[];
}

export const planRoomRecovery = (recoveryWorld: RoomRecoveryWorldSnapshot): RoomRecoveryPlan => ({
  rebuildRequests: [],
  roomRecoveryStates: recoveryWorld.rooms.flatMap((roomSnapshot) =>
    selectRoomRecoveryStates(roomSnapshot, recoveryWorld),
  ),
});

const selectRoomRecoveryStates = (
  roomSnapshot: RoomRecoverySnapshot,
  recoveryWorld: RoomRecoveryWorldSnapshot,
): readonly RoomRecoveryState[] => {
  if (roomSnapshot.controller.type === 'controllerLost') {
    return [
      {
        roomName: roomSnapshot.roomName,
        type: 'controllerLost',
      },
    ];
  }

  if (roomSnapshot.spawn.type === 'ownedSpawnMissing') {
    return [
      {
        roomName: roomSnapshot.roomName,
        type: 'spawnMissing',
      },
      {
        reason: selectRebuildBlockedReason(roomSnapshot, recoveryWorld),
        roomName: roomSnapshot.roomName,
        type: 'rebuildBlocked',
      },
    ];
  }

  if (
    roomSnapshot.controller.type === 'controllerOwned' &&
    roomSnapshot.controller.downgradeState.type !== 'controllerDowngradeSafe'
  ) {
    return [
      {
        reason: roomSnapshot.controller.downgradeState.type,
        roomName: roomSnapshot.roomName,
        type: 'roomDegraded',
      },
    ];
  }

  if (roomSnapshot.roomDefenseState.type === 'roomUnsafe') {
    return [
      {
        reason: roomSnapshot.roomDefenseState.type,
        roomName: roomSnapshot.roomName,
        type: 'roomDegraded',
      },
    ];
  }

  if (roomSnapshot.workerCreepCount < BOOTSTRAP_SURVIVAL_WORKER_COUNT) {
    return [
      {
        roomName: roomSnapshot.roomName,
        type: 'creepPopulationMissing',
      },
    ];
  }

  return [
    {
      roomName: roomSnapshot.roomName,
      type: 'roomHealthy',
    },
  ];
};

const selectRebuildBlockedReason = (
  roomSnapshot: RoomRecoverySnapshot,
  recoveryWorld: RoomRecoveryWorldSnapshot,
): string => {
  const hasOwnedSupportRoom = recoveryWorld.rooms.some(
    (supportRoomSnapshot) =>
      supportRoomSnapshot.roomName !== roomSnapshot.roomName &&
      supportRoomSnapshot.controller.type === 'controllerOwned' &&
      supportRoomSnapshot.spawn.type === 'ownedSpawnPresent',
  );

  return hasOwnedSupportRoom ? 'rebuildSupportContractMissing' : 'noOwnedSupportRoom';
};
