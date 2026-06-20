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

  it('orders hostile targets by range, hits, and id', () => {
    expect(
      planTowerActions(
        createTowerWorld({
          hostileCreeps: [
            {
              hits: 10,
              id: 'hostile-far-low-hits',
              roomName: 'W1N1',
              x: 20,
              y: 10,
            },
            {
              hits: 50,
              id: 'hostile-near-b',
              roomName: 'W1N1',
              x: 12,
              y: 10,
            },
            {
              hits: 50,
              id: 'hostile-near-a',
              roomName: 'W1N1',
              x: 12,
              y: 10,
            },
            {
              hits: 100,
              id: 'hostile-near-high-hits',
              roomName: 'W1N1',
              x: 12,
              y: 10,
            },
          ],
          towers: [createTower()],
        }),
      ),
    ).toEqual([
      {
        hostileCreepId: 'hostile-near-a',
        roomName: 'W1N1',
        towerId: 'tower-1',
        type: 'attackHostileCreep',
      },
    ]);
  });

  it('orders heal targets by hit ratio, range, and name', () => {
    expect(
      planTowerActions(
        createTowerWorld({
          ownedCreeps: [
            {
              hits: 20,
              hitsMax: 100,
              name: 'WorkerFarCritical',
              roomName: 'W1N1',
              x: 20,
              y: 10,
            },
            {
              hits: 30,
              hitsMax: 100,
              name: 'WorkerNearLessCritical',
              roomName: 'W1N1',
              x: 11,
              y: 10,
            },
            {
              hits: 20,
              hitsMax: 100,
              name: 'WorkerB',
              roomName: 'W1N1',
              x: 12,
              y: 10,
            },
            {
              hits: 20,
              hitsMax: 100,
              name: 'WorkerA',
              roomName: 'W1N1',
              x: 12,
              y: 10,
            },
          ],
          towers: [createTower()],
        }),
      ),
    ).toEqual([
      {
        creepName: 'WorkerA',
        roomName: 'W1N1',
        towerId: 'tower-1',
        type: 'healOwnedCreep',
      },
    ]);
  });

  it('repairs only conservative non-full targets by hit ratio, range, and id', () => {
    expect(
      planTowerActions(
        createTowerWorld({
          repairTargets: [
            {
              hits: 10,
              hitsMax: 100,
              id: 'road-critical-skipped',
              roomName: 'W1N1',
              structureType: 'road',
              x: 9,
              y: 10,
            },
            {
              hits: 20,
              hitsMax: 100,
              id: 'tower-far-critical',
              roomName: 'W1N1',
              structureType: 'tower',
              x: 20,
              y: 10,
            },
            {
              hits: 50,
              hitsMax: 100,
              id: 'extension-fuller',
              roomName: 'W1N1',
              structureType: 'extension',
              x: 11,
              y: 10,
            },
            {
              hits: 20,
              hitsMax: 100,
              id: 'tower-near-b',
              roomName: 'W1N1',
              structureType: 'tower',
              x: 12,
              y: 10,
            },
            {
              hits: 20,
              hitsMax: 100,
              id: 'tower-near-a',
              roomName: 'W1N1',
              structureType: 'tower',
              x: 12,
              y: 10,
            },
            {
              hits: 100,
              hitsMax: 100,
              id: 'spawn-full',
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
        structureId: 'tower-near-a',
        towerId: 'tower-1',
        type: 'repairStructure',
      },
    ]);
  });
});
