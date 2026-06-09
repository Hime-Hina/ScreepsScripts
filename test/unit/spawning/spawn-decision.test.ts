import { describe, expect, it } from 'vitest';

import { planInitialWorkerSpawn } from '../../../src/spawning/spawn-decision';

describe('initial worker spawn decision', () => {
  it('selects one idle spawn when no creeps exist', () => {
    expect(
      planInitialWorkerSpawn({
        creepCount: 0,
        spawns: [
          {
            availableEnergy: 300,
            isSpawning: false,
            name: 'Spawn1',
          },
        ],
      }),
    ).toEqual({
      body: ['work', 'carry', 'move'],
      creepName: 'Worker1',
      spawnName: 'Spawn1',
    });
  });

  it('does not spawn the initial worker when a creep already exists', () => {
    expect(
      planInitialWorkerSpawn({
        creepCount: 1,
        spawns: [
          {
            availableEnergy: 300,
            isSpawning: false,
            name: 'Spawn1',
          },
        ],
      }),
    ).toBeNull();
  });
});
