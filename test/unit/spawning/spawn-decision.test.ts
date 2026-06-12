import { describe, expect, it } from 'vitest';

import { planBootstrapWorkerSpawn } from '../../../src/spawning/spawn-decision';

describe('bootstrap worker spawn decision', () => {
  it('uses the balanced 300-energy early worker body', () => {
    expect(
      planBootstrapWorkerSpawn({
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

  it('keeps the emergency worker body available when only 200 energy is ready', () => {
    expect(
      planBootstrapWorkerSpawn({
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

  it('does not spawn another worker when the bootstrap population is complete', () => {
    expect(
      planBootstrapWorkerSpawn({
        gameTime: 43,
        workerCreepCount: 3,
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
  it('waits until a spawn has enough energy for a worker body', () => {
    expect(
      planBootstrapWorkerSpawn({
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
