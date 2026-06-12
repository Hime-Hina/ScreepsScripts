import { describe, expect, it } from 'vitest';

import { planBootstrapWorkerActions } from '../../../src/creeps/worker-decision';

const TEST_CONTROLLER_LEVEL = 2;
const TEST_CONTROLLER_SAFE_TICKS = 9000;
const TEST_CONTROLLER_RECOVERING_TICKS = 8500;
const TEST_CONTROLLER_WARNING_TICKS = 7999;
const TEST_CONTROLLER_CRITICAL_TICKS = 4999;

describe('bootstrap worker action decision', () => {
  it('harvests from a source in the worker room until full', () => {
    expect(
      planBootstrapWorkerActions({
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
      planBootstrapWorkerActions({
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

  it('keeps an empty worker on its assigned source while another worker refills energy', () => {
    expect(
      planBootstrapWorkerActions({
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
      planBootstrapWorkerActions({
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

  it('builds the lowest-id construction site before upgrading when energy structures are full', () => {
    expect(
      planBootstrapWorkerActions({
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

  it('upgrades the controller when energy is stable and no construction site exists', () => {
    expect(
      planBootstrapWorkerActions({
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
      planBootstrapWorkerActions({
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
      planBootstrapWorkerActions({
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
      planBootstrapWorkerActions({
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
      planBootstrapWorkerActions({
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
      planBootstrapWorkerActions({
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
