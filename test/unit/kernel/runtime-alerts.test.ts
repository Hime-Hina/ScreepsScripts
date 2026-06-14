import { describe, expect, it } from 'vitest';

import { selectRuntimeAlertDecisions } from '../../../src/kernel/runtime-alerts';
import type { DefenseWorldSnapshot } from '../../../src/defense/defense-planner';
import type { SpawningWorldSnapshot } from '../../../src/spawning/spawn-decision';

const createSpawningWorld = (
  roomOverrides: Partial<SpawningWorldSnapshot['rooms'][number]>,
): SpawningWorldSnapshot => ({
  bodyPartCosts: {
    carry: 50,
    move: 50,
    work: 100,
  },
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
          availableEnergy: 200,
          energyCapacity: 300,
        },
      ],
      roomName: 'W1N1',
      structures: [
        {
          structureType: 'spawn',
        },
      ],
      ticksToDowngrade: 4999,
      workerCreepCount: 2,
      ...roomOverrides,
    },
  ],
  spawns: [
    {
      availableEnergy: 200,
      energyCapacity: 300,
      isSpawning: false,
      name: 'Spawn1',
      roomName: 'W1N1',
    },
  ],
});

const emptyDefenseWorld: DefenseWorldSnapshot = {
  bodyPartConstants: {
    attack: 'attack',
    heal: 'heal',
    move: 'move',
    rangedAttack: 'ranged_attack',
    work: 'work',
  },
  bodyPartPowers: {
    attack: 30,
    dismantle: 50,
    heal: 12,
    rangedAttack: 10,
  },
  controllers: [],
  coreStructures: [],
  hostileCreeps: [],
  roomNames: ['W1N1'],
};

describe('runtime alert decisions', () => {
  it('creates throttled notify decisions for survival risks', () => {
    const alertDecisions = selectRuntimeAlertDecisions({
      actionFailures: [],
      defenseWorld: {
        ...emptyDefenseWorld,
        hostileCreeps: [
          {
            bodyParts: [{ hits: 100, type: 'attack' }],
            hits: 100,
            id: 'hostile-1',
            owner: 'Invader',
            roomName: 'W1N1',
            x: 10,
            y: 10,
          },
        ],
      },
      gameTime: 51,
      spawningWorld: createSpawningWorld({}),
    });

    expect(alertDecisions).toEqual([
      {
        groupInterval: 100,
        message: 'alert=controller-downgrade-critical room=W1N1 ticksToDowngrade=4999',
        type: 'notify',
      },
      {
        groupInterval: 100,
        message: 'alert=worker-count-low room=W1N1 workers=2',
        type: 'notify',
      },
      {
        groupInterval: 100,
        message: 'alert=spawn-energy-low room=W1N1 energy=200/300',
        type: 'notify',
      },
      {
        groupInterval: 100,
        message: 'alert=hostile-present room=W1N1 hostile=hostile-1 owner=Invader',
        type: 'notify',
      },
    ]);
  });

  it('does not notify for transient low spawn energy when the room is healthy', () => {
    expect(
      selectRuntimeAlertDecisions({
        actionFailures: [],
        defenseWorld: emptyDefenseWorld,
        gameTime: 51,
        spawningWorld: createSpawningWorld({
          energyStructures: [
            {
              availableEnergy: 100,
              energyCapacity: 300,
            },
          ],
          ticksToDowngrade: 9000,
          workerCreepCount: 5,
        }),
      }),
    ).toEqual([]);
  });

  it('does not notify when survival signals are stable', () => {
    expect(
      selectRuntimeAlertDecisions({
        actionFailures: [],
        defenseWorld: emptyDefenseWorld,
        gameTime: 51,
        spawningWorld: createSpawningWorld({
          energyStructures: [
            {
              availableEnergy: 300,
              energyCapacity: 300,
            },
          ],
          ticksToDowngrade: 9000,
          workerCreepCount: 3,
        }),
      }),
    ).toEqual([]);
  });
});
