import { describe, expect, it } from 'vitest';

import { planRoomRecovery } from '../../../src/colony/room-recovery';

const SAFE_ROOM_DEFENSE_STATE = {
  roomName: 'W1N1',
  type: 'roomSafe',
} as const;

const UNSAFE_ROOM_DEFENSE_STATE = {
  roomName: 'W1N1',
  type: 'roomUnsafe',
} as const;

const SAFE_CONTROLLER_DOWNGRADE_STATE = {
  roomName: 'W1N1',
  type: 'controllerDowngradeSafe',
} as const;

const WARNING_CONTROLLER_DOWNGRADE_STATE = {
  roomName: 'W1N1',
  type: 'controllerDowngradeWarning',
} as const;

describe('room recovery planning', () => {
  it('classifies a stable owned room as healthy without rebuild support requests', () => {
    expect(
      planRoomRecovery({
        rooms: [
          {
            controller: {
              downgradeState: SAFE_CONTROLLER_DOWNGRADE_STATE,
              type: 'controllerOwned',
            },
            roomDefenseState: SAFE_ROOM_DEFENSE_STATE,
            roomName: 'W1N1',
            spawn: {
              type: 'ownedSpawnPresent',
            },
            workerCreepCount: 3,
          },
        ],
      }),
    ).toEqual({
      rebuildRequests: [],
      roomRecoveryStates: [
        {
          roomName: 'W1N1',
          type: 'roomHealthy',
        },
      ],
    });
  });

  it('classifies an owned room with survival pressure as degraded', () => {
    expect(
      planRoomRecovery({
        rooms: [
          {
            controller: {
              downgradeState: WARNING_CONTROLLER_DOWNGRADE_STATE,
              type: 'controllerOwned',
            },
            roomDefenseState: SAFE_ROOM_DEFENSE_STATE,
            roomName: 'W1N1',
            spawn: {
              type: 'ownedSpawnPresent',
            },
            workerCreepCount: 3,
          },
        ],
      }),
    ).toEqual({
      rebuildRequests: [],
      roomRecoveryStates: [
        {
          reason: 'controllerDowngradeWarning',
          roomName: 'W1N1',
          type: 'roomDegraded',
        },
      ],
    });
  });

  it('classifies an owned room with defense pressure as degraded', () => {
    expect(
      planRoomRecovery({
        rooms: [
          {
            controller: {
              downgradeState: SAFE_CONTROLLER_DOWNGRADE_STATE,
              type: 'controllerOwned',
            },
            roomDefenseState: UNSAFE_ROOM_DEFENSE_STATE,
            roomName: 'W1N1',
            spawn: {
              type: 'ownedSpawnPresent',
            },
            workerCreepCount: 3,
          },
        ],
      }),
    ).toEqual({
      rebuildRequests: [],
      roomRecoveryStates: [
        {
          reason: 'roomUnsafe',
          roomName: 'W1N1',
          type: 'roomDegraded',
        },
      ],
    });
  });

  it('blocks automatic rebuild for a single owned room with no spawn', () => {
    expect(
      planRoomRecovery({
        rooms: [
          {
            controller: {
              downgradeState: SAFE_CONTROLLER_DOWNGRADE_STATE,
              type: 'controllerOwned',
            },
            roomDefenseState: SAFE_ROOM_DEFENSE_STATE,
            roomName: 'W1N1',
            spawn: {
              type: 'ownedSpawnMissing',
            },
            workerCreepCount: 3,
          },
        ],
      }),
    ).toEqual({
      rebuildRequests: [],
      roomRecoveryStates: [
        {
          roomName: 'W1N1',
          type: 'spawnMissing',
        },
        {
          reason: 'noOwnedSupportRoom',
          roomName: 'W1N1',
          type: 'rebuildBlocked',
        },
      ],
    });
  });

  it('keeps spawn-missing rebuild blocked until cross-room support contracts exist', () => {
    expect(
      planRoomRecovery({
        rooms: [
          {
            controller: {
              downgradeState: SAFE_CONTROLLER_DOWNGRADE_STATE,
              type: 'controllerOwned',
            },
            roomDefenseState: SAFE_ROOM_DEFENSE_STATE,
            roomName: 'W1N1',
            spawn: {
              type: 'ownedSpawnMissing',
            },
            workerCreepCount: 0,
          },
          {
            controller: {
              downgradeState: {
                ...SAFE_CONTROLLER_DOWNGRADE_STATE,
                roomName: 'W2N2',
              },
              type: 'controllerOwned',
            },
            roomDefenseState: {
              ...SAFE_ROOM_DEFENSE_STATE,
              roomName: 'W2N2',
            },
            roomName: 'W2N2',
            spawn: {
              type: 'ownedSpawnPresent',
            },
            workerCreepCount: 3,
          },
        ],
      }),
    ).toEqual({
      rebuildRequests: [],
      roomRecoveryStates: [
        {
          roomName: 'W1N1',
          type: 'spawnMissing',
        },
        {
          reason: 'rebuildSupportContractMissing',
          roomName: 'W1N1',
          type: 'rebuildBlocked',
        },
        {
          roomName: 'W2N2',
          type: 'roomHealthy',
        },
      ],
    });
  });

  it('classifies a room with too few workers as creep population missing', () => {
    expect(
      planRoomRecovery({
        rooms: [
          {
            controller: {
              downgradeState: SAFE_CONTROLLER_DOWNGRADE_STATE,
              type: 'controllerOwned',
            },
            roomDefenseState: SAFE_ROOM_DEFENSE_STATE,
            roomName: 'W1N1',
            spawn: {
              type: 'ownedSpawnPresent',
            },
            workerCreepCount: 2,
          },
        ],
      }),
    ).toEqual({
      rebuildRequests: [],
      roomRecoveryStates: [
        {
          roomName: 'W1N1',
          type: 'creepPopulationMissing',
        },
      ],
    });
  });

  it('classifies a room without owned controller as controller lost', () => {
    expect(
      planRoomRecovery({
        rooms: [
          {
            controller: {
              type: 'controllerLost',
            },
            roomDefenseState: SAFE_ROOM_DEFENSE_STATE,
            roomName: 'W1N1',
            spawn: {
              type: 'ownedSpawnMissing',
            },
            workerCreepCount: 0,
          },
        ],
      }),
    ).toEqual({
      rebuildRequests: [],
      roomRecoveryStates: [
        {
          roomName: 'W1N1',
          type: 'controllerLost',
        },
      ],
    });
  });
});
