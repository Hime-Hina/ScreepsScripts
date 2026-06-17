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

interface TestSpawningWorldSnapshot extends Omit<
  SpawningWorldSnapshot,
  'bodyPartCosts' | 'constructionCosts' | 'controllerStructureLimits' | 'rooms' | 'spawns'
> {
  readonly bodyPartCosts?: SpawningWorldSnapshot['bodyPartCosts'];
  readonly constructionCosts?: SpawningWorldSnapshot['constructionCosts'];
  readonly controllerStructureLimits?: SpawningWorldSnapshot['controllerStructureLimits'];
  readonly rooms?: SpawningWorldSnapshot['rooms'];
  readonly spawns: readonly TestSpawnSnapshot[];
  readonly workerCreepCount: number;
}

const planWorkerSpawn = (spawningWorld: TestSpawningWorldSnapshot) => {
  const roomName = spawningWorld.spawns[0]?.roomName ?? 'W1N1';

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
        roomName,
        structures: [
          {
            structureType: 'spawn',
          },
        ],
        ticksToDowngrade: 9000,
        workerCreepCount: spawningWorld.workerCreepCount,
      },
    ],
    ...spawningWorld,
    spawns: spawningWorld.spawns.map((spawnSnapshot) => ({
      roomName,
      ...spawnSnapshot,
    })),
  });
};

const planSurvivalWorkerSpawn = (spawningWorld: TestSpawningWorldSnapshot) => {
  const roomName = spawningWorld.spawns[0]?.roomName ?? 'W1N1';

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
        roomName,
        structures: [
          {
            structureType: 'spawn',
          },
        ],
        ticksToDowngrade: 9000,
        workerCreepCount: spawningWorld.workerCreepCount,
      },
    ],
    ...spawningWorld,
    spawns: spawningWorld.spawns.map((spawnSnapshot) => ({
      roomName,
      ...spawnSnapshot,
    })),
  });
};

describe('bootstrap worker spawn decision', () => {
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

  it('does not spawn another worker when the RCL2 development population is complete', () => {
    expect(
      planWorkerSpawn({
        gameTime: 43,
        workerCreepCount: 5,
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

  it('stops at the RCL2 construction worker target', () => {
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
            workerCreepCount: 5,
          },
        ],
        workerCreepCount: 5,
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

  it('keeps worker demand at the survival floor when spawn or extension refill is unstable', () => {
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
    ).toBeNull();
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
