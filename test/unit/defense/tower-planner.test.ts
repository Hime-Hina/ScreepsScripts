import { describe, expect, it } from 'vitest';

import { planTowerActions, type TowerWorldSnapshot } from '../../../src/defense/tower-planner';

const createTowerWorld = (towerWorld: Partial<TowerWorldSnapshot> = {}): TowerWorldSnapshot => ({
  hostileCreeps: [],
  ownedCreeps: [],
  repairTargets: [],
  towerEnergyCost: 10,
  towers: [],
  ...towerWorld,
});

const createTower = (
  towerSnapshot: Partial<TowerWorldSnapshot['towers'][number]> = {},
): TowerWorldSnapshot['towers'][number] => ({
  energy: 100,
  energyCapacity: 1000,
  id: 'tower-1',
  roomName: 'W1N1',
  x: 10,
  y: 10,
  ...towerSnapshot,
});

describe('minimal tower policy planner', () => {
  it('attacks hostiles before healing or repairing', () => {
    expect(
      planTowerActions(
        createTowerWorld({
          hostileCreeps: [
            {
              hits: 100,
              id: 'hostile-1',
              roomName: 'W1N1',
              x: 12,
              y: 10,
            },
          ],
          ownedCreeps: [
            {
              hits: 50,
              hitsMax: 100,
              name: 'Worker1',
              roomName: 'W1N1',
              x: 11,
              y: 10,
            },
          ],
          repairTargets: [
            {
              hits: 2500,
              hitsMax: 5000,
              id: 'spawn-1',
              roomName: 'W1N1',
              structureType: 'spawn',
              x: 11,
              y: 11,
            },
          ],
          towers: [createTower()],
        }),
      ),
    ).toEqual([
      {
        hostileCreepId: 'hostile-1',
        roomName: 'W1N1',
        towerId: 'tower-1',
        type: 'attackHostileCreep',
      },
    ]);
  });

  it('heals wounded owned creeps when no hostile target exists', () => {
    expect(
      planTowerActions(
        createTowerWorld({
          ownedCreeps: [
            {
              hits: 90,
              hitsMax: 100,
              name: 'WorkerHealthy',
              roomName: 'W1N1',
              x: 11,
              y: 10,
            },
            {
              hits: 25,
              hitsMax: 100,
              name: 'WorkerWounded',
              roomName: 'W1N1',
              x: 12,
              y: 10,
            },
          ],
          repairTargets: [
            {
              hits: 2500,
              hitsMax: 5000,
              id: 'spawn-1',
              roomName: 'W1N1',
              structureType: 'spawn',
              x: 11,
              y: 11,
            },
          ],
          towers: [createTower()],
        }),
      ),
    ).toEqual([
      {
        creepName: 'WorkerWounded',
        roomName: 'W1N1',
        towerId: 'tower-1',
        type: 'healOwnedCreep',
      },
    ]);
  });

  it('repairs conservatively only when the tower has reserve energy', () => {
    expect(
      planTowerActions(
        createTowerWorld({
          repairTargets: [
            {
              hits: 4000,
              hitsMax: 5000,
              id: 'road-1',
              roomName: 'W1N1',
              structureType: 'road',
              x: 9,
              y: 10,
            },
            {
              hits: 3000,
              hitsMax: 5000,
              id: 'spawn-1',
              roomName: 'W1N1',
              structureType: 'spawn',
              x: 11,
              y: 10,
            },
          ],
          towers: [createTower({ energy: 700 })],
        }),
      ),
    ).toEqual([
      {
        roomName: 'W1N1',
        structureId: 'spawn-1',
        towerId: 'tower-1',
        type: 'repairStructure',
      },
    ]);

    expect(
      planTowerActions(
        createTowerWorld({
          repairTargets: [
            {
              hits: 3000,
              hitsMax: 5000,
              id: 'spawn-1',
              roomName: 'W1N1',
              structureType: 'spawn',
              x: 11,
              y: 10,
            },
          ],
          towers: [createTower({ energy: 499 })],
        }),
      ),
    ).toEqual([]);
  });

  it('does not act when tower energy is below action cost', () => {
    expect(
      planTowerActions(
        createTowerWorld({
          hostileCreeps: [
            {
              hits: 100,
              id: 'hostile-1',
              roomName: 'W1N1',
              x: 12,
              y: 10,
            },
          ],
          towers: [createTower({ energy: 9 })],
        }),
      ),
    ).toEqual([]);
  });
});
