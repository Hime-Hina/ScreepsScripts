import { describe, expect, it } from 'vitest';

import {
  isWorkerRepairStructureType,
  planBootstrapWorkerActions,
  type WorkerWorldSnapshot,
} from '../../../src/creeps/worker-decision';

const TEST_CONTROLLER_LEVEL = 2;
const TEST_CONTROLLER_SAFE_TICKS = 9000;
const TEST_CONTROLLER_RECOVERING_TICKS = 8500;
const TEST_CONTROLLER_WARNING_TICKS = 7999;
const TEST_CONTROLLER_CRITICAL_TICKS = 4999;

const planWorkerActions = (
  workerWorld: Omit<
    WorkerWorldSnapshot,
    'constructionEligibilities' | 'energyPickups' | 'energyWithdrawals' | 'repairTargets'
  > &
    Partial<
      Pick<
        WorkerWorldSnapshot,
        'constructionEligibilities' | 'energyPickups' | 'energyWithdrawals' | 'repairTargets'
      >
    >,
) => {
  const {
    constructionEligibilities = [
      {
        roomName: 'W1N1',
        type: 'constructionAllowed',
      },
    ],
    energyPickups = [],
    energyWithdrawals = [],
    repairTargets = [],
    ...workerWorldSnapshot
  } = workerWorld;

  return planBootstrapWorkerActions({
    constructionEligibilities,
    energyPickups,
    energyWithdrawals,
    repairTargets,
    ...workerWorldSnapshot,
  });
};

