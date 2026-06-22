import { describe, expect, it } from 'vitest';

import {
  planBootstrapSurvivalWorkerSpawn,
  planBootstrapWorkerSpawn,
  selectBootstrapWorkerSpawnRequests,
  type SpawnSnapshot,
  type SpawningWorldSnapshot,
} from '../../../src/spawning/spawn-decision';

const TEST_BODY_PART_COSTS = {
  carry: 50,
  move: 50,
  work: 100,
} as const;

type TestSpawnSnapshot = Omit<SpawnSnapshot, 'roomName'> & Partial<Pick<SpawnSnapshot, 'roomName'>>;
type SpawningRoomSnapshot = SpawningWorldSnapshot['rooms'][number];
type TestSpawningRoomSnapshot = Omit<SpawningRoomSnapshot, 'sourceCount' | 'workerCreepWorkParts'> &
  Partial<Pick<SpawningRoomSnapshot, 'sourceCount' | 'workerCreepWorkParts'>>;

const createWorkerCreeps = (
  count: number,
  ticksToLive: number,
): NonNullable<SpawningRoomSnapshot['workerCreeps']> =>
  Array.from({ length: count }, () => ({
    ticksToLive,
  }));

interface TestSpawningWorldSnapshot extends Omit<
  SpawningWorldSnapshot,
  'bodyPartCosts' | 'constructionCosts' | 'controllerStructureLimits' | 'rooms' | 'spawns'
> {
  readonly bodyPartCosts?: SpawningWorldSnapshot['bodyPartCosts'];
  readonly constructionCosts?: SpawningWorldSnapshot['constructionCosts'];
  readonly controllerStructureLimits?: SpawningWorldSnapshot['controllerStructureLimits'];
  readonly rooms?: readonly TestSpawningRoomSnapshot[];
  readonly spawns: readonly TestSpawnSnapshot[];
  readonly workerCreepCount: number;
}

const normalizeRoomSnapshot = (roomSnapshot: TestSpawningRoomSnapshot): SpawningRoomSnapshot => ({
  ...roomSnapshot,
  spawningWorkerCount: roomSnapshot.spawningWorkerCount ?? 0,
  sourceCount: roomSnapshot.sourceCount ?? 2,
  workerCreeps:
    roomSnapshot.workerCreeps ?? createWorkerCreeps(roomSnapshot.workerCreepCount, 1500),
  workerCreepWorkParts: roomSnapshot.workerCreepWorkParts ?? roomSnapshot.workerCreepCount,
});

const planWorkerSpawn = (spawningWorld: TestSpawningWorldSnapshot) => {
  const roomName = spawningWorld.spawns[0]?.roomName ?? 'W1N1';
  const defaultRooms: readonly TestSpawningRoomSnapshot[] = [
    {
      constructionSites: [],
      controllerLevel: 2,
      energyStructures: [
        {
          availableEnergy: 300,
          energyCapacity: 300,
        },
      ],
      roomName,
      sourceCount: 2,
      structures: [
        {
          structureType: 'spawn',
        },
      ],
      ticksToDowngrade: 9000,
      workerCreepCount: spawningWorld.workerCreepCount,
      workerCreepWorkParts: spawningWorld.workerCreepCount,
    },
  ];

  return planBootstrapWorkerSpawn({
    bodyPartCosts: TEST_BODY_PART_COSTS,
    constructionCosts: {
      extension: 3000,
    },
    controllerStructureLimits: {
      extension: {
        2: 0,
      },
    },
    ...spawningWorld,
    rooms: (spawningWorld.rooms ?? defaultRooms).map(normalizeRoomSnapshot),
    spawns: spawningWorld.spawns.map((spawnSnapshot) => ({
      roomName,
      ...spawnSnapshot,
    })),
  });
};

const planSurvivalWorkerSpawn = (spawningWorld: TestSpawningWorldSnapshot) => {
  const roomName = spawningWorld.spawns[0]?.roomName ?? 'W1N1';
  const defaultRooms: readonly TestSpawningRoomSnapshot[] = [
    {
      constructionSites: [],
      controllerLevel: 2,
      energyStructures: [
        {
          availableEnergy: 300,
          energyCapacity: 300,
        },
      ],
      roomName,
      sourceCount: 2,
      structures: [
        {
          structureType: 'spawn',
        },
      ],
      ticksToDowngrade: 9000,
      workerCreepCount: spawningWorld.workerCreepCount,
      workerCreepWorkParts: spawningWorld.workerCreepCount,
    },
  ];

  return planBootstrapSurvivalWorkerSpawn({
    bodyPartCosts: TEST_BODY_PART_COSTS,
    constructionCosts: {
      extension: 3000,
    },
    controllerStructureLimits: {
      extension: {
        2: 0,
      },
    },
    ...spawningWorld,
    rooms: (spawningWorld.rooms ?? defaultRooms).map(normalizeRoomSnapshot),
    spawns: spawningWorld.spawns.map((spawnSnapshot) => ({
      roomName,
      ...spawnSnapshot,
    })),
  });
};

const createRoomSnapshot = (
  roomName: string,
  overrides: Partial<TestSpawningRoomSnapshot> = {},
): TestSpawningRoomSnapshot => ({
  constructionSites: [],
  controllerLevel: 2,
  energyStructures: [
    {
      availableEnergy: 300,
      energyCapacity: 300,
    },
  ],
  roomName,
  sourceCount: 2,
  structures: [
    {
      structureType: 'spawn',
    },
  ],
  ticksToDowngrade: 9000,
  workerCreepCount: 0,
  workerCreepWorkParts: 0,
  ...overrides,
});

const createSpawnSnapshot = (
  name: string,
  roomName: string,
  overrides: Partial<SpawnSnapshot> = {},
): SpawnSnapshot => ({
  availableEnergy: 300,
  energyCapacity: 300,
  isSpawning: false,
  name,
  roomName,
  ...overrides,
});

const createSpawningWorld = (spawningWorld: TestSpawningWorldSnapshot): SpawningWorldSnapshot => {
  const roomName = spawningWorld.spawns[0]?.roomName ?? 'W1N1';
  const defaultRooms: readonly TestSpawningRoomSnapshot[] = [
    createRoomSnapshot(roomName, {
      workerCreepCount: spawningWorld.workerCreepCount,
      workerCreepWorkParts: spawningWorld.workerCreepCount,
    }),
  ];

  return {
    bodyPartCosts: TEST_BODY_PART_COSTS,
    constructionCosts: {
      extension: 3000,
    },
    controllerStructureLimits: {
      extension: {
        2: 0,
      },
    },
    ...spawningWorld,
    rooms: (spawningWorld.rooms ?? defaultRooms).map(normalizeRoomSnapshot),
    spawns: spawningWorld.spawns.map((spawnSnapshot) => ({
      roomName,
      ...spawnSnapshot,
    })),
  };
};

