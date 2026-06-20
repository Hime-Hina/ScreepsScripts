import { describe, expect, it } from 'vitest';

import {
  planBootstrapSurvivalWorkerSpawn,
  planBootstrapWorkerSpawn,
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
  sourceCount: roomSnapshot.sourceCount ?? 2,
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