describe('bootstrap worker action decision', () => {
  it('harvests from a source in the worker room until full', () => {
    expect(
      planWorkerActions({
        constructionSites: [],
        controllers: [
          {
            id: 'controller-1',
            level: TEST_CONTROLLER_LEVEL,
            roomName: 'W1N1',
            ticksToDowngrade: TEST_CONTROLLER_SAFE_TICKS,
          },
        ],
        creeps: [
          {
            energy: 0,
            freeCapacity: 50,
            name: 'Worker1',
            roomName: 'W1N1',
          },
        ],
        energyStructures: [],
        sources: [
          {
            id: 'source-1',
            roomName: 'W1N1',
          },
        ],
      }),
    ).toEqual([
      {
        creepName: 'Worker1',
        sourceId: 'source-1',
        type: 'harvestSource',
      },
    ]);
  });

  it('distributes harvesting workers across room sources', () => {
    expect(
      planWorkerActions({
        constructionSites: [],
        controllers: [
          {
            id: 'controller-1',
            level: TEST_CONTROLLER_LEVEL,
            roomName: 'W1N1',
            ticksToDowngrade: TEST_CONTROLLER_SAFE_TICKS,
          },
        ],
        creeps: [
          {
            energy: 0,
            freeCapacity: 50,
            name: 'WorkerA',
            roomName: 'W1N1',
          },
          {
            energy: 0,
            freeCapacity: 50,
            name: 'WorkerB',
            roomName: 'W1N1',
          },
        ],
        energyStructures: [],
        sources: [
          {
            id: 'source-a',
            roomName: 'W1N1',
          },
          {
            id: 'source-b',
            roomName: 'W1N1',
          },
        ],
      }),
    ).toEqual([
      {
        creepName: 'WorkerA',
        sourceId: 'source-a',
        type: 'harvestSource',
      },
      {
        creepName: 'WorkerB',
        sourceId: 'source-b',
        type: 'harvestSource',
      },
    ]);
  });

  it('picks up dropped energy before harvesting a source', () => {
    expect(
      planWorkerActions({
        constructionSites: [],
        controllers: [
          {
            id: 'controller-1',
            level: TEST_CONTROLLER_LEVEL,
            roomName: 'W1N1',
            ticksToDowngrade: TEST_CONTROLLER_SAFE_TICKS,
          },
        ],
        creeps: [
          {
            energy: 0,
            freeCapacity: 50,
            name: 'Worker1',
            roomName: 'W1N1',
          },
        ],
        energyPickups: [
          {
            amount: 50,
            id: 'dropped-energy-1',
            roomName: 'W1N1',
          },
        ],
        energyStructures: [],
        sources: [
          {
            id: 'source-1',
            roomName: 'W1N1',
          },
        ],
      }),
    ).toEqual([
      {
        creepName: 'Worker1',
        resourceId: 'dropped-energy-1',
        type: 'pickupEnergy',
      },
    ]);
  });

  it('assigns a small dropped energy target to only one worker in the same tick', () => {
    expect(
      planWorkerActions({
        constructionSites: [],
        controllers: [
          {
            id: 'controller-1',
            level: TEST_CONTROLLER_LEVEL,
            roomName: 'W1N1',
            ticksToDowngrade: TEST_CONTROLLER_SAFE_TICKS,
          },
        ],
        creeps: [
          {
            energy: 0,
            freeCapacity: 50,
            name: 'WorkerA',
            roomName: 'W1N1',
          },
          {
            energy: 0,
            freeCapacity: 50,
            name: 'WorkerB',
            roomName: 'W1N1',
          },
        ],
        energyPickups: [
          {
            amount: 50,
            id: 'dropped-energy-1',
            roomName: 'W1N1',
          },
        ],
        energyStructures: [],
        sources: [
          {
            id: 'source-1',
            roomName: 'W1N1',
          },
        ],
      }),
    ).toEqual([
      {
        creepName: 'WorkerA',
        resourceId: 'dropped-energy-1',
        type: 'pickupEnergy',
      },
      {
        creepName: 'WorkerB',
        sourceId: 'source-1',
        type: 'harvestSource',
      },
    ]);
  });

  it('assigns a large dropped energy target to multiple workers when capacity remains', () => {
    expect(
      planWorkerActions({
        constructionSites: [],
        controllers: [
          {
            id: 'controller-1',
            level: TEST_CONTROLLER_LEVEL,
            roomName: 'W1N1',
            ticksToDowngrade: TEST_CONTROLLER_SAFE_TICKS,
          },
        ],
        creeps: [
          {
            energy: 0,
            freeCapacity: 50,
            name: 'WorkerA',
            roomName: 'W1N1',
          },
          {
            energy: 0,
            freeCapacity: 50,
            name: 'WorkerB',
            roomName: 'W1N1',
          },
        ],
        energyPickups: [
          {
            amount: 100,
            id: 'dropped-energy-1',
            roomName: 'W1N1',
          },
        ],
        energyStructures: [],
        sources: [
          {
            id: 'source-1',
            roomName: 'W1N1',
          },
        ],
      }),
    ).toEqual([
      {
        creepName: 'WorkerA',
        resourceId: 'dropped-energy-1',
        type: 'pickupEnergy',
      },
      {
        creepName: 'WorkerB',
        resourceId: 'dropped-energy-1',
        type: 'pickupEnergy',
      },
    ]);
  });

  it('withdraws available stored energy before harvesting a source', () => {
    expect(
      planWorkerActions({
        constructionSites: [],
        controllers: [
          {
            id: 'controller-1',
            level: TEST_CONTROLLER_LEVEL,
            roomName: 'W1N1',
            ticksToDowngrade: TEST_CONTROLLER_SAFE_TICKS,
          },
        ],
        creeps: [
          {
            energy: 0,
            freeCapacity: 50,
            name: 'Worker1',
            roomName: 'W1N1',
          },
        ],
        energyStructures: [],
        energyWithdrawals: [
          {
            availableEnergy: 50,
            id: 'tombstone-1',
            roomName: 'W1N1',
          },
        ],
        sources: [
          {
            id: 'source-1',
            roomName: 'W1N1',
          },
        ],
      }),
    ).toEqual([
      {
        creepName: 'Worker1',
        structureId: 'tombstone-1',
        type: 'withdrawEnergy',
      },
    ]);
  });

  it('keeps an empty worker on its assigned source while another worker refills energy', () => {
    expect(
      planWorkerActions({
        constructionSites: [
          {
            id: 'construction-site-1',
            roomName: 'W1N1',
          },
        ],
        controllers: [
          {
            id: 'controller-1',
            level: TEST_CONTROLLER_LEVEL,
            roomName: 'W1N1',
            ticksToDowngrade: TEST_CONTROLLER_SAFE_TICKS,
          },
        ],
        creeps: [
          {
            energy: 50,
            freeCapacity: 0,
            name: 'WorkerA',
            roomName: 'W1N1',
          },
          {
            energy: 0,
            freeCapacity: 50,
            name: 'WorkerB',
            roomName: 'W1N1',
          },
        ],
        energyStructures: [
          {
            availableEnergy: 250,
            energyCapacity: 300,
            id: 'spawn-1',
            roomName: 'W1N1',
          },
        ],
        sources: [
          {
            id: 'source-a',
            roomName: 'W1N1',
          },
          {
            id: 'source-b',
            roomName: 'W1N1',
          },
        ],
      }),
    ).toEqual([
      {
        creepName: 'WorkerA',
        structureId: 'spawn-1',
        type: 'refillEnergyStructure',
      },
      {
        creepName: 'WorkerB',
        sourceId: 'source-b',
        type: 'harvestSource',
      },
    ]);
  });

  it('refills the lowest-id depleted energy structure before building or upgrading', () => {
    expect(
      planWorkerActions({
        constructionSites: [
          {
            id: 'construction-site-1',
            roomName: 'W1N1',
          },
        ],
        controllers: [
          {
            id: 'controller-1',
            level: TEST_CONTROLLER_LEVEL,
            roomName: 'W1N1',
            ticksToDowngrade: TEST_CONTROLLER_SAFE_TICKS,
          },
        ],
        creeps: [
          {
            energy: 50,
            freeCapacity: 0,
            name: 'Worker1',
            roomName: 'W1N1',
          },
        ],
        energyStructures: [
          {
            availableEnergy: 250,
            energyCapacity: 300,
            id: 'spawn-z',
            roomName: 'W1N1',
          },
          {
            availableEnergy: 0,
            energyCapacity: 50,
            id: 'extension-a',
            roomName: 'W1N1',
          },
          {
            availableEnergy: 50,
            energyCapacity: 50,
            id: 'extension-full',
            roomName: 'W1N1',
          },
        ],
        sources: [
          {
            id: 'source-1',
            roomName: 'W1N1',
          },
        ],
      }),
    ).toEqual([
      {
        creepName: 'Worker1',
        structureId: 'extension-a',
        type: 'refillEnergyStructure',
      },
    ]);
  });

  it('assigns a small energy structure refill target to only one worker in the same tick', () => {
    expect(
      planWorkerActions({
        constructionSites: [],
        controllers: [
          {
            id: 'controller-1',
            level: TEST_CONTROLLER_LEVEL,
            roomName: 'W1N1',
            ticksToDowngrade: TEST_CONTROLLER_SAFE_TICKS,
          },
        ],
        creeps: [
          {
            energy: 50,
            freeCapacity: 0,
            name: 'WorkerA',
            roomName: 'W1N1',
          },
          {
            energy: 50,
            freeCapacity: 0,
            name: 'WorkerB',
            roomName: 'W1N1',
          },
        ],
        energyStructures: [
          {
            availableEnergy: 250,
            energyCapacity: 300,
            id: 'spawn-1',
            roomName: 'W1N1',
          },
        ],
        sources: [
          {
            id: 'source-1',
            roomName: 'W1N1',
          },
        ],
      }),
    ).toEqual([
      {
        creepName: 'WorkerA',
        structureId: 'spawn-1',
        type: 'refillEnergyStructure',
      },
      {
        controllerId: 'controller-1',
        creepName: 'WorkerB',
        type: 'upgradeController',
      },
    ]);
  });

  it('builds the lowest-id construction site before upgrading when energy structures are full', () => {
    expect(
      planWorkerActions({
        constructionSites: [
          {
            id: 'construction-site-z',
            roomName: 'W1N1',
          },
          {
            id: 'construction-site-a',
            roomName: 'W1N1',
          },
        ],
        controllers: [
          {
            id: 'controller-1',
            level: TEST_CONTROLLER_LEVEL,
            roomName: 'W1N1',
            ticksToDowngrade: TEST_CONTROLLER_SAFE_TICKS,
          },
        ],
        creeps: [
          {
            energy: 50,
            freeCapacity: 0,
            name: 'Worker1',
            roomName: 'W1N1',
          },
        ],
        energyStructures: [
          {
            availableEnergy: 300,
            energyCapacity: 300,
            id: 'spawn-1',
            roomName: 'W1N1',
          },
        ],
        sources: [
          {
            id: 'source-1',
            roomName: 'W1N1',
          },
        ],
      }),
    ).toEqual([
      {
        constructionSiteId: 'construction-site-a',
        creepName: 'Worker1',
        type: 'buildConstructionSite',
      },
    ]);
  });

  it('assigns multiple workers to the same construction site in the same tick', () => {
    expect(
      planWorkerActions({
        constructionSites: [
          {
            id: 'construction-site-1',
            roomName: 'W1N1',
          },
        ],
        controllers: [
          {
            id: 'controller-1',
            level: TEST_CONTROLLER_LEVEL,
            roomName: 'W1N1',
            ticksToDowngrade: TEST_CONTROLLER_SAFE_TICKS,
          },
        ],
        creeps: [
          {
            energy: 50,
            freeCapacity: 0,
            name: 'WorkerA',
            roomName: 'W1N1',
          },
          {
            energy: 50,
            freeCapacity: 0,
            name: 'WorkerB',
            roomName: 'W1N1',
          },
        ],
        energyStructures: [
          {
            availableEnergy: 300,
            energyCapacity: 300,
            id: 'spawn-1',
            roomName: 'W1N1',
          },
        ],
        sources: [
          {
            id: 'source-1',
            roomName: 'W1N1',
          },
        ],
      }),
    ).toEqual([
      {
        constructionSiteId: 'construction-site-1',
        creepName: 'WorkerA',
        type: 'buildConstructionSite',
      },
      {
        constructionSiteId: 'construction-site-1',
        creepName: 'WorkerB',
        type: 'buildConstructionSite',
      },
    ]);
  });

  it.each([
    {
      hits: 6999,
      hitsMax: 7000,
      repairTargetId: 'spawn-1',
      structureType: 'spawn',
    },
    {
      hits: 1299,
      hitsMax: 1300,
      repairTargetId: 'extension-1',
      structureType: 'extension',
    },
  ] as const)(
    'repairs a critical $structureType before building using captured hitsMax',
    ({ hits, hitsMax, repairTargetId, structureType }) => {
      expect(
        planWorkerActions({
          constructionSites: [
            {
              id: 'construction-site-1',
              roomName: 'W1N1',
            },
          ],
          controllers: [
            {
              id: 'controller-1',
              level: TEST_CONTROLLER_LEVEL,
              roomName: 'W1N1',
              ticksToDowngrade: TEST_CONTROLLER_SAFE_TICKS,
            },
          ],
          creeps: [
            {
              energy: 50,
              freeCapacity: 0,
              name: 'Worker1',
              roomName: 'W1N1',
            },
          ],
          energyStructures: [
            {
              availableEnergy: 300,
              energyCapacity: 300,
              id: 'spawn-full',
              roomName: 'W1N1',
            },
          ],
          repairTargets: [
            {
              hits,
              hitsMax,
              id: repairTargetId,
              roomName: 'W1N1',
              structureType,
              x: 10,
              y: 10,
            },
          ],
          sources: [
            {
              id: 'source-1',
              roomName: 'W1N1',
            },
          ],
        }),
      ).toEqual([
        {
          creepName: 'Worker1',
          structureId: repairTargetId,
          type: 'repairStructure',
        },
      ]);
    },
  );

  it('repairs a critical container before building', () => {
    expect(
      planWorkerActions({
        constructionSites: [
          {
            id: 'construction-site-1',
            roomName: 'W1N1',
          },
        ],
        controllers: [
          {
            id: 'controller-1',
            level: TEST_CONTROLLER_LEVEL,
            roomName: 'W1N1',
            ticksToDowngrade: TEST_CONTROLLER_SAFE_TICKS,
          },
        ],
        creeps: [
          {
            energy: 50,
            freeCapacity: 0,
            name: 'Worker1',
            roomName: 'W1N1',
          },
        ],
        energyStructures: [
          {
            availableEnergy: 300,
            energyCapacity: 300,
            id: 'spawn-1',
            roomName: 'W1N1',
          },
        ],
        repairTargets: [
          {
            hits: 2499,
            hitsMax: 10000,
            id: 'container-1',
            roomName: 'W1N1',
            structureType: 'container',
            x: 10,
            y: 11,
          },
        ],
        sources: [
          {
            id: 'source-1',
            roomName: 'W1N1',
          },
        ],
      }),
    ).toEqual([
      {
        creepName: 'Worker1',
        structureId: 'container-1',
        type: 'repairStructure',
      },
    ]);
  });

  it('uses captured road hitsMax for critical repair threshold', () => {
    expect(
      planWorkerActions({
        constructionSites: [
          {
            id: 'construction-site-1',
            roomName: 'W1N1',
          },
        ],
        controllers: [
          {
            id: 'controller-1',
            level: TEST_CONTROLLER_LEVEL,
            roomName: 'W1N1',
            ticksToDowngrade: TEST_CONTROLLER_SAFE_TICKS,
          },
        ],
        creeps: [
          {
            energy: 50,
            freeCapacity: 0,
            name: 'Worker1',
            roomName: 'W1N1',
          },
        ],
        energyStructures: [
          {
            availableEnergy: 300,
            energyCapacity: 300,
            id: 'spawn-1',
            roomName: 'W1N1',
          },
        ],
        repairTargets: [
          {
            hits: 3999,
            hitsMax: 20000,
            id: 'road-1',
            roomName: 'W1N1',
            structureType: 'road',
            x: 10,
            y: 11,
          },
        ],
        sources: [
          {
            id: 'source-1',
            roomName: 'W1N1',
          },
        ],
      }),
    ).toEqual([
      {
        creepName: 'Worker1',
        structureId: 'road-1',
        type: 'repairStructure',
      },
    ]);
  });

  it('keeps build and upgrade ahead of non-critical road repair', () => {
    const nonCriticalRoadRepairTarget = {
      hits: 1000,
      hitsMax: 5000,
      id: 'road-1',
      roomName: 'W1N1',
      structureType: 'road' as const,
      x: 10,
      y: 11,
    };
    const workerWorldWithoutConstruction = {
      controllers: [
        {
          id: 'controller-1',
          level: TEST_CONTROLLER_LEVEL,
          roomName: 'W1N1',
          ticksToDowngrade: TEST_CONTROLLER_SAFE_TICKS,
        },
      ],
      creeps: [
        {
          energy: 50,
          freeCapacity: 0,
          name: 'Worker1',
          roomName: 'W1N1',
        },
      ],
      energyStructures: [
        {
          availableEnergy: 300,
          energyCapacity: 300,
          id: 'spawn-1',
          roomName: 'W1N1',
        },
      ],
      repairTargets: [nonCriticalRoadRepairTarget],
      sources: [
        {
          id: 'source-1',
          roomName: 'W1N1',
        },
      ],
    };

    expect(
      planWorkerActions({
        ...workerWorldWithoutConstruction,
        constructionSites: [
          {
            id: 'construction-site-1',
            roomName: 'W1N1',
          },
        ],
      }),
    ).toEqual([
      {
        constructionSiteId: 'construction-site-1',
        creepName: 'Worker1',
        type: 'buildConstructionSite',
      },
    ]);
    expect(
      planWorkerActions({
        ...workerWorldWithoutConstruction,
        constructionSites: [],
      }),
    ).toEqual([
      {
        controllerId: 'controller-1',
        creepName: 'Worker1',
        type: 'upgradeController',
      },
    ]);
  });

  it('excludes walls and ramparts from P2 worker repair target types', () => {
    expect(isWorkerRepairStructureType('wall')).toBe(false);
    expect(isWorkerRepairStructureType('rampart')).toBe(false);
    expect(isWorkerRepairStructureType('spawn')).toBe(true);
    expect(isWorkerRepairStructureType('extension')).toBe(true);
    expect(isWorkerRepairStructureType('container')).toBe(true);
    expect(isWorkerRepairStructureType('road')).toBe(true);
  });

  it('upgrades instead of building while construction is deferred for survival', () => {
    expect(
      planWorkerActions({
        constructionEligibilities: [
          {
            roomName: 'W1N1',
            type: 'constructionDeferredForSurvival',
          },
        ],
        constructionSites: [
          {
            id: 'construction-site-1',
            roomName: 'W1N1',
          },
        ],
        controllers: [
          {
            id: 'controller-1',
            level: TEST_CONTROLLER_LEVEL,
            roomName: 'W1N1',
            ticksToDowngrade: TEST_CONTROLLER_SAFE_TICKS,
          },
        ],
        creeps: [
          {
            energy: 50,
            freeCapacity: 0,
            name: 'Worker1',
            roomName: 'W1N1',
          },
        ],
        energyStructures: [
          {
            availableEnergy: 300,
            energyCapacity: 300,
            id: 'spawn-1',
            roomName: 'W1N1',
          },
        ],
        sources: [
          {
            id: 'source-1',
            roomName: 'W1N1',
          },
        ],
      }),
    ).toEqual([
      {
        controllerId: 'controller-1',
        creepName: 'Worker1',
        type: 'upgradeController',
      },
    ]);
  });

  it('upgrades the controller when energy is stable and no construction site exists', () => {
    expect(
      planWorkerActions({
        constructionSites: [],
        controllers: [
          {
            id: 'controller-1',
            level: TEST_CONTROLLER_LEVEL,
            roomName: 'W1N1',
            ticksToDowngrade: TEST_CONTROLLER_SAFE_TICKS,
          },
        ],
        creeps: [
          {
            energy: 50,
            freeCapacity: 0,
            name: 'Worker1',
            roomName: 'W1N1',
          },
        ],
        energyStructures: [
          {
            availableEnergy: 300,
            energyCapacity: 300,
            id: 'spawn-1',
            roomName: 'W1N1',
          },
        ],
        sources: [
          {
            id: 'source-1',
            roomName: 'W1N1',
          },
        ],
      }),
    ).toEqual([
      {
        controllerId: 'controller-1',
        creepName: 'Worker1',
        type: 'upgradeController',
      },
    ]);
  });

  it('keeps building before upgrading when the controller downgrade timer is safe', () => {
    expect(
      planWorkerActions({
        constructionSites: [
          {
            id: 'construction-site-1',
            roomName: 'W1N1',
          },
        ],
        controllers: [
          {
            id: 'controller-1',
            level: TEST_CONTROLLER_LEVEL,
            roomName: 'W1N1',
            ticksToDowngrade: TEST_CONTROLLER_SAFE_TICKS,
          },
        ],
        creeps: [
          {
            energy: 50,
            freeCapacity: 0,
            name: 'Worker1',
            roomName: 'W1N1',
          },
        ],
        energyStructures: [
          {
            availableEnergy: 300,
            energyCapacity: 300,
            id: 'spawn-1',
            roomName: 'W1N1',
          },
        ],
        sources: [
          {
            id: 'source-1',
            roomName: 'W1N1',
          },
        ],
      }),
    ).toEqual([
      {
        constructionSiteId: 'construction-site-1',
        creepName: 'Worker1',
        type: 'buildConstructionSite',
      },
    ]);
  });

  it('keeps the first full-energy worker upgrading while the controller is recovering', () => {
    expect(
      planWorkerActions({
        constructionSites: [
          {
            id: 'construction-site-1',
            roomName: 'W1N1',
          },
        ],
        controllers: [
          {
            id: 'controller-1',
            level: TEST_CONTROLLER_LEVEL,
            roomName: 'W1N1',
            ticksToDowngrade: TEST_CONTROLLER_RECOVERING_TICKS,
          },
        ],
        creeps: [
          {
            energy: 50,
            freeCapacity: 0,
            name: 'WorkerB',
            roomName: 'W1N1',
          },
          {
            energy: 50,
            freeCapacity: 0,
            name: 'WorkerA',
            roomName: 'W1N1',
          },
        ],
        energyStructures: [
          {
            availableEnergy: 300,
            energyCapacity: 300,
            id: 'spawn-1',
            roomName: 'W1N1',
          },
        ],
        sources: [
          {
            id: 'source-1',
            roomName: 'W1N1',
          },
        ],
      }),
    ).toEqual([
      {
        controllerId: 'controller-1',
        creepName: 'WorkerA',
        type: 'upgradeController',
      },
      {
        constructionSiteId: 'construction-site-1',
        creepName: 'WorkerB',
        type: 'buildConstructionSite',
      },
    ]);
  });

  it('makes the first full-energy worker upgrade before build when the controller is warning', () => {
    expect(
      planWorkerActions({
        constructionSites: [
          {
            id: 'construction-site-1',
            roomName: 'W1N1',
          },
        ],
        controllers: [
          {
            id: 'controller-1',
            level: TEST_CONTROLLER_LEVEL,
            roomName: 'W1N1',
            ticksToDowngrade: TEST_CONTROLLER_WARNING_TICKS,
          },
        ],
        creeps: [
          {
            energy: 50,
            freeCapacity: 0,
            name: 'WorkerA',
            roomName: 'W1N1',
          },
          {
            energy: 50,
            freeCapacity: 0,
            name: 'WorkerB',
            roomName: 'W1N1',
          },
        ],
        energyStructures: [
          {
            availableEnergy: 300,
            energyCapacity: 300,
            id: 'spawn-1',
            roomName: 'W1N1',
          },
        ],
        sources: [
          {
            id: 'source-1',
            roomName: 'W1N1',
          },
        ],
      }),
    ).toEqual([
      {
        controllerId: 'controller-1',
        creepName: 'WorkerA',
        type: 'upgradeController',
      },
      {
        constructionSiteId: 'construction-site-1',
        creepName: 'WorkerB',
        type: 'buildConstructionSite',
      },
    ]);
  });

  it('makes every full-energy worker upgrade before build when the controller is critical', () => {
    expect(
      planWorkerActions({
        constructionSites: [
          {
            id: 'construction-site-1',
            roomName: 'W1N1',
          },
        ],
        controllers: [
          {
            id: 'controller-1',
            level: TEST_CONTROLLER_LEVEL,
            roomName: 'W1N1',
            ticksToDowngrade: TEST_CONTROLLER_CRITICAL_TICKS,
          },
        ],
        creeps: [
          {
            energy: 50,
            freeCapacity: 0,
            name: 'WorkerA',
            roomName: 'W1N1',
          },
          {
            energy: 50,
            freeCapacity: 0,
            name: 'WorkerB',
            roomName: 'W1N1',
          },
        ],
        energyStructures: [
          {
            availableEnergy: 300,
            energyCapacity: 300,
            id: 'spawn-1',
            roomName: 'W1N1',
          },
        ],
        sources: [
          {
            id: 'source-1',
            roomName: 'W1N1',
          },
        ],
      }),
    ).toEqual([
      {
        controllerId: 'controller-1',
        creepName: 'WorkerA',
        type: 'upgradeController',
      },
      {
        controllerId: 'controller-1',
        creepName: 'WorkerB',
        type: 'upgradeController',
      },
    ]);
  });

  it('refills depleted energy structures before controller downgrade upgrading', () => {
    expect(
      planWorkerActions({
        constructionSites: [
          {
            id: 'construction-site-1',
            roomName: 'W1N1',
          },
        ],
        controllers: [
          {
            id: 'controller-1',
            level: TEST_CONTROLLER_LEVEL,
            roomName: 'W1N1',
            ticksToDowngrade: TEST_CONTROLLER_CRITICAL_TICKS,
          },
        ],
        creeps: [
          {
            energy: 50,
            freeCapacity: 0,
            name: 'Worker1',
            roomName: 'W1N1',
          },
        ],
        energyStructures: [
          {
            availableEnergy: 250,
            energyCapacity: 300,
            id: 'spawn-1',
            roomName: 'W1N1',
          },
        ],
        sources: [
          {
            id: 'source-1',
            roomName: 'W1N1',
          },
        ],
      }),
    ).toEqual([
      {
        creepName: 'Worker1',
        structureId: 'spawn-1',
        type: 'refillEnergyStructure',
      },
    ]);
  });
});
