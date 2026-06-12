import { describe, expect, it } from 'vitest';

import { planBootstrapWorkerActions } from '../../../src/creeps/worker-decision';

describe('bootstrap worker action decision', () => {
  it('harvests from a source in the worker room until full', () => {
    expect(
      planBootstrapWorkerActions({
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
        sources: [
          {
            id: 'source-1',
            roomName: 'W1N1',
          },
        ],
        spawns: [
          {
            availableEnergy: 300,
            energyCapacity: 300,
            name: 'Spawn1',
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
        spawns: [
          {
            availableEnergy: 300,
            energyCapacity: 300,
            name: 'Spawn1',
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

  it('keeps worker source assignment stable while another worker delivers energy', () => {
    expect(
      planBootstrapWorkerActions({
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
        spawns: [
          {
            availableEnergy: 300,
            energyCapacity: 300,
            name: 'Spawn1',
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
        creepName: 'WorkerB',
        sourceId: 'source-b',
        type: 'harvestSource',
      },
    ]);
  });

  it('refills the room spawn before upgrading the controller', () => {
    expect(
      planBootstrapWorkerActions({
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
        sources: [
          {
            id: 'source-1',
            roomName: 'W1N1',
          },
        ],
        spawns: [
          {
            availableEnergy: 250,
            energyCapacity: 300,
            name: 'Spawn1',
            roomName: 'W1N1',
          },
        ],
      }),
    ).toEqual([
      {
        creepName: 'Worker1',
        spawnName: 'Spawn1',
        type: 'refillSpawn',
      },
    ]);
  });

  it('upgrades the controller when spawn energy is stable', () => {
    expect(
      planBootstrapWorkerActions({
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
        sources: [
          {
            id: 'source-1',
            roomName: 'W1N1',
          },
        ],
        spawns: [
          {
            availableEnergy: 300,
            energyCapacity: 300,
            name: 'Spawn1',
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