describe('bootstrap worker spawn decision', () => {
  it('uses a 550-energy RCL2 worker body when the full extension capacity is ready', () => {
    expect(
      planWorkerSpawn({
        constructionCosts: {
          extension: 3000,
        },
        controllerStructureLimits: {
          extension: {
            2: 5,
          },
        },
        gameTime: 52,
        rooms: [
          {
            constructionSites: [],
            controllerLevel: 2,
            energyStructures: [
              {
                availableEnergy: 550,
                energyCapacity: 550,
              },
            ],
            roomName: 'W1N1',
            structures: [
              {
                structureType: 'spawn',
              },
              {
                structureType: 'extension',
              },
              {
                structureType: 'extension',
              },
              {
                structureType: 'extension',
              },
              {
                structureType: 'extension',
              },
              {
                structureType: 'extension',
              },
            ],
            ticksToDowngrade: 9000,
            workerCreepCount: 4,
          },
        ],
        workerCreepCount: 4,
        spawns: [
          {
            availableEnergy: 550,
            energyCapacity: 550,
            isSpawning: false,
            name: 'Spawn1',
            roomName: 'W1N1',
          },
        ],
      }),
    ).toEqual({
      body: ['work', 'work', 'carry', 'carry', 'carry', 'move', 'move', 'move', 'move'],
      creepName: 'Spawn1-worker-52',
      spawnName: 'Spawn1',
    });
  });

  it('prioritizes survival worker requests ahead of development worker requests', () => {
    expect(
      planWorkerSpawn({
        constructionCosts: {
          extension: 3000,
        },
        controllerStructureLimits: {
          extension: {
            2: 5,
          },
        },
        gameTime: 60,
        rooms: [
          createRoomSnapshot('W1N1', {
            constructionSites: [
              {
                remainingWork: 3000,
                structureType: 'extension',
              },
            ],
            workerCreepCount: 4,
          }),
          createRoomSnapshot('W2N2', {
            workerCreepCount: 2,
          }),
        ],
        workerCreepCount: 4,
        spawns: [
          createSpawnSnapshot('SpawnDev', 'W1N1'),
          createSpawnSnapshot('SpawnSurvival', 'W2N2'),
        ],
      }),
    ).toEqual({
      body: ['work', 'carry', 'carry', 'move', 'move'],
      creepName: 'SpawnSurvival-worker-60',
      spawnName: 'SpawnSurvival',
    });
  });

  it('selects a development worker request when no survival request exists', () => {
    expect(
      planWorkerSpawn({
        constructionCosts: {
          extension: 3000,
        },
        controllerStructureLimits: {
          extension: {
            2: 5,
          },
        },
        gameTime: 61,
        rooms: [
          createRoomSnapshot('W1N1', {
            controllerLevel: 1,
            workerCreepCount: 3,
          }),
          createRoomSnapshot('W2N2', {
            constructionSites: [
              {
                remainingWork: 3000,
                structureType: 'extension',
              },
            ],
            workerCreepCount: 4,
          }),
        ],
        workerCreepCount: 4,
        spawns: [
          createSpawnSnapshot('SpawnStable', 'W1N1'),
          createSpawnSnapshot('SpawnDevelopment', 'W2N2'),
        ],
      }),
    ).toEqual({
      body: ['work', 'carry', 'carry', 'move', 'move'],
      creepName: 'SpawnDevelopment-worker-61',
      spawnName: 'SpawnDevelopment',
    });
  });

  it('represents a safe RCL3 development request with target gap and reason metrics', () => {
    const spawnRequests = selectBootstrapWorkerSpawnRequests(
      createSpawningWorld({
        constructionCosts: {
          extension: 3000,
        },
        controllerStructureLimits: {
          extension: {
            3: 10,
          },
        },
        gameTime: 66,
        rooms: [
          createRoomSnapshot('W51N21', {
            constructionSites: [
              { remainingWork: 3000, structureType: 'extension' },
              { remainingWork: 3000, structureType: 'extension' },
              { remainingWork: 1776, structureType: 'extension' },
              { remainingWork: 5000, structureType: 'tower' },
            ],
            controllerLevel: 3,
            energyStructures: [
              {
                availableEnergy: 600,
                energyCapacity: 650,
              },
            ],
            sourceCount: 2,
            structures: [
              { structureType: 'spawn' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
            ],
            workerCreepCount: 5,
            workerCreepWorkParts: 10,
          }),
        ],
        workerCreepCount: 5,
        spawns: [
          createSpawnSnapshot('Spawn1', 'W51N21', {
            availableEnergy: 600,
            energyCapacity: 650,
          }),
        ],
      }),
    );

    expect(spawnRequests).toHaveLength(1);
    expect(spawnRequests[0]).toMatchObject({
      bodyOptions: [
        ['work', 'work', 'carry', 'carry', 'carry', 'move', 'move', 'move', 'move'],
        ['work', 'carry', 'carry', 'move', 'move'],
        ['work', 'carry', 'move'],
      ],
      priority: 100,
      requestType: 'developmentWorker',
      roomName: 'W51N21',
      spawnName: 'Spawn1',
      targetGap: 5,
    });
    expect(spawnRequests[0]?.reasonMetrics).toEqual({
      constructionBacklogEnergy: 12776,
      controllerDowngradeState: 'controllerDowngradeSafe',
      controllerLevel: 3,
      currentWorkerCount: 5,
      energyState: 'spawnExtensionEnergyUnstable',
      plannedWorkerWorkParts: 2,
      replacementTtlThreshold: 300,
      replacementWorkerCount: 0,
      sourceCount: 2,
      spawningWorkerCount: 0,
      targetWorkerCount: 10,
      workerCreepWorkParts: 10,
    });
  });

  it('orders equal-priority development requests by larger target gap before spawn order', () => {
    expect(
      planWorkerSpawn({
        constructionCosts: {
          extension: 3000,
        },
        controllerStructureLimits: {
          extension: {
            3: 10,
          },
        },
        gameTime: 67,
        rooms: [
          createRoomSnapshot('W1N1', {
            constructionSites: [],
            controllerLevel: 3,
            energyStructures: [{ availableEnergy: 550, energyCapacity: 550 }],
            structures: [
              { structureType: 'spawn' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
            ],
            workerCreepCount: 9,
            workerCreepWorkParts: 18,
          }),
          createRoomSnapshot('W2N2', {
            constructionSites: [],
            controllerLevel: 3,
            energyStructures: [{ availableEnergy: 550, energyCapacity: 550 }],
            structures: [
              { structureType: 'spawn' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
            ],
            workerCreepCount: 5,
            workerCreepWorkParts: 10,
          }),
        ],
        workerCreepCount: 5,
        spawns: [
          createSpawnSnapshot('SpawnLowGap', 'W1N1', {
            availableEnergy: 550,
            energyCapacity: 550,
          }),
          createSpawnSnapshot('SpawnHighGap', 'W2N2', {
            availableEnergy: 550,
            energyCapacity: 550,
          }),
        ],
      }),
    ).toEqual({
      body: ['work', 'work', 'carry', 'carry', 'carry', 'move', 'move', 'move', 'move'],
      creepName: 'SpawnHighGap-worker-67',
      spawnName: 'SpawnHighGap',
    });
  });

  it('uses spawn order as a deterministic fallback when development target gaps tie', () => {
    expect(
      planWorkerSpawn({
        controllerStructureLimits: {
          extension: {
            3: 10,
          },
        },
        gameTime: 68,
        rooms: [
          createRoomSnapshot('W1N1', {
            controllerLevel: 3,
            energyStructures: [{ availableEnergy: 550, energyCapacity: 550 }],
            structures: [
              { structureType: 'spawn' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
            ],
            workerCreepCount: 5,
            workerCreepWorkParts: 10,
          }),
          createRoomSnapshot('W2N2', {
            controllerLevel: 3,
            energyStructures: [{ availableEnergy: 550, energyCapacity: 550 }],
            structures: [
              { structureType: 'spawn' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
            ],
            workerCreepCount: 5,
            workerCreepWorkParts: 10,
          }),
        ],
        workerCreepCount: 5,
        spawns: [
          createSpawnSnapshot('SpawnFirst', 'W1N1', {
            availableEnergy: 550,
            energyCapacity: 550,
          }),
          createSpawnSnapshot('SpawnSecond', 'W2N2', {
            availableEnergy: 550,
            energyCapacity: 550,
          }),
        ],
      }),
    ).toEqual({
      body: ['work', 'work', 'carry', 'carry', 'carry', 'move', 'move', 'move', 'move'],
      creepName: 'SpawnFirst-worker-68',
      spawnName: 'SpawnFirst',
    });
  });

  it('does not start role-split growth while a healthy RCL3 room is above the generic worker target', () => {
    expect(
      selectBootstrapWorkerSpawnRequests(
        createSpawningWorld({
          controllerStructureLimits: {
            extension: {
              3: 10,
            },
          },
          gameTime: 168,
          rooms: [
            createRoomSnapshot('W51N21', {
              controllerLevel: 3,
              energyStructures: [{ availableEnergy: 800, energyCapacity: 800 }],
              sourceContainerCount: 2,
              structures: [
                { structureType: 'spawn' },
                { structureType: 'tower' },
                { structureType: 'extension' },
                { structureType: 'extension' },
                { structureType: 'extension' },
                { structureType: 'extension' },
                { structureType: 'extension' },
                { structureType: 'extension' },
                { structureType: 'extension' },
                { structureType: 'extension' },
                { structureType: 'extension' },
                { structureType: 'extension' },
                { structureType: 'container' },
                { structureType: 'container' },
                { structureType: 'container' },
              ],
              workerCreepCount: 13,
              workerCreepWorkParts: 26,
              workerCreeps: createWorkerCreeps(13, 1500),
            }),
          ],
          workerCreepCount: 13,
          spawns: [
            createSpawnSnapshot('Spawn1', 'W51N21', {
              availableEnergy: 800,
              energyCapacity: 800,
            }),
          ],
        }),
      ),
    ).toEqual([]);
  });

  it('keeps generic replacement requests until every source has adjacent container coverage', () => {
    const spawnRequests = selectBootstrapWorkerSpawnRequests(
      createSpawningWorld({
        controllerStructureLimits: {
          extension: {
            3: 10,
          },
        },
        gameTime: 168,
        rooms: [
          createRoomSnapshot('W51N21', {
            controllerLevel: 3,
            energyStructures: [{ availableEnergy: 550, energyCapacity: 550 }],
            sourceContainerCount: 1,
            sourceCount: 2,
            structures: [
              { structureType: 'spawn' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'container' },
            ],
            workerCreepCount: 10,
            workerCreepWorkParts: 20,
            workerCreeps: [...createWorkerCreeps(9, 1500), { ticksToLive: 299 }],
          }),
        ],
        workerCreepCount: 10,
        spawns: [
          createSpawnSnapshot('SpawnReplacement', 'W51N21', {
            availableEnergy: 550,
            energyCapacity: 550,
          }),
        ],
      }),
    );

    expect(spawnRequests).toHaveLength(1);
    expect(spawnRequests[0]).toMatchObject({
      priority: 100,
      requestType: 'developmentWorker',
      targetGap: 1,
    });
  });

  it('uses replacement pressure to introduce source miners before generic development workers', () => {
    const spawnRequests = selectBootstrapWorkerSpawnRequests(
      createSpawningWorld({
        controllerStructureLimits: {
          extension: {
            3: 10,
          },
        },
        gameTime: 169,
        rooms: [
          createRoomSnapshot('W51N21', {
            controllerLevel: 3,
            energyStructures: [{ availableEnergy: 550, energyCapacity: 550 }],
            sourceContainerCount: 2,
            structures: [
              { structureType: 'spawn' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'container' },
              { structureType: 'container' },
            ],
            workerCreepCount: 10,
            workerCreepWorkParts: 20,
            workerCreeps: [...createWorkerCreeps(9, 1500), { ticksToLive: 299 }],
          }),
        ],
        workerCreepCount: 10,
        spawns: [
          createSpawnSnapshot('SpawnReplacement', 'W51N21', {
            availableEnergy: 550,
            energyCapacity: 550,
          }),
        ],
      }),
    );

    expect(spawnRequests).toHaveLength(1);
    expect(spawnRequests[0]).toMatchObject({
      priority: 150,
      requestType: 'minerWorker',
      roomName: 'W51N21',
      spawnName: 'SpawnReplacement',
      targetGap: 1,
    });
    expect(spawnRequests[0]?.reasonMetrics).toMatchObject({
      replacementTtlThreshold: 300,
      replacementWorkerCount: 1,
      spawningWorkerCount: 0,
      targetWorkerCount: 10,
    });
  });

  it('creates miner spawn decisions with role metadata and role-specific names', () => {
    expect(
      planWorkerSpawn({
        controllerStructureLimits: {
          extension: {
            3: 10,
          },
        },
        gameTime: 170,
        rooms: [
          createRoomSnapshot('W51N21', {
            controllerLevel: 3,
            energyStructures: [{ availableEnergy: 550, energyCapacity: 550 }],
            sourceContainerCount: 2,
            structures: [
              { structureType: 'spawn' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'container' },
              { structureType: 'container' },
            ],
            workerCreepCount: 10,
            workerCreepWorkParts: 20,
            workerCreeps: [...createWorkerCreeps(9, 1500), { ticksToLive: 299 }],
          }),
        ],
        workerCreepCount: 10,
        spawns: [
          createSpawnSnapshot('SpawnReplacement', 'W51N21', {
            availableEnergy: 550,
            energyCapacity: 550,
          }),
        ],
      }),
    ).toEqual({
      body: ['work', 'work', 'work', 'work', 'carry', 'move', 'move'],
      creepName: 'SpawnReplacement-miner-170',
      creepRole: 'miner',
      spawnName: 'SpawnReplacement',
    });
  });

  it('creates hauler spawn decisions with a carry/move recovery body', () => {
    expect(
      planWorkerSpawn({
        controllerStructureLimits: {
          extension: {
            3: 10,
          },
        },
        gameTime: 1701,
        rooms: [
          createRoomSnapshot('W51N21', {
            controllerEnergyAvailable: 0,
            controllerLevel: 3,
            energyStructures: [{ availableEnergy: 150, energyCapacity: 800 }],
            sourceContainerCount: 2,
            sourceContainerEnergyAvailable: 1800,
            structures: [
              { structureType: 'spawn' },
              { structureType: 'tower' },
              ...Array.from({ length: 10 }, () => ({ structureType: 'extension' })),
              { structureType: 'container' },
              { structureType: 'container' },
              { structureType: 'container' },
            ],
            workerCreepCount: 7,
            workerCreepWorkParts: 10,
            workerCreeps: [
              { role: 'miner', ticksToLive: 1500 },
              { role: 'miner', ticksToLive: 1500 },
              { role: 'upgrader', ticksToLive: 1500 },
              ...createWorkerCreeps(4, 1500),
            ],
          }),
        ],
        workerCreepCount: 7,
        spawns: [
          createSpawnSnapshot('SpawnHaulerRecovery', 'W51N21', {
            availableEnergy: 200,
            energyCapacity: 800,
          }),
        ],
      }),
    ).toEqual({
      body: ['carry', 'carry', 'move', 'move'],
      creepName: 'SpawnHaulerRecovery-hauler-1701',
      creepRole: 'hauler',
      spawnName: 'SpawnHaulerRecovery',
    });
  });

  it('introduces one logistics hauler after source miner coverage exists', () => {
    const spawnRequests = selectBootstrapWorkerSpawnRequests(
      createSpawningWorld({
        controllerStructureLimits: {
          extension: {
            3: 10,
          },
        },
        gameTime: 171,
        rooms: [
          createRoomSnapshot('W51N21', {
            controllerLevel: 3,
            energyStructures: [{ availableEnergy: 550, energyCapacity: 550 }],
            sourceContainerCount: 2,
            sourceCount: 2,
            structures: [
              { structureType: 'spawn' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'container' },
              { structureType: 'container' },
            ],
            workerCreepCount: 10,
            workerCreepWorkParts: 20,
            workerCreeps: [
              { role: 'miner', ticksToLive: 1500 },
              { role: 'miner', ticksToLive: 1500 },
              ...createWorkerCreeps(7, 1500),
              { ticksToLive: 299 },
            ],
          }),
        ],
        workerCreepCount: 10,
        spawns: [
          createSpawnSnapshot('SpawnHauler', 'W51N21', {
            availableEnergy: 550,
            energyCapacity: 550,
          }),
        ],
      }),
    );

    expect(spawnRequests).toHaveLength(1);
    expect(spawnRequests[0]).toMatchObject({
      priority: 145,
      requestType: 'haulerWorker',
      targetGap: 1,
    });
  });

  it('bounds builder role requests to construction backlog after miner coverage exists', () => {
    const spawnRequests = selectBootstrapWorkerSpawnRequests(
      createSpawningWorld({
        controllerStructureLimits: {
          extension: {
            3: 10,
          },
        },
        gameTime: 171,
        rooms: [
          createRoomSnapshot('W51N21', {
            constructionSites: [{ remainingWork: 3000, structureType: 'extension' }],
            controllerLevel: 3,
            energyStructures: [{ availableEnergy: 550, energyCapacity: 550 }],
            sourceContainerCount: 2,
            structures: [
              { structureType: 'spawn' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'container' },
              { structureType: 'container' },
            ],
            workerCreepCount: 10,
            workerCreepWorkParts: 20,
            workerCreeps: [
              { role: 'miner', ticksToLive: 1500 },
              { role: 'miner', ticksToLive: 1500 },
              { role: 'hauler', ticksToLive: 1500 },
              ...createWorkerCreeps(6, 1500),
              { ticksToLive: 299 },
            ],
          }),
        ],
        workerCreepCount: 10,
        spawns: [
          createSpawnSnapshot('SpawnBuilder', 'W51N21', {
            availableEnergy: 550,
            energyCapacity: 550,
          }),
        ],
      }),
    );

    expect(spawnRequests).toHaveLength(1);
    expect(spawnRequests[0]).toMatchObject({
      priority: 120,
      requestType: 'builderWorker',
      targetGap: 1,
    });
  });

  it('bounds upgrader role requests to one controller logistics worker after miner coverage exists', () => {
    const spawnRequests = selectBootstrapWorkerSpawnRequests(
      createSpawningWorld({
        controllerStructureLimits: {
          extension: {
            3: 10,
          },
        },
        gameTime: 172,
        rooms: [
          createRoomSnapshot('W51N21', {
            controllerLevel: 3,
            energyStructures: [{ availableEnergy: 550, energyCapacity: 550 }],
            sourceContainerCount: 2,
            structures: [
              { structureType: 'spawn' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'container' },
              { structureType: 'container' },
            ],
            workerCreepCount: 10,
            workerCreepWorkParts: 20,
            workerCreeps: [
              { role: 'miner', ticksToLive: 1500 },
              { role: 'miner', ticksToLive: 1500 },
              { role: 'hauler', ticksToLive: 1500 },
              ...createWorkerCreeps(6, 1500),
              { ticksToLive: 299 },
            ],
          }),
        ],
        workerCreepCount: 10,
        spawns: [
          createSpawnSnapshot('SpawnUpgrader', 'W51N21', {
            availableEnergy: 550,
            energyCapacity: 550,
          }),
        ],
      }),
    );

    expect(spawnRequests).toHaveLength(1);
    expect(spawnRequests[0]).toMatchObject({
      priority: 110,
      requestType: 'upgraderWorker',
      targetGap: 1,
    });
  });

  it('requests an additional hauler when source containers are backlogged and sinks need energy', () => {
    const spawnRequests = selectBootstrapWorkerSpawnRequests(
      createSpawningWorld({
        controllerStructureLimits: {
          extension: {
            3: 10,
          },
        },
        gameTime: 173,
        rooms: [
          createRoomSnapshot('W51N21', {
            controllerEnergyAvailable: 0,
            controllerLevel: 3,
            energyStructures: [{ availableEnergy: 400, energyCapacity: 550 }],
            sourceContainerCount: 2,
            sourceContainerEnergyAvailable: 1200,
            sourceCount: 2,
            structures: [
              { structureType: 'spawn' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'container' },
              { structureType: 'container' },
            ],
            workerCreepCount: 9,
            workerCreepWorkParts: 18,
            workerCreeps: [
              { role: 'miner', ticksToLive: 1500 },
              { role: 'miner', ticksToLive: 1500 },
              { role: 'hauler', ticksToLive: 1500 },
              ...createWorkerCreeps(6, 1500),
            ],
          }),
        ],
        workerCreepCount: 9,
        spawns: [createSpawnSnapshot('SpawnHauler2', 'W51N21')],
      }),
    );

    expect(spawnRequests[0]).toMatchObject({
      requestType: 'haulerWorker',
      targetGap: 1,
    });
  });

  it('requests a missing hauler before replacing surplus expiring miners during a logistics outage', () => {
    const spawnRequests = selectBootstrapWorkerSpawnRequests(
      createSpawningWorld({
        controllerStructureLimits: {
          extension: {
            3: 10,
          },
        },
        gameTime: 1731,
        rooms: [
          createRoomSnapshot('W51N21', {
            controllerEnergyAvailable: 0,
            controllerLevel: 3,
            energyStructures: [{ availableEnergy: 161, energyCapacity: 800 }],
            sourceContainerCount: 2,
            sourceContainerEnergyAvailable: 3882,
            sourceCount: 2,
            structures: [
              { structureType: 'spawn' },
              { structureType: 'tower' },
              ...Array.from({ length: 10 }, () => ({ structureType: 'extension' })),
              { structureType: 'container' },
              { structureType: 'container' },
              { structureType: 'container' },
            ],
            workerCreepCount: 11,
            workerCreepWorkParts: 22,
            workerCreeps: [
              { role: 'miner', ticksToLive: 100 },
              { role: 'miner', ticksToLive: 1500 },
              { role: 'miner', ticksToLive: 1500 },
              { role: 'miner', ticksToLive: 1500 },
              { role: 'upgrader', ticksToLive: 1500 },
              { role: 'upgrader', ticksToLive: 1500 },
              { role: 'upgrader', ticksToLive: 1500 },
              ...createWorkerCreeps(4, 1500),
            ],
          }),
        ],
        workerCreepCount: 11,
        spawns: [
          createSpawnSnapshot('SpawnLogisticsRecovery', 'W51N21', {
            availableEnergy: 161,
            energyCapacity: 800,
          }),
        ],
      }),
    );

    expect(spawnRequests[0]).toMatchObject({
      priority: 145,
      requestType: 'haulerWorker',
      targetGap: 1,
    });
  });

  it('does not request builders when construction backlog is zero', () => {
    const spawnRequests = selectBootstrapWorkerSpawnRequests(
      createSpawningWorld({
        controllerStructureLimits: {
          extension: {
            3: 10,
          },
        },
        gameTime: 174,
        rooms: [
          createRoomSnapshot('W51N21', {
            constructionSites: [],
            controllerLevel: 3,
            energyStructures: [{ availableEnergy: 550, energyCapacity: 550 }],
            sourceContainerCount: 2,
            structures: [
              { structureType: 'spawn' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'container' },
              { structureType: 'container' },
            ],
            workerCreepCount: 9,
            workerCreepWorkParts: 18,
            workerCreeps: [
              { role: 'miner', ticksToLive: 1500 },
              { role: 'miner', ticksToLive: 1500 },
              { role: 'hauler', ticksToLive: 1500 },
              ...createWorkerCreeps(6, 1500),
            ],
          }),
        ],
        workerCreepCount: 9,
        spawns: [createSpawnSnapshot('SpawnNoBuilder', 'W51N21')],
      }),
    );

    expect(spawnRequests[0]?.requestType).not.toBe('builderWorker');
  });

  it('increases builder demand for large RCL4 storage and extension backlog', () => {
    const spawnRequests = selectBootstrapWorkerSpawnRequests(
      createSpawningWorld({
        controllerStructureLimits: {
          extension: {
            4: 20,
          },
        },
        gameTime: 175,
        rooms: [
          createRoomSnapshot('W51N21', {
            constructionSites: [{ remainingWork: 12000, structureType: 'storage' }],
            controllerLevel: 4,
            energyStructures: [{ availableEnergy: 800, energyCapacity: 800 }],
            sourceContainerCount: 2,
            structures: [
              { structureType: 'spawn' },
              { structureType: 'tower' },
              { structureType: 'storage' },
              ...Array.from({ length: 20 }, () => ({ structureType: 'extension' })),
              { structureType: 'container' },
              { structureType: 'container' },
            ],
            workerCreepCount: 9,
            workerCreepWorkParts: 18,
            workerCreeps: [
              { role: 'miner', ticksToLive: 1500 },
              { role: 'miner', ticksToLive: 1500 },
              { role: 'hauler', ticksToLive: 1500 },
              { role: 'builder', ticksToLive: 1500 },
              ...createWorkerCreeps(5, 1500),
            ],
          }),
        ],
        workerCreepCount: 9,
        spawns: [createSpawnSnapshot('SpawnBuilder2', 'W51N21', { energyCapacity: 800 })],
      }),
    );

    expect(spawnRequests[0]).toMatchObject({
      requestType: 'builderWorker',
      targetGap: 1,
    });
  });

  it('recovers missing builders before replacing surplus expiring miners when role composition drifts', () => {
    const spawnRequests = selectBootstrapWorkerSpawnRequests(
      createSpawningWorld({
        controllerStructureLimits: {
          extension: {
            4: 20,
          },
        },
        gameTime: 71835876,
        rooms: [
          createRoomSnapshot('W51N21', {
            constructionSites: [{ remainingWork: 21120, structureType: 'storage' }],
            controllerEnergyAvailable: 2000,
            controllerLevel: 4,
            energyStructures: [{ availableEnergy: 1050, energyCapacity: 1050 }],
            sourceContainerCount: 2,
            sourceContainerEnergyAvailable: 4000,
            sourceCount: 2,
            structures: [
              { structureType: 'spawn' },
              { structureType: 'tower' },
              ...Array.from({ length: 15 }, () => ({ structureType: 'extension' })),
              { structureType: 'container' },
              { structureType: 'container' },
              { structureType: 'container' },
            ],
            workerCreepCount: 18,
            workerCreepWorkParts: 18,
            workerCreeps: [
              { role: 'miner', ticksToLive: 100 },
              ...Array.from({ length: 16 }, () => ({ role: 'miner' as const, ticksToLive: 1500 })),
              { role: 'hauler', ticksToLive: 1500 },
            ],
          }),
        ],
        workerCreepCount: 18,
        spawns: [createSpawnSnapshot('SpawnRoleDriftBuilder', 'W51N21', { energyCapacity: 1050 })],
      }),
    );

    expect(spawnRequests[0]).toMatchObject({
      priority: 120,
      requestType: 'builderWorker',
      targetGap: 1,
    });
  });

  it('does not perpetuate surplus expiring miners when role targets remain covered', () => {
    const spawnRequests = selectBootstrapWorkerSpawnRequests(
      createSpawningWorld({
        controllerStructureLimits: {
          extension: {
            4: 20,
          },
        },
        gameTime: 71835877,
        rooms: [
          createRoomSnapshot('W51N21', {
            constructionSites: [],
            controllerEnergyAvailable: 2000,
            controllerLevel: 4,
            energyStructures: [{ availableEnergy: 1050, energyCapacity: 1050 }],
            sourceContainerCount: 2,
            sourceContainerEnergyAvailable: 0,
            sourceCount: 2,
            structures: [
              { structureType: 'spawn' },
              { structureType: 'tower' },
              ...Array.from({ length: 15 }, () => ({ structureType: 'extension' })),
              { structureType: 'container' },
              { structureType: 'container' },
              { structureType: 'container' },
            ],
            workerCreepCount: 10,
            workerCreepWorkParts: 10,
            workerCreeps: [
              { role: 'miner', ticksToLive: 100 },
              { role: 'miner', ticksToLive: 1500 },
              { role: 'miner', ticksToLive: 1500 },
              { role: 'miner', ticksToLive: 1500 },
              { role: 'hauler', ticksToLive: 1500 },
              { role: 'upgrader', ticksToLive: 1500 },
              ...createWorkerCreeps(4, 1500),
            ],
          }),
        ],
        workerCreepCount: 10,
        spawns: [createSpawnSnapshot('SpawnSurplusMiner', 'W51N21', { energyCapacity: 1050 })],
      }),
    );

    expect(spawnRequests[0]?.requestType).not.toBe('minerWorker');
  });

  it('replaces an expiring critical role even when total population is above target', () => {
    const spawnRequests = selectBootstrapWorkerSpawnRequests(
      createSpawningWorld({
        controllerStructureLimits: {
          extension: {
            3: 10,
          },
        },
        gameTime: 176,
        rooms: [
          createRoomSnapshot('W51N21', {
            controllerLevel: 3,
            energyStructures: [{ availableEnergy: 550, energyCapacity: 550 }],
            sourceContainerCount: 2,
            structures: [
              { structureType: 'spawn' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'container' },
              { structureType: 'container' },
            ],
            workerCreepCount: 11,
            workerCreepWorkParts: 22,
            workerCreeps: [
              { role: 'miner', ticksToLive: 100 },
              { role: 'miner', ticksToLive: 1500 },
              { role: 'hauler', ticksToLive: 1500 },
              { role: 'upgrader', ticksToLive: 1500 },
              ...createWorkerCreeps(7, 1500),
            ],
          }),
        ],
        workerCreepCount: 11,
        spawns: [createSpawnSnapshot('SpawnRoleReplacement', 'W51N21')],
      }),
    );

    expect(spawnRequests[0]).toMatchObject({
      requestType: 'minerWorker',
      targetGap: 1,
    });
  });

  it('counts a near-expiring worker as replacement pressure when the room is at target', () => {
    const spawnRequests = selectBootstrapWorkerSpawnRequests(
      createSpawningWorld({
        controllerStructureLimits: {
          extension: {
            3: 10,
          },
        },
        gameTime: 69,
        rooms: [
          createRoomSnapshot('W51N21', {
            controllerLevel: 3,
            energyStructures: [{ availableEnergy: 550, energyCapacity: 550 }],
            structures: [
              { structureType: 'spawn' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
            ],
            workerCreepCount: 10,
            workerCreepWorkParts: 20,
            workerCreeps: [...createWorkerCreeps(9, 1500), { ticksToLive: 299 }],
          }),
        ],
        workerCreepCount: 10,
        spawns: [
          createSpawnSnapshot('SpawnReplacement', 'W51N21', {
            availableEnergy: 550,
            energyCapacity: 550,
          }),
        ],
      }),
    );

    expect(spawnRequests).toHaveLength(1);
    expect(spawnRequests[0]).toMatchObject({
      requestType: 'developmentWorker',
      roomName: 'W51N21',
      spawnName: 'SpawnReplacement',
      targetGap: 1,
    });
    expect(spawnRequests[0]?.reasonMetrics).toMatchObject({
      replacementTtlThreshold: 300,
      replacementWorkerCount: 1,
      spawningWorkerCount: 0,
    });
  });

  it('counts healthy TTL workers normally without creating replacement pressure', () => {
    expect(
      selectBootstrapWorkerSpawnRequests(
        createSpawningWorld({
          controllerStructureLimits: {
            extension: {
              3: 10,
            },
          },
          gameTime: 70,
          rooms: [
            createRoomSnapshot('W51N21', {
              controllerLevel: 3,
              energyStructures: [{ availableEnergy: 550, energyCapacity: 550 }],
              structures: [
                { structureType: 'spawn' },
                { structureType: 'extension' },
                { structureType: 'extension' },
                { structureType: 'extension' },
                { structureType: 'extension' },
                { structureType: 'extension' },
                { structureType: 'extension' },
                { structureType: 'extension' },
                { structureType: 'extension' },
                { structureType: 'extension' },
                { structureType: 'extension' },
              ],
              workerCreepCount: 10,
              workerCreepWorkParts: 20,
              workerCreeps: createWorkerCreeps(10, 300),
            }),
          ],
          workerCreepCount: 10,
          spawns: [
            createSpawnSnapshot('SpawnHealthy', 'W51N21', {
              availableEnergy: 550,
              energyCapacity: 550,
            }),
          ],
        }),
      ),
    ).toEqual([]);
  });

  it('counts spawning workers against bounded replacement pressure', () => {
    const spawnRequests = selectBootstrapWorkerSpawnRequests(
      createSpawningWorld({
        controllerStructureLimits: {
          extension: {
            3: 10,
          },
        },
        gameTime: 71,
        rooms: [
          createRoomSnapshot('W51N21', {
            controllerLevel: 3,
            energyStructures: [{ availableEnergy: 550, energyCapacity: 550 }],
            spawningWorkerCount: 1,
            structures: [
              { structureType: 'spawn' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
            ],
            workerCreepCount: 10,
            workerCreepWorkParts: 20,
            workerCreeps: [
              ...createWorkerCreeps(8, 1500),
              { ticksToLive: 200 },
              { ticksToLive: 250 },
            ],
          }),
        ],
        workerCreepCount: 10,
        spawns: [
          createSpawnSnapshot('SpawnReplacement', 'W51N21', {
            availableEnergy: 550,
            energyCapacity: 550,
          }),
        ],
      }),
    );

    expect(spawnRequests).toHaveLength(1);
    expect(spawnRequests[0]).toMatchObject({
      targetGap: 1,
    });
    expect(spawnRequests[0]?.reasonMetrics).toMatchObject({
      replacementWorkerCount: 2,
      spawningWorkerCount: 1,
    });
  });

  it('does not create unbounded replacement pressure beyond expiring workers', () => {
    expect(
      selectBootstrapWorkerSpawnRequests(
        createSpawningWorld({
          controllerStructureLimits: {
            extension: {
              3: 10,
            },
          },
          gameTime: 72,
          rooms: [
            createRoomSnapshot('W51N21', {
              controllerLevel: 3,
              energyStructures: [{ availableEnergy: 550, energyCapacity: 550 }],
              spawningWorkerCount: 10,
              structures: [
                { structureType: 'spawn' },
                { structureType: 'extension' },
                { structureType: 'extension' },
                { structureType: 'extension' },
                { structureType: 'extension' },
                { structureType: 'extension' },
                { structureType: 'extension' },
                { structureType: 'extension' },
                { structureType: 'extension' },
                { structureType: 'extension' },
                { structureType: 'extension' },
              ],
              workerCreepCount: 10,
              workerCreepWorkParts: 20,
              workerCreeps: createWorkerCreeps(10, 1),
            }),
          ],
          workerCreepCount: 10,
          spawns: [
            createSpawnSnapshot('SpawnBounded', 'W51N21', {
              availableEnergy: 550,
              energyCapacity: 550,
            }),
          ],
        }),
      ),
    ).toEqual([]);
  });

  it('does not request another replacement after the completed replacement creates surplus', () => {
    expect(
      selectBootstrapWorkerSpawnRequests(
        createSpawningWorld({
          controllerStructureLimits: {
            extension: {
              3: 10,
            },
          },
          gameTime: 74,
          rooms: [
            createRoomSnapshot('W51N21', {
              controllerLevel: 3,
              energyStructures: [{ availableEnergy: 550, energyCapacity: 550 }],
              structures: [
                { structureType: 'spawn' },
                { structureType: 'extension' },
                { structureType: 'extension' },
                { structureType: 'extension' },
                { structureType: 'extension' },
                { structureType: 'extension' },
                { structureType: 'extension' },
                { structureType: 'extension' },
                { structureType: 'extension' },
                { structureType: 'extension' },
                { structureType: 'extension' },
              ],
              workerCreepCount: 11,
              workerCreepWorkParts: 22,
              workerCreeps: [...createWorkerCreeps(10, 1500), { ticksToLive: 1 }],
            }),
          ],
          workerCreepCount: 11,
          spawns: [
            createSpawnSnapshot('SpawnBounded', 'W51N21', {
              availableEnergy: 550,
              energyCapacity: 550,
            }),
          ],
        }),
      ),
    ).toEqual([]);
  });

  it('keeps survival requests higher priority than replacement pressure', () => {
    expect(
      planWorkerSpawn({
        controllerStructureLimits: {
          extension: {
            3: 10,
          },
        },
        gameTime: 73,
        rooms: [
          createRoomSnapshot('W1N1', {
            controllerLevel: 3,
            workerCreepCount: 2,
            workerCreepWorkParts: 2,
          }),
          createRoomSnapshot('W2N2', {
            controllerLevel: 3,
            energyStructures: [{ availableEnergy: 550, energyCapacity: 550 }],
            structures: [
              { structureType: 'spawn' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
            ],
            workerCreepCount: 10,
            workerCreepWorkParts: 20,
            workerCreeps: createWorkerCreeps(10, 1),
          }),
        ],
        workerCreepCount: 2,
        spawns: [
          createSpawnSnapshot('SpawnSurvival', 'W1N1'),
          createSpawnSnapshot('SpawnReplacement', 'W2N2', {
            availableEnergy: 550,
            energyCapacity: 550,
          }),
        ],
      }),
    ).toEqual({
      body: ['work', 'carry', 'carry', 'move', 'move'],
      creepName: 'SpawnSurvival-worker-73',
      spawnName: 'SpawnSurvival',
    });
  });

  it('keeps the 550 -> 300 -> 200 early worker body fallback order', () => {
    expect(
      [
        {
          availableEnergy: 550,
          energyCapacity: 550,
          expectedBody: ['work', 'work', 'carry', 'carry', 'carry', 'move', 'move', 'move', 'move'],
          gameTime: 62,
        },
        {
          availableEnergy: 300,
          energyCapacity: 300,
          expectedBody: ['work', 'carry', 'carry', 'move', 'move'],
          gameTime: 63,
        },
        {
          availableEnergy: 200,
          energyCapacity: 300,
          expectedBody: ['work', 'carry', 'move'],
          gameTime: 64,
        },
      ].map(({ availableEnergy, energyCapacity, expectedBody, gameTime }) => ({
        expected: {
          body: expectedBody,
          creepName: `Spawn${gameTime}-worker-${gameTime}`,
          spawnName: `Spawn${gameTime}`,
        },
        result: planWorkerSpawn({
          gameTime,
          workerCreepCount: 0,
          spawns: [
            {
              availableEnergy,
              energyCapacity,
              isSpawning: false,
              name: `Spawn${gameTime}`,
            },
          ],
        }),
      })),
    ).toEqual([
      {
        expected: {
          body: ['work', 'work', 'carry', 'carry', 'carry', 'move', 'move', 'move', 'move'],
          creepName: 'Spawn62-worker-62',
          spawnName: 'Spawn62',
        },
        result: {
          body: ['work', 'work', 'carry', 'carry', 'carry', 'move', 'move', 'move', 'move'],
          creepName: 'Spawn62-worker-62',
          spawnName: 'Spawn62',
        },
      },
      {
        expected: {
          body: ['work', 'carry', 'carry', 'move', 'move'],
          creepName: 'Spawn63-worker-63',
          spawnName: 'Spawn63',
        },
        result: {
          body: ['work', 'carry', 'carry', 'move', 'move'],
          creepName: 'Spawn63-worker-63',
          spawnName: 'Spawn63',
        },
      },
      {
        expected: {
          body: ['work', 'carry', 'move'],
          creepName: 'Spawn64-worker-64',
          spawnName: 'Spawn64',
        },
        result: {
          body: ['work', 'carry', 'move'],
          creepName: 'Spawn64-worker-64',
          spawnName: 'Spawn64',
        },
      },
    ]);
  });

  it('skips spawning or unavailable higher-priority requests and picks the next executable request', () => {
    expect(
      planWorkerSpawn({
        constructionCosts: {
          extension: 3000,
        },
        controllerStructureLimits: {
          extension: {
            2: 5,
          },
        },
        gameTime: 65,
        rooms: [
          createRoomSnapshot('W1N1', {
            workerCreepCount: 1,
          }),
          createRoomSnapshot('W2N2', {
            workerCreepCount: 2,
          }),
          createRoomSnapshot('W3N3', {
            constructionSites: [
              {
                remainingWork: 3000,
                structureType: 'extension',
              },
            ],
            workerCreepCount: 4,
          }),
        ],
        workerCreepCount: 4,
        spawns: [
          createSpawnSnapshot('SpawnBusySurvival', 'W1N1', {
            isSpawning: true,
          }),
          createSpawnSnapshot('SpawnEmptySurvival', 'W2N2', {
            availableEnergy: 199,
          }),
          createSpawnSnapshot('SpawnDevelopment', 'W3N3'),
        ],
      }),
    ).toEqual({
      body: ['work', 'carry', 'carry', 'move', 'move'],
      creepName: 'SpawnDevelopment-worker-65',
      spawnName: 'SpawnDevelopment',
    });
  });

  it('uses the balanced 300-energy early worker body', () => {
    expect(
      planWorkerSpawn({
        gameTime: 41,
        workerCreepCount: 1,
        spawns: [
          {
            availableEnergy: 300,
            energyCapacity: 300,
            isSpawning: false,
            name: 'Spawn1',
          },
        ],
      }),
    ).toEqual({
      body: ['work', 'carry', 'carry', 'move', 'move'],
      creepName: 'Spawn1-worker-41',
      spawnName: 'Spawn1',
    });
  });

  it('uses captured Screeps body part costs when selecting a worker body', () => {
    expect(
      planWorkerSpawn({
        bodyPartCosts: {
          carry: 100,
          move: 50,
          work: 100,
        },
        gameTime: 45,
        workerCreepCount: 0,
        spawns: [
          {
            availableEnergy: 300,
            energyCapacity: 300,
            isSpawning: false,
            name: 'Spawn1',
          },
        ],
      }),
    ).toEqual({
      body: ['work', 'carry', 'move'],
      creepName: 'Spawn1-worker-45',
      spawnName: 'Spawn1',
    });
  });

  it('keeps the emergency worker body available when only 200 energy is ready', () => {
    expect(
      planWorkerSpawn({
        gameTime: 42,
        workerCreepCount: 0,
        spawns: [
          {
            availableEnergy: 200,
            energyCapacity: 300,
            isSpawning: false,
            name: 'Spawn1',
          },
        ],
      }),
    ).toEqual({
      body: ['work', 'carry', 'move'],
      creepName: 'Spawn1-worker-42',
      spawnName: 'Spawn1',
    });
  });

  it('does not spawn another worker when the adaptive RCL2 development population is saturated', () => {
    expect(
      planWorkerSpawn({
        gameTime: 43,
        workerCreepCount: 10,
        spawns: [
          {
            availableEnergy: 300,
            energyCapacity: 300,
            isSpawning: false,
            name: 'Spawn1',
          },
        ],
      }),
    ).toBeNull();
  });

  it('continues spawning up to the RCL2 construction worker target when the room economy is safe', () => {
    expect(
      planWorkerSpawn({
        constructionCosts: {
          extension: 3000,
        },
        controllerStructureLimits: {
          extension: {
            2: 5,
          },
        },
        gameTime: 46,
        rooms: [
          {
            constructionSites: [
              {
                remainingWork: 3000,
                structureType: 'extension',
              },
            ],
            controllerLevel: 2,
            energyStructures: [
              {
                availableEnergy: 300,
                energyCapacity: 300,
              },
            ],
            roomName: 'W1N1',
            structures: [
              {
                structureType: 'spawn',
              },
            ],
            ticksToDowngrade: 9000,
            workerCreepCount: 4,
          },
        ],
        workerCreepCount: 4,
        spawns: [
          {
            availableEnergy: 300,
            energyCapacity: 300,
            isSpawning: false,
            name: 'Spawn1',
            roomName: 'W1N1',
          },
        ],
      }),
    ).toEqual({
      body: ['work', 'carry', 'carry', 'move', 'move'],
      creepName: 'Spawn1-worker-46',
      spawnName: 'Spawn1',
    });
  });

  it('continues spawning up to the RCL2 development worker target after all five extensions are built', () => {
    expect(
      planWorkerSpawn({
        constructionCosts: {
          extension: 3000,
        },
        controllerStructureLimits: {
          extension: {
            2: 5,
          },
        },
        gameTime: 51,
        rooms: [
          {
            constructionSites: [],
            controllerLevel: 2,
            energyStructures: [
              {
                availableEnergy: 550,
                energyCapacity: 550,
              },
            ],
            roomName: 'W1N1',
            structures: [
              {
                structureType: 'spawn',
              },
              {
                structureType: 'extension',
              },
              {
                structureType: 'extension',
              },
              {
                structureType: 'extension',
              },
              {
                structureType: 'extension',
              },
              {
                structureType: 'extension',
              },
            ],
            ticksToDowngrade: 9000,
            workerCreepCount: 4,
          },
        ],
        workerCreepCount: 4,
        spawns: [
          {
            availableEnergy: 300,
            energyCapacity: 300,
            isSpawning: false,
            name: 'Spawn1',
            roomName: 'W1N1',
          },
        ],
      }),
    ).toEqual({
      body: ['work', 'carry', 'carry', 'move', 'move'],
      creepName: 'Spawn1-worker-51',
      spawnName: 'Spawn1',
    });
  });

  it('uses captured construction cost when missing RCL2 extensions create build backlog', () => {
    expect(
      planWorkerSpawn({
        constructionCosts: {
          extension: 3000,
        },
        controllerStructureLimits: {
          extension: {
            2: 5,
          },
        },
        gameTime: 50,
        rooms: [
          {
            constructionSites: [],
            controllerLevel: 2,
            energyStructures: [
              {
                availableEnergy: 300,
                energyCapacity: 300,
              },
            ],
            roomName: 'W1N1',
            structures: [
              {
                structureType: 'spawn',
              },
            ],
            ticksToDowngrade: 9000,
            workerCreepCount: 4,
          },
        ],
        workerCreepCount: 4,
        spawns: [
          {
            availableEnergy: 300,
            energyCapacity: 300,
            isSpawning: false,
            name: 'Spawn1',
            roomName: 'W1N1',
          },
        ],
      }),
    ).toEqual({
      body: ['work', 'carry', 'carry', 'move', 'move'],
      creepName: 'Spawn1-worker-50',
      spawnName: 'Spawn1',
    });
  });

  it('continues spawning a W51N21-like RCL2 room above the old fixed worker target', () => {
    expect(
      planWorkerSpawn({
        constructionCosts: {
          extension: 3000,
        },
        controllerStructureLimits: {
          extension: {
            2: 5,
          },
        },
        gameTime: 47,
        rooms: [
          {
            constructionSites: [
              {
                remainingWork: 33509,
                structureType: 'road',
              },
            ],
            controllerLevel: 2,
            energyStructures: [
              {
                availableEnergy: 550,
                energyCapacity: 550,
              },
            ],
            roomName: 'W1N1',
            sourceCount: 2,
            structures: [
              {
                structureType: 'spawn',
              },
              {
                structureType: 'extension',
              },
              {
                structureType: 'extension',
              },
              {
                structureType: 'extension',
              },
              {
                structureType: 'extension',
              },
              {
                structureType: 'extension',
              },
            ],
            ticksToDowngrade: 9000,
            workerCreepCount: 5,
            workerCreepWorkParts: 10,
          },
        ],
        workerCreepCount: 5,
        spawns: [
          {
            availableEnergy: 550,
            energyCapacity: 550,
            isSpawning: false,
            name: 'Spawn1',
            roomName: 'W1N1',
          },
        ],
      }),
    ).toEqual({
      body: ['work', 'work', 'carry', 'carry', 'carry', 'move', 'move', 'move', 'move'],
      creepName: 'Spawn1-worker-47',
      spawnName: 'Spawn1',
    });
  });

  it('continues spawning a W51N21-like safe RCL3 room while one extension is empty', () => {
    expect(
      planWorkerSpawn({
        constructionCosts: {
          extension: 3000,
        },
        controllerStructureLimits: {
          extension: {
            3: 10,
          },
        },
        gameTime: 66,
        rooms: [
          {
            constructionSites: [
              { remainingWork: 3000, structureType: 'extension' },
              { remainingWork: 3000, structureType: 'extension' },
              { remainingWork: 1776, structureType: 'extension' },
              { remainingWork: 5000, structureType: 'tower' },
            ],
            controllerLevel: 3,
            energyStructures: [
              {
                availableEnergy: 600,
                energyCapacity: 650,
              },
            ],
            roomName: 'W51N21',
            sourceCount: 2,
            structures: [
              { structureType: 'spawn' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
              { structureType: 'extension' },
            ],
            ticksToDowngrade: 9000,
            workerCreepCount: 5,
            workerCreepWorkParts: 10,
          },
        ],
        workerCreepCount: 5,
        spawns: [
          {
            availableEnergy: 600,
            energyCapacity: 650,
            isSpawning: false,
            name: 'Spawn1',
            roomName: 'W51N21',
          },
        ],
      }),
    ).toEqual({
      body: ['work', 'work', 'carry', 'carry', 'carry', 'move', 'move', 'move', 'move'],
      creepName: 'Spawn1-worker-66',
      spawnName: 'Spawn1',
    });
  });

  it('keeps survival-only spawning at the survival worker floor during construction backlog', () => {
    expect(
      planSurvivalWorkerSpawn({
        constructionCosts: {
          extension: 3000,
        },
        controllerStructureLimits: {
          extension: {
            2: 5,
          },
        },
        gameTime: 47,
        rooms: [
          {
            constructionSites: [
              {
                remainingWork: 3000,
                structureType: 'extension',
              },
            ],
            controllerLevel: 2,
            energyStructures: [
              {
                availableEnergy: 300,
                energyCapacity: 300,
              },
            ],
            roomName: 'W1N1',
            structures: [
              {
                structureType: 'spawn',
              },
            ],
            ticksToDowngrade: 9000,
            workerCreepCount: 3,
          },
        ],
        workerCreepCount: 3,
        spawns: [
          {
            availableEnergy: 300,
            energyCapacity: 300,
            isSpawning: false,
            name: 'Spawn1',
            roomName: 'W1N1',
          },
        ],
      }),
    ).toBeNull();
  });

  it('keeps worker demand at the survival floor when the controller is not safe', () => {
    expect(
      planWorkerSpawn({
        constructionCosts: {
          extension: 3000,
        },
        controllerStructureLimits: {
          extension: {
            2: 5,
          },
        },
        gameTime: 48,
        rooms: [
          {
            constructionSites: [
              {
                remainingWork: 3000,
                structureType: 'extension',
              },
            ],
            controllerLevel: 2,
            energyStructures: [
              {
                availableEnergy: 300,
                energyCapacity: 300,
              },
            ],
            roomName: 'W1N1',
            structures: [
              {
                structureType: 'spawn',
              },
            ],
            ticksToDowngrade: 8999,
            workerCreepCount: 4,
          },
        ],
        workerCreepCount: 4,
        spawns: [
          {
            availableEnergy: 300,
            energyCapacity: 300,
            isSpawning: false,
            name: 'Spawn1',
            roomName: 'W1N1',
          },
        ],
      }),
    ).toBeNull();
  });

  it('keeps safe development worker demand executable while spawn or extension refill is unstable', () => {
    expect(
      planWorkerSpawn({
        constructionCosts: {
          extension: 3000,
        },
        controllerStructureLimits: {
          extension: {
            2: 5,
          },
        },
        gameTime: 49,
        rooms: [
          {
            constructionSites: [
              {
                remainingWork: 3000,
                structureType: 'extension',
              },
            ],
            controllerLevel: 2,
            energyStructures: [
              {
                availableEnergy: 250,
                energyCapacity: 300,
              },
            ],
            roomName: 'W1N1',
            structures: [
              {
                structureType: 'spawn',
              },
            ],
            ticksToDowngrade: 9000,
            workerCreepCount: 4,
          },
        ],
        workerCreepCount: 4,
        spawns: [
          {
            availableEnergy: 300,
            energyCapacity: 300,
            isSpawning: false,
            name: 'Spawn1',
            roomName: 'W1N1',
          },
        ],
      }),
    ).toEqual({
      body: ['work', 'carry', 'carry', 'move', 'move'],
      creepName: 'Spawn1-worker-49',
      spawnName: 'Spawn1',
    });
  });

  it('waits until a spawn has enough energy for a worker body', () => {
    expect(
      planWorkerSpawn({
        gameTime: 44,
        workerCreepCount: 0,
        spawns: [
          {
            availableEnergy: 199,
            energyCapacity: 300,
            isSpawning: false,
            name: 'Spawn1',
          },
        ],
      }),
    ).toBeNull();
  });
});
