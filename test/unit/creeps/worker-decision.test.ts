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

type TestWorkerEnergyMode = 'harvesting' | 'working';
type TestWorkerCreepSnapshot = Omit<WorkerWorldSnapshot['creeps'][number], 'energyMode'> & {
  readonly energyMode?: TestWorkerEnergyMode;
};
type TestWorkerWorldSnapshot = Omit<
  WorkerWorldSnapshot,
  | 'constructionEligibilities'
  | 'creeps'
  | 'energyDeposits'
  | 'energyPickups'
  | 'energyWithdrawals'
  | 'repairTargets'
> &
  Partial<
    Pick<
      WorkerWorldSnapshot,
      | 'constructionEligibilities'
      | 'energyDeposits'
      | 'energyPickups'
      | 'energyWithdrawals'
      | 'repairTargets'
    >
  > & {
    readonly creeps: readonly TestWorkerCreepSnapshot[];
  };

const planWorkerActions = (workerWorld: TestWorkerWorldSnapshot) => {
  const {
    constructionEligibilities = [
      {
        roomName: 'W1N1',
        type: 'constructionAllowed',
      },
    ],
    energyPickups = [],
    energyDeposits = [],
    energyWithdrawals = [],
    repairTargets = [],
    creeps: inputCreeps,
    ...workerWorldSnapshot
  } = workerWorld;
  const creeps = inputCreeps.map((workerCreep) => ({
    energyMode:
      workerCreep.energyMode ?? (workerCreep.freeCapacity <= 0 ? 'working' : 'harvesting'),
    ...workerCreep,
  }));

  return planBootstrapWorkerActions({
    ...workerWorldSnapshot,
    constructionEligibilities,
    creeps,
    energyDeposits,
    energyPickups,
    energyWithdrawals,
    repairTargets,
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

  it('keeps source miners harvesting their assigned source instead of opportunistic pickups', () => {
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
            name: 'Miner1',
            role: 'miner',
            roomName: 'W1N1',
          },
        ],
        energyPickups: [
          {
            amount: 500,
            id: 'dropped-energy-1',
            roomName: 'W1N1',
            x: 10,
            y: 10,
          },
        ],
        energyStructures: [],
        sources: [
          {
            id: 'source-1',
            roomName: 'W1N1',
            x: 20,
            y: 20,
          },
        ],
      }),
    ).toEqual([
      {
        creepName: 'Miner1',
        sourceId: 'source-1',
        type: 'harvestSource',
      },
    ]);
  });

  it('deposits source miner energy into a source-local container before controller work', () => {
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
            energyMode: 'working',
            freeCapacity: 0,
            name: 'Miner1',
            role: 'miner',
            roomName: 'W1N1',
            x: 21,
            y: 20,
          },
        ],
        energyDeposits: [
          {
            freeCapacity: 200,
            id: 'source-container-1',
            roomName: 'W1N1',
            targetType: 'container',
            x: 21,
            y: 20,
          },
        ],
        energyStructures: [],
        sources: [
          {
            id: 'source-1',
            roomName: 'W1N1',
            x: 20,
            y: 20,
          },
        ],
      }),
    ).toEqual([
      {
        creepName: 'Miner1',
        structureId: 'source-container-1',
        type: 'depositEnergy',
      },
    ]);
  });

  it('lets logistics haulers withdraw stored container energy before harvesting', () => {
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
            name: 'Hauler1',
            role: 'hauler',
            roomName: 'W1N1',
            x: 22,
            y: 20,
          },
        ],
        energyStructures: [],
        energyWithdrawals: [
          {
            availableEnergy: 500,
            id: 'source-container-1',
            roomName: 'W1N1',
            targetType: 'container',
            x: 21,
            y: 20,
          },
        ],
        sources: [
          {
            id: 'source-1',
            roomName: 'W1N1',
            x: 20,
            y: 20,
          },
        ],
      }),
    ).toEqual([
      {
        creepName: 'Hauler1',
        structureId: 'source-container-1',
        type: 'withdrawEnergy',
      },
    ]);
  });

  it('prioritizes source-local container withdrawals for haulers over larger controller-side stores', () => {
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
            name: 'Hauler1',
            role: 'hauler',
            roomName: 'W1N1',
            x: 10,
            y: 10,
          },
        ],
        energyStructures: [],
        energyWithdrawals: [
          {
            availableEnergy: 1000,
            id: 'controller-container-1',
            roomName: 'W1N1',
            targetType: 'container',
            x: 11,
            y: 10,
          },
          {
            availableEnergy: 100,
            id: 'source-container-1',
            roomName: 'W1N1',
            targetType: 'container',
            x: 21,
            y: 20,
          },
        ],
        sources: [
          {
            id: 'source-1',
            roomName: 'W1N1',
            x: 20,
            y: 20,
          },
        ],
      }),
    ).toEqual([
      {
        creepName: 'Hauler1',
        structureId: 'source-container-1',
        type: 'withdrawEnergy',
      },
    ]);
  });

  it('uses another source-local container before non-source withdrawals when the assigned source is empty', () => {
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
            name: 'Hauler1',
            role: 'hauler',
            roomName: 'W1N1',
            x: 10,
            y: 10,
          },
        ],
        energyStructures: [],
        energyWithdrawals: [
          {
            availableEnergy: 1000,
            id: 'controller-container-1',
            roomName: 'W1N1',
            targetType: 'container',
            x: 11,
            y: 10,
          },
          {
            availableEnergy: 100,
            id: 'other-source-container-1',
            roomName: 'W1N1',
            targetType: 'container',
            x: 31,
            y: 30,
          },
        ],
        sources: [
          {
            id: 'source-1',
            roomName: 'W1N1',
            x: 20,
            y: 20,
          },
          {
            id: 'source-2',
            roomName: 'W1N1',
            x: 30,
            y: 30,
          },
        ],
      }),
    ).toEqual([
      {
        creepName: 'Hauler1',
        structureId: 'other-source-container-1',
        type: 'withdrawEnergy',
      },
    ]);
  });

  it('deposits hauler surplus into a controller-side container when room energy is full', () => {
    expect(
      planWorkerActions({
        constructionSites: [],
        controllers: [
          {
            id: 'controller-1',
            level: TEST_CONTROLLER_LEVEL,
            roomName: 'W1N1',
            ticksToDowngrade: TEST_CONTROLLER_SAFE_TICKS,
            x: 10,
            y: 10,
          },
        ],
        creeps: [
          {
            energy: 100,
            energyMode: 'working',
            freeCapacity: 0,
            name: 'Hauler1',
            role: 'hauler',
            roomName: 'W1N1',
            x: 12,
            y: 10,
          },
        ],
        energyDeposits: [
          {
            freeCapacity: 200,
            id: 'source-container-1',
            roomName: 'W1N1',
            targetType: 'container',
            x: 21,
            y: 20,
          },
          {
            freeCapacity: 200,
            id: 'controller-container-1',
            roomName: 'W1N1',
            targetType: 'container',
            x: 11,
            y: 10,
          },
        ],
        energyStructures: [
          {
            availableEnergy: 300,
            energyCapacity: 300,
            id: 'spawn-1',
            roomName: 'W1N1',
            structureType: 'spawn',
          },
          {
            availableEnergy: 50,
            energyCapacity: 50,
            id: 'extension-1',
            roomName: 'W1N1',
            structureType: 'extension',
          },
          {
            availableEnergy: 1000,
            energyCapacity: 1000,
            id: 'tower-1',
            roomName: 'W1N1',
            structureType: 'tower',
          },
        ],
        sources: [
          {
            id: 'source-1',
            roomName: 'W1N1',
            x: 20,
            y: 20,
          },
        ],
      }),
    ).toEqual([
      {
        creepName: 'Hauler1',
        structureId: 'controller-container-1',
        type: 'depositEnergy',
      },
    ]);
  });

  it('keeps haulers on critical downgrade upgrade before surplus container deposits', () => {
    expect(
      planWorkerActions({
        constructionSites: [],
        controllers: [
          {
            id: 'controller-1',
            level: TEST_CONTROLLER_LEVEL,
            roomName: 'W1N1',
            ticksToDowngrade: TEST_CONTROLLER_CRITICAL_TICKS,
            x: 10,
            y: 10,
          },
        ],
        creeps: [
          {
            energy: 100,
            energyMode: 'working',
            freeCapacity: 0,
            name: 'Hauler1',
            role: 'hauler',
            roomName: 'W1N1',
            x: 12,
            y: 10,
          },
        ],
        energyDeposits: [
          {
            freeCapacity: 200,
            id: 'controller-container-1',
            roomName: 'W1N1',
            targetType: 'container',
            x: 11,
            y: 10,
          },
        ],
        energyStructures: [
          {
            availableEnergy: 300,
            energyCapacity: 300,
            id: 'spawn-1',
            roomName: 'W1N1',
            structureType: 'spawn',
          },
        ],
        sources: [
          {
            id: 'source-1',
            roomName: 'W1N1',
            x: 20,
            y: 20,
          },
        ],
      }),
    ).toEqual([
      {
        controllerId: 'controller-1',
        creepName: 'Hauler1',
        type: 'upgradeController',
      },
    ]);
  });

  it('refills primary structures before controller-container deposits for haulers', () => {
    expect(
      planWorkerActions({
        constructionSites: [],
        controllers: [
          {
            id: 'controller-1',
            level: TEST_CONTROLLER_LEVEL,
            roomName: 'W1N1',
            ticksToDowngrade: TEST_CONTROLLER_SAFE_TICKS,
            x: 10,
            y: 10,
          },
        ],
        creeps: [
          {
            energy: 100,
            energyMode: 'working',
            freeCapacity: 0,
            name: 'Hauler1',
            role: 'hauler',
            roomName: 'W1N1',
            x: 12,
            y: 10,
          },
        ],
        energyDeposits: [
          {
            freeCapacity: 200,
            id: 'controller-container-1',
            roomName: 'W1N1',
            targetType: 'container',
            x: 11,
            y: 10,
          },
        ],
        energyStructures: [
          {
            availableEnergy: 200,
            energyCapacity: 300,
            id: 'spawn-1',
            roomName: 'W1N1',
            structureType: 'spawn',
          },
        ],
        sources: [
          {
            id: 'source-1',
            roomName: 'W1N1',
            x: 20,
            y: 20,
          },
        ],
      }),
    ).toEqual([
      {
        creepName: 'Hauler1',
        structureId: 'spawn-1',
        type: 'refillEnergyStructure',
      },
    ]);
  });

  it('reserves controller-container deposit capacity across multiple haulers', () => {
    expect(
      planWorkerActions({
        constructionSites: [],
        controllers: [
          {
            id: 'controller-1',
            level: TEST_CONTROLLER_LEVEL,
            roomName: 'W1N1',
            ticksToDowngrade: TEST_CONTROLLER_SAFE_TICKS,
            x: 10,
            y: 10,
          },
        ],
        creeps: [
          {
            energy: 100,
            energyMode: 'working',
            freeCapacity: 0,
            name: 'HaulerA',
            role: 'hauler',
            roomName: 'W1N1',
            x: 12,
            y: 10,
          },
          {
            energy: 100,
            energyMode: 'working',
            freeCapacity: 0,
            name: 'HaulerB',
            role: 'hauler',
            roomName: 'W1N1',
            x: 13,
            y: 10,
          },
        ],
        energyDeposits: [
          {
            freeCapacity: 100,
            id: 'controller-container-1',
            roomName: 'W1N1',
            targetType: 'container',
            x: 11,
            y: 10,
          },
        ],
        energyStructures: [
          {
            availableEnergy: 300,
            energyCapacity: 300,
            id: 'spawn-1',
            roomName: 'W1N1',
            structureType: 'spawn',
          },
        ],
        sources: [
          {
            id: 'source-1',
            roomName: 'W1N1',
            x: 20,
            y: 20,
          },
        ],
      }),
    ).toEqual([
      {
        creepName: 'HaulerA',
        structureId: 'controller-container-1',
        type: 'depositEnergy',
      },
    ]);
  });

  it('keeps full haulers idle when no controller-local surplus sink exists', () => {
    expect(
      planWorkerActions({
        constructionSites: [],
        controllers: [
          {
            id: 'controller-1',
            level: TEST_CONTROLLER_LEVEL,
            roomName: 'W1N1',
            ticksToDowngrade: TEST_CONTROLLER_SAFE_TICKS,
            x: 10,
            y: 10,
          },
        ],
        creeps: [
          {
            energy: 100,
            energyMode: 'working',
            freeCapacity: 0,
            name: 'Hauler1',
            role: 'hauler',
            roomName: 'W1N1',
          },
        ],
        energyStructures: [
          {
            availableEnergy: 300,
            energyCapacity: 300,
            id: 'spawn-1',
            roomName: 'W1N1',
            structureType: 'spawn',
          },
        ],
        sources: [
          {
            id: 'source-1',
            roomName: 'W1N1',
            x: 20,
            y: 20,
          },
        ],
      }),
    ).toEqual([]);
  });

  it('falls back to non-source stored withdrawals before harvesting with haulers', () => {
    expect(
      planWorkerActions({
        constructionSites: [],
        controllers: [
          {
            id: 'controller-1',
            level: TEST_CONTROLLER_LEVEL,
            roomName: 'W1N1',
            ticksToDowngrade: TEST_CONTROLLER_SAFE_TICKS,
            x: 10,
            y: 10,
          },
        ],
        creeps: [
          {
            energy: 0,
            freeCapacity: 50,
            name: 'Hauler1',
            role: 'hauler',
            roomName: 'W1N1',
            x: 11,
            y: 10,
          },
        ],
        energyStructures: [],
        energyWithdrawals: [
          {
            availableEnergy: 100,
            id: 'controller-container-1',
            roomName: 'W1N1',
            targetType: 'container',
            x: 11,
            y: 10,
          },
        ],
        sources: [
          {
            id: 'source-1',
            roomName: 'W1N1',
            x: 20,
            y: 20,
          },
        ],
      }),
    ).toEqual([
      {
        creepName: 'Hauler1',
        structureId: 'controller-container-1',
        type: 'withdrawEnergy',
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

  it('assigns harvesting sources by room position before id tie-breakers', () => {
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
            id: 'source-z-near',
            roomName: 'W1N1',
            x: 10,
            y: 5,
          },
          {
            id: 'source-a-far',
            roomName: 'W1N1',
            x: 10,
            y: 20,
          },
        ],
      }),
    ).toEqual([
      {
        creepName: 'WorkerA',
        sourceId: 'source-z-near',
        type: 'harvestSource',
      },
      {
        creepName: 'WorkerB',
        sourceId: 'source-a-far',
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

  it('picks up the largest dropped energy pile before using id as a tie-breaker', () => {
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
            x: 10,
            y: 10,
          },
        ],
        energyPickups: [
          {
            amount: 10,
            id: 'aaa-small-dropped-energy',
            roomName: 'W1N1',
            x: 10,
            y: 10,
          },
          {
            amount: 100,
            id: 'zzz-large-dropped-energy',
            roomName: 'W1N1',
            x: 20,
            y: 20,
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
        resourceId: 'zzz-large-dropped-energy',
        type: 'pickupEnergy',
      },
    ]);
  });

  it('uses distance before id when dropped energy amounts are tied', () => {
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
            x: 10,
            y: 10,
          },
        ],
        energyPickups: [
          {
            amount: 50,
            id: 'aaa-far-dropped-energy',
            roomName: 'W1N1',
            x: 20,
            y: 20,
          },
          {
            amount: 50,
            id: 'zzz-near-dropped-energy',
            roomName: 'W1N1',
            x: 10,
            y: 11,
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
        resourceId: 'zzz-near-dropped-energy',
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

  it('prefers structure withdrawals over tombstones before using id as a tie-breaker', () => {
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
            x: 10,
            y: 10,
          },
        ],
        energyStructures: [],
        energyWithdrawals: [
          {
            availableEnergy: 100,
            id: 'aaa-tombstone',
            roomName: 'W1N1',
            targetType: 'tombstone',
            x: 9,
            y: 10,
          },
          {
            availableEnergy: 100,
            id: 'zzz-container',
            roomName: 'W1N1',
            targetType: 'container',
            x: 20,
            y: 20,
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
        structureId: 'zzz-container',
        type: 'withdrawEnergy',
      },
    ]);
  });

  it('uses available energy before distance and id for same-type withdrawals', () => {
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
            x: 10,
            y: 10,
          },
        ],
        energyStructures: [],
        energyWithdrawals: [
          {
            availableEnergy: 25,
            id: 'aaa-small-container',
            roomName: 'W1N1',
            targetType: 'container',
            x: 10,
            y: 11,
          },
          {
            availableEnergy: 100,
            id: 'zzz-large-container',
            roomName: 'W1N1',
            targetType: 'container',
            x: 20,
            y: 20,
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
        structureId: 'zzz-large-container',
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

  it('refills a depleted spawn before an equivalent extension instead of sorting by id', () => {
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
            structureType: 'spawn',
            x: 12,
            y: 10,
          },
          {
            availableEnergy: 0,
            energyCapacity: 50,
            id: 'extension-a',
            roomName: 'W1N1',
            structureType: 'extension',
            x: 11,
            y: 10,
          },
          {
            availableEnergy: 50,
            energyCapacity: 50,
            id: 'extension-full',
            roomName: 'W1N1',
            structureType: 'extension',
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
        structureId: 'spawn-z',
        type: 'refillEnergyStructure',
      },
    ]);
  });

  it('refills the largest same-type energy gap before distance and id tie-breakers', () => {
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
            x: 10,
            y: 10,
          },
        ],
        energyStructures: [
          {
            availableEnergy: 40,
            energyCapacity: 50,
            id: 'aaa-small-gap-extension',
            roomName: 'W1N1',
            structureType: 'extension',
            x: 10,
            y: 10,
          },
          {
            availableEnergy: 0,
            energyCapacity: 50,
            id: 'zzz-large-gap-extension',
            roomName: 'W1N1',
            structureType: 'extension',
            x: 20,
            y: 20,
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
        structureId: 'zzz-large-gap-extension',
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

  it('refills a tower after spawn and extensions are full', () => {
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
            structureType: 'spawn',
          },
          {
            availableEnergy: 50,
            energyCapacity: 50,
            id: 'extension-1',
            roomName: 'W1N1',
            structureType: 'extension',
          },
          {
            availableEnergy: 0,
            energyCapacity: 1000,
            id: 'tower-1',
            roomName: 'W1N1',
            structureType: 'tower',
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
        structureId: 'tower-1',
        type: 'refillEnergyStructure',
      },
    ]);
  });

  it('refills spawn and extensions before tower energy', () => {
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
            availableEnergy: 250,
            energyCapacity: 300,
            id: 'spawn-1',
            roomName: 'W1N1',
            structureType: 'spawn',
          },
          {
            availableEnergy: 0,
            energyCapacity: 1000,
            id: 'tower-1',
            roomName: 'W1N1',
            structureType: 'tower',
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

  it('does not refill a tower before critical controller upgrading', () => {
    expect(
      planWorkerActions({
        constructionSites: [],
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
            availableEnergy: 0,
            energyCapacity: 1000,
            id: 'tower-1',
            roomName: 'W1N1',
            structureType: 'tower',
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

  it('keeps a partial-energy working worker building instead of returning to harvest', () => {
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
            energy: 45,
            energyMode: 'working',
            freeCapacity: 5,
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

  it('keeps a partial-capacity harvesting worker collecting energy', () => {
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
            energy: 45,
            energyMode: 'harvesting',
            freeCapacity: 5,
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
        creepName: 'Worker1',
        sourceId: 'source-1',
        type: 'harvestSource',
      },
    ]);
  });

  it('treats a full harvesting worker as ready to work', () => {
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
            energyMode: 'harvesting',
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

  it('treats an empty working worker as ready to harvest', () => {
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
            energy: 0,
            energyMode: 'working',
            freeCapacity: 50,
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
        creepName: 'Worker1',
        sourceId: 'source-1',
        type: 'harvestSource',
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

  it('prefers source-side road construction over arbitrary lower-id road sites', () => {
    expect(
      planWorkerActions({
        constructionSites: [
          {
            id: 'aaa-remote-road',
            roomName: 'W1N1',
            structureType: 'road',
            x: 20,
            y: 20,
          },
          {
            id: 'zzz-source-road',
            roomName: 'W1N1',
            structureType: 'road',
            x: 4,
            y: 10,
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
            x: 2,
            y: 10,
          },
        ],
      }),
    ).toEqual([
      {
        constructionSiteId: 'zzz-source-road',
        creepName: 'Worker1',
        type: 'buildConstructionSite',
      },
    ]);
  });

  it('continues a progressed equivalent frontier site before starting another road', () => {
    expect(
      planWorkerActions({
        constructionSites: [
          {
            id: 'aaa-empty-road',
            progress: 0,
            roomName: 'W1N1',
            structureType: 'road',
            x: 4,
            y: 10,
          },
          {
            id: 'zzz-progressed-road',
            progress: 50,
            roomName: 'W1N1',
            structureType: 'road',
            x: 2,
            y: 12,
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
            x: 2,
            y: 10,
          },
        ],
      }),
    ).toEqual([
      {
        constructionSiteId: 'zzz-progressed-road',
        creepName: 'Worker1',
        type: 'buildConstructionSite',
      },
    ]);
  });

  it('uses each worker assigned source when choosing equivalent source-side containers', () => {
    expect(
      planWorkerActions({
        constructionSites: [
          {
            id: 'source-a-container',
            progress: 0,
            roomName: 'W1N1',
            structureType: 'container',
            x: 3,
            y: 10,
          },
          {
            id: 'source-b-container',
            progress: 100,
            roomName: 'W1N1',
            structureType: 'container',
            x: 21,
            y: 10,
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
            id: 'source-a',
            roomName: 'W1N1',
            x: 2,
            y: 10,
          },
          {
            id: 'source-b',
            roomName: 'W1N1',
            x: 20,
            y: 10,
          },
        ],
      }),
    ).toEqual([
      {
        constructionSiteId: 'source-a-container',
        creepName: 'WorkerA',
        type: 'buildConstructionSite',
      },
      {
        constructionSiteId: 'source-b-container',
        creepName: 'WorkerB',
        type: 'buildConstructionSite',
      },
    ]);
  });

  it('prefers the assigned source road frontier over another progressed source route', () => {
    expect(
      planWorkerActions({
        constructionSites: [
          {
            id: 'source-a-road',
            progress: 0,
            roomName: 'W1N1',
            structureType: 'road',
            x: 4,
            y: 10,
          },
          {
            id: 'source-b-road',
            progress: 200,
            roomName: 'W1N1',
            structureType: 'road',
            x: 22,
            y: 10,
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
            id: 'source-a',
            roomName: 'W1N1',
            x: 2,
            y: 10,
          },
          {
            id: 'source-b',
            roomName: 'W1N1',
            x: 20,
            y: 10,
          },
        ],
      }),
    ).toEqual([
      {
        constructionSiteId: 'source-a-road',
        creepName: 'WorkerA',
        type: 'buildConstructionSite',
      },
    ]);
  });

  it('lets multiple workers build the same best construction site while remaining work is available', () => {
    expect(
      planWorkerActions({
        constructionSites: [
          {
            id: 'construction-site-1',
            progress: 100,
            progressTotal: 5000,
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

  it('stops assigning additional builders once reserved work covers remaining site work', () => {
    expect(
      planWorkerActions({
        constructionSites: [
          {
            id: 'nearly-complete-site',
            progress: 4900,
            progressTotal: 4925,
            roomName: 'W1N1',
          },
          {
            id: 'next-site',
            progress: 0,
            progressTotal: 5000,
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
        constructionSiteId: 'nearly-complete-site',
        creepName: 'WorkerA',
        type: 'buildConstructionSite',
      },
      {
        constructionSiteId: 'next-site',
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

  it('prefers a critical container repair over an id-first road repair', () => {
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
            x: 10,
            y: 10,
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
            hits: 1,
            hitsMax: 5000,
            id: 'aaa-road',
            roomName: 'W1N1',
            structureType: 'road',
            x: 10,
            y: 11,
          },
          {
            hits: 1000,
            hitsMax: 5000,
            id: 'zzz-container',
            roomName: 'W1N1',
            structureType: 'container',
            x: 20,
            y: 20,
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
        structureId: 'zzz-container',
        type: 'repairStructure',
      },
    ]);
  });

  it('uses lower hits ratio before distance and id for same-type repairs', () => {
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
            x: 10,
            y: 10,
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
            hits: 900,
            hitsMax: 5000,
            id: 'aaa-healthier-road',
            roomName: 'W1N1',
            structureType: 'road',
            x: 10,
            y: 11,
          },
          {
            hits: 100,
            hitsMax: 5000,
            id: 'zzz-worse-road',
            roomName: 'W1N1',
            structureType: 'road',
            x: 20,
            y: 20,
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
        structureId: 'zzz-worse-road',
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

  it('lets upgraders withdraw controller-side stored energy before source fallback', () => {
    expect(
      planWorkerActions({
        constructionSites: [],
        controllers: [
          {
            id: 'controller-1',
            level: TEST_CONTROLLER_LEVEL,
            roomName: 'W1N1',
            ticksToDowngrade: TEST_CONTROLLER_SAFE_TICKS,
            x: 26,
            y: 7,
          },
        ],
        creeps: [
          {
            energy: 0,
            freeCapacity: 50,
            name: 'Upgrader1',
            role: 'upgrader',
            roomName: 'W1N1',
            x: 25,
            y: 7,
          },
        ],
        energyStructures: [],
        energyWithdrawals: [
          {
            availableEnergy: 200,
            id: 'source-container-1',
            roomName: 'W1N1',
            targetType: 'container',
            x: 20,
            y: 20,
          },
          {
            availableEnergy: 50,
            id: 'controller-container-1',
            roomName: 'W1N1',
            targetType: 'container',
            x: 27,
            y: 8,
          },
        ],
        sources: [
          {
            id: 'source-1',
            roomName: 'W1N1',
            x: 20,
            y: 20,
          },
        ],
      }),
    ).toEqual([
      {
        creepName: 'Upgrader1',
        structureId: 'controller-container-1',
        type: 'withdrawEnergy',
      },
    ]);
  });

  it('keeps working upgraders focused on controller upgrading', () => {
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
            name: 'Upgrader1',
            role: 'upgrader',
            roomName: 'W1N1',
          },
        ],
        energyStructures: [
          {
            availableEnergy: 0,
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
        creepName: 'Upgrader1',
        type: 'upgradeController',
      },
    ]);
  });

  it('lets builders build before idle upgrade fallback', () => {
    expect(
      planWorkerActions({
        constructionSites: [
          {
            id: 'construction-site-1',
            progress: 100,
            progressTotal: 3000,
            roomName: 'W1N1',
            structureType: 'extension',
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
            name: 'Builder1',
            role: 'builder',
            roomName: 'W1N1',
          },
        ],
        energyStructures: [
          {
            availableEnergy: 0,
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
        creepName: 'Builder1',
        type: 'buildConstructionSite',
      },
    ]);
  });

  it('uses builders as upgrader fallback when there is no build or critical repair work', () => {
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
            name: 'Builder1',
            role: 'builder',
            roomName: 'W1N1',
          },
        ],
        energyStructures: [
          {
            availableEnergy: 0,
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
        creepName: 'Builder1',
        type: 'upgradeController',
      },
    ]);
  });

  it('assigns harvest sources to miners before legacy workers and haulers', () => {
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
            name: 'A-LegacyWorker',
            roomName: 'W1N1',
          },
          {
            energy: 0,
            freeCapacity: 50,
            name: 'Z-Miner',
            role: 'miner',
            roomName: 'W1N1',
          },
          {
            energy: 0,
            freeCapacity: 50,
            name: 'Z-OtherMiner',
            role: 'miner',
            roomName: 'W1N1',
          },
        ],
        energyStructures: [],
        sources: [
          {
            id: 'left-source',
            roomName: 'W1N1',
            x: 10,
            y: 10,
          },
          {
            id: 'right-source',
            roomName: 'W1N1',
            x: 30,
            y: 30,
          },
        ],
      }),
    ).toEqual([
      {
        creepName: 'A-LegacyWorker',
        sourceId: 'left-source',
        type: 'harvestSource',
      },
      {
        creepName: 'Z-Miner',
        sourceId: 'left-source',
        type: 'harvestSource',
      },
      {
        creepName: 'Z-OtherMiner',
        sourceId: 'right-source',
        type: 'harvestSource',
      },
    ]);
  });
});
