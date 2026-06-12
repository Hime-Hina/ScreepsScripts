import { describe, expect, it } from 'vitest';

import {
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
    'constructionEligibilities' | 'energyPickups' | 'energyWithdrawals'
  > &
    Partial<
      Pick<WorkerWorldSnapshot, 'constructionEligibilities' | 'energyPickups' | 'energyWithdrawals'>
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
    ...workerWorldSnapshot
  } = workerWorld;

  return planBootstrapWorkerActions({
    constructionEligibilities,
    energyPickups,
    energyWithdrawals,
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

  it('assigns a construction site to only one worker in the same tick', () => {
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
        controllerId: 'controller-1',
        creepName: 'WorkerB',
        type: 'upgradeController',
      },
    ]);
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
