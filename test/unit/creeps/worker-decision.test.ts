import { describe, expect, it } from 'vitest';

import { planBootstrapWorkerActions } from '../../../src/creeps/worker-decision';

describe('bootstrap worker action decision', () => {
  it('harvests from a source in the worker room until full', () => {
    expect(
      planBootstrapWorkerActions({
        constructionSites: [],
        controllers: [
          {
            id: 'controller-1',
            roomName: 'W1N1',
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
            roomName: 'W1N1',
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
            roomName: 'W1N1',
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
            roomName: 'W1N1',
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
            roomName: 'W1N1',
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
            roomName: 'W1N1',
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
});
