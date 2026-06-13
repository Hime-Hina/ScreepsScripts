import { describe, expect, it } from 'vitest';

import type { ConstructionDecision } from '../../../src/construction/construction-planner';
import { runTick } from '../../../src/kernel/run-tick';
import type { DefenseDecision, RoomDefenseState } from '../../../src/defense/defense-planner';
import type { WorkerActionDecision } from '../../../src/creeps/worker-decision';
import { createEmptyScreepsMemoryState } from '../../../src/memory/screeps-memory';
import type { ScreepsTickIO } from '../../../src/runtime/screeps-runtime';
import type { SpawnDecision } from '../../../src/spawning/spawn-decision';

describe('runTick', () => {
  it('reports the current tick and executes bootstrap actions', () => {
    const consoleLines: string[] = [];
    const executedConstructionDecisions: ConstructionDecision[] = [];
    const executedDefenseDecisions: DefenseDecision[] = [];
    const executedSpawnDecisions: SpawnDecision[] = [];
    const executedWorkerDecisions: WorkerActionDecision[] = [];
    const sentRuntimeAlerts: unknown[] = [];
    const roomDefenseStates: readonly RoomDefenseState[] = [
      {
        roomName: 'W1N1',
        type: 'roomSafe',
      },
    ];
    const tickRuntime: ScreepsTickIO = {
      executeConstructionDecisions: (constructionDecisions) =>
        executedConstructionDecisions.push(...constructionDecisions),
      executeDefenseDecisions: (defenseDecisions) =>
        executedDefenseDecisions.push(...defenseDecisions),
      executeSpawnDecision: (spawnDecision) => executedSpawnDecisions.push(spawnDecision),
      executeWorkerActions: (workerDecisions) => executedWorkerDecisions.push(...workerDecisions),
      gameTime: 42,
      readCpuSnapshot: () => ({
        bucket: 5000,
        limit: 20,
        tickLimit: 500,
        usedAtTickStart: 1.25,
      }),
      readConstructionWorld: () => ({
        controllerStructureLimits: {
          extension: {
            2: 5,
          },
        },
        ownedRooms: [],
      }),
      readDefenseWorld: () => ({
        bodyPartConstants: {
          attack: 'attack',
          heal: 'heal',
          move: 'move',
          rangedAttack: 'ranged_attack',
          work: 'work',
        },
        bodyPartPowers: {
          attack: 30,
          dismantle: 50,
          heal: 12,
          rangedAttack: 10,
        },
        controllers: [],
        coreStructures: [],
        hostileCreeps: [],
        roomNames: ['W1N1'],
      }),
      readSpawningWorld: () => ({
        bodyPartCosts: {
          carry: 50,
          move: 50,
          work: 100,
        },
        constructionCosts: {
          extension: 3000,
        },
        controllerStructureLimits: {
          extension: {
            2: 0,
          },
        },
        gameTime: 42,
        rooms: [
          {
            constructionSites: [],
            controllerLevel: 2,
            energyStructures: [
              {
                availableEnergy: 300,
                energyCapacity: 300,
              },
            ],
            roomName: 'W1N1',
            structures: [
              {
                structureType: 'spawn',
              },
            ],
            ticksToDowngrade: 9000,
            workerCreepCount: 0,
          },
        ],
        spawns: [
          {
            availableEnergy: 300,
            energyCapacity: 300,
            isSpawning: false,
            name: 'Spawn1',
            roomName: 'W1N1',
          },
        ],
      }),
      readSurvivalSpawningWorld: () => {
        throw new Error('Full budget tick must not read the survival spawning world.');
      },
      readWorkerWorld: (capturedRoomDefenseStates) => {
        expect(capturedRoomDefenseStates).toEqual(roomDefenseStates);

        return {
          constructionEligibilities: [],
          constructionSites: [],
          controllers: [],
          creeps: [],
          energyPickups: [],
          energyStructures: [],
          energyWithdrawals: [],
          repairTargets: [],
          sources: [],
        };
      },
      readSurvivalWorkerWorld: () => {
        throw new Error('Full budget tick must not read the survival worker world.');
      },
      sendRuntimeAlert: (alertDecision) => sentRuntimeAlerts.push(alertDecision),
      writeConsoleLine: (message) => consoleLines.push(message),
    };

    const tickExecution = runTick(tickRuntime, createEmptyScreepsMemoryState());

    expect(tickExecution).toEqual({
      constructionDecisions: [],
      defenseDecisions: [],
      memoryState: {
        schemaVersion: 1,
      },
      spawnDecision: {
        body: ['work', 'carry', 'carry', 'move', 'move'],
        creepName: 'Spawn1-worker-42',
        spawnName: 'Spawn1',
      },
      telemetry: {
        cpuSnapshot: {
          bucket: 5000,
          limit: 20,
          tickLimit: 500,
          usedAtTickStart: 1.25,
        },
        gameTime: 42,
        tickBudgetDecision: {
          type: 'fullTickBudget',
        },
      },
      workerDecisions: [],
    });
    expect(consoleLines).toEqual([
      '[tick 42] cpu=1.25 bucket=5000 limit=20 tickLimit=500 budget=full rooms=W1N1:workers=0:spawnEnergy=300/300:construction=0:hostiles=0',
    ]);
    expect(executedConstructionDecisions).toEqual([]);
    expect(executedDefenseDecisions).toEqual([]);
    expect(executedSpawnDecisions).toEqual([
      {
        body: ['work', 'carry', 'carry', 'move', 'move'],
        creepName: 'Spawn1-worker-42',
        spawnName: 'Spawn1',
      },
    ]);
    expect(executedWorkerDecisions).toEqual([]);
    expect(sentRuntimeAlerts).toEqual([
      {
        groupInterval: 100,
        message: 'alert=worker-count-low room=W1N1 workers=0',
        type: 'notify',
      },
    ]);
  });

  it('plans construction, spawning, and worker actions before executing them in order', () => {
    const runtimeEvents: string[] = [];
    const tickRuntime: ScreepsTickIO = {
      executeConstructionDecisions: () => runtimeEvents.push('executeConstructionDecisions'),
      executeDefenseDecisions: () => runtimeEvents.push('executeDefenseDecisions'),
      executeSpawnDecision: () => runtimeEvents.push('executeSpawnDecision'),
      executeWorkerActions: () => runtimeEvents.push('executeWorkerActions'),
      gameTime: 43,
      readCpuSnapshot: () => {
        runtimeEvents.push('readCpuSnapshot');
        return {
          bucket: 5000,
          limit: 20,
          tickLimit: 500,
          usedAtTickStart: 1,
        };
      },
      readConstructionWorld: () => {
        runtimeEvents.push('readConstructionWorld');

        return {
          controllerStructureLimits: {
            extension: {
              2: 5,
            },
          },
          ownedRooms: [
            {
              blockedPositions: [],
              constructionSites: [],
              controllerLevel: 2,
              roomName: 'W1N1',
              spawnPosition: { x: 10, y: 10 },
              structures: [
                {
                  structureType: 'spawn',
                  x: 10,
                  y: 10,
                },
              ],
              terrain: [
                { terrain: 'plain', x: 9, y: 9 },
                { terrain: 'plain', x: 10, y: 9 },
                { terrain: 'plain', x: 11, y: 9 },
                { terrain: 'plain', x: 9, y: 10 },
                { terrain: 'plain', x: 11, y: 10 },
              ],
            },
          ],
        };
      },
      readDefenseWorld: () => {
        runtimeEvents.push('readDefenseWorld');

        return {
          bodyPartConstants: {
            attack: 'attack',
            heal: 'heal',
            move: 'move',
            rangedAttack: 'ranged_attack',
            work: 'work',
          },
          bodyPartPowers: {
            attack: 30,
            dismantle: 50,
            heal: 12,
            rangedAttack: 10,
          },
          controllers: [],
          coreStructures: [],
          hostileCreeps: [],
          roomNames: ['W1N1'],
        };
      },
      readSpawningWorld: () => {
        runtimeEvents.push('readSpawningWorld');

        return {
          bodyPartCosts: {
            carry: 50,
            move: 50,
            work: 100,
          },
          constructionCosts: {
            extension: 3000,
          },
          controllerStructureLimits: {
            extension: {
              2: 0,
            },
          },
          gameTime: 43,
          rooms: [
            {
              constructionSites: [],
              controllerLevel: 2,
              energyStructures: [
                {
                  availableEnergy: 300,
                  energyCapacity: 300,
                },
              ],
              roomName: 'W1N1',
              structures: [
                {
                  structureType: 'spawn',
                },
              ],
              ticksToDowngrade: 9000,
              workerCreepCount: 0,
            },
          ],
          spawns: [
            {
              availableEnergy: 300,
              energyCapacity: 300,
              isSpawning: false,
              name: 'Spawn1',
              roomName: 'W1N1',
            },
          ],
        };
      },
      readSurvivalSpawningWorld: () => {
        throw new Error('Full budget tick must not read the survival spawning world.');
      },
      readWorkerWorld: (roomDefenseStates) => {
        runtimeEvents.push('readWorkerWorld');
        expect(roomDefenseStates).toEqual([
          {
            roomName: 'W1N1',
            type: 'roomSafe',
          },
        ]);

        return {
          constructionEligibilities: [
            {
              roomName: 'W1N1',
              type: 'constructionAllowed',
            },
          ],
          constructionSites: [
            {
              id: 'site-1',
              roomName: 'W1N1',
            },
          ],
          controllers: [
            {
              id: 'controller-1',
              level: 2,
              roomName: 'W1N1',
              ticksToDowngrade: 9000,
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
          energyPickups: [],
          energyStructures: [
            {
              availableEnergy: 300,
              energyCapacity: 300,
              id: 'spawn-1',
              roomName: 'W1N1',
            },
          ],
          energyWithdrawals: [],
          repairTargets: [],
          sources: [
            {
              id: 'source-1',
              roomName: 'W1N1',
            },
          ],
        };
      },
      readSurvivalWorkerWorld: () => {
        throw new Error('Full budget tick must not read the survival worker world.');
      },
      sendRuntimeAlert: () => runtimeEvents.push('sendRuntimeAlert'),
      writeConsoleLine: () => runtimeEvents.push('writeConsoleLine'),
    };

    const tickExecution = runTick(tickRuntime, createEmptyScreepsMemoryState());

    expect(tickExecution.constructionDecisions).toHaveLength(5);
    expect(tickExecution.spawnDecision).not.toBeNull();
    expect(tickExecution.workerDecisions).toEqual([
      {
        constructionSiteId: 'site-1',
        creepName: 'Worker1',
        type: 'buildConstructionSite',
      },
    ]);
    expect(runtimeEvents).toEqual([
      'readCpuSnapshot',
      'readDefenseWorld',
      'readConstructionWorld',
      'readSpawningWorld',
      'readWorkerWorld',
      'executeDefenseDecisions',
      'executeConstructionDecisions',
      'executeSpawnDecision',
      'executeWorkerActions',
      'sendRuntimeAlert',
      'writeConsoleLine',
    ]);
  });

  it('uses survival-only budget to skip non-critical construction and repair work', () => {
    const runtimeEvents: string[] = [];
    const executedWorkerDecisions: WorkerActionDecision[] = [];
    const tickRuntime: ScreepsTickIO = {
      executeConstructionDecisions: () => runtimeEvents.push('executeConstructionDecisions'),
      executeDefenseDecisions: () => runtimeEvents.push('executeDefenseDecisions'),
      executeSpawnDecision: () => runtimeEvents.push('executeSpawnDecision'),
      executeWorkerActions: (workerDecisions) => {
        runtimeEvents.push('executeWorkerActions');
        executedWorkerDecisions.push(...workerDecisions);
      },
      gameTime: 44,
      readCpuSnapshot: () => {
        runtimeEvents.push('readCpuSnapshot');
        return {
          bucket: 1999,
          limit: 20,
          tickLimit: 20,
          usedAtTickStart: 1,
        };
      },
      readConstructionWorld: () => {
        throw new Error('Survival-only budget must not read the construction world.');
      },
      readDefenseWorld: () => {
        runtimeEvents.push('readDefenseWorld');

        return {
          bodyPartConstants: {
            attack: 'attack',
            heal: 'heal',
            move: 'move',
            rangedAttack: 'ranged_attack',
            work: 'work',
          },
          bodyPartPowers: {
            attack: 30,
            dismantle: 50,
            heal: 12,
            rangedAttack: 10,
          },
          controllers: [],
          coreStructures: [],
          hostileCreeps: [],
          roomNames: ['W1N1'],
        };
      },
      readSpawningWorld: () => {
        throw new Error('Survival-only budget must not read the full spawning world.');
      },
      readSurvivalSpawningWorld: () => {
        runtimeEvents.push('readSurvivalSpawningWorld');

        return {
          bodyPartCosts: {
            carry: 50,
            move: 50,
            work: 100,
          },
          constructionCosts: {
            extension: 3000,
          },
          controllerStructureLimits: {
            extension: {
              2: 5,
            },
          },
          gameTime: 44,
          rooms: [
            {
              constructionSites: [],
              controllerLevel: 2,
              energyStructures: [
                {
                  availableEnergy: 300,
                  energyCapacity: 300,
                },
              ],
              roomName: 'W1N1',
              structures: [
                {
                  structureType: 'spawn',
                },
              ],
              ticksToDowngrade: 4000,
              workerCreepCount: 0,
            },
          ],
          spawns: [
            {
              availableEnergy: 300,
              energyCapacity: 300,
              isSpawning: false,
              name: 'Spawn1',
              roomName: 'W1N1',
            },
          ],
        };
      },
      readWorkerWorld: () => {
        throw new Error('Survival-only budget must not read the full worker world.');
      },
      readSurvivalWorkerWorld: () => {
        runtimeEvents.push('readSurvivalWorkerWorld');

        return {
          constructionEligibilities: [
            {
              roomName: 'W1N1',
              type: 'constructionDeferredForSurvival',
            },
          ],
          constructionSites: [],
          controllers: [
            {
              id: 'controller-1',
              level: 2,
              roomName: 'W1N1',
              ticksToDowngrade: 4000,
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
          energyPickups: [],
          energyStructures: [],
          energyWithdrawals: [],
          repairTargets: [],
          sources: [],
        };
      },
      sendRuntimeAlert: () => runtimeEvents.push('sendRuntimeAlert'),
      writeConsoleLine: () => runtimeEvents.push('writeConsoleLine'),
    };

    const tickExecution = runTick(tickRuntime, createEmptyScreepsMemoryState());

    expect(tickExecution.telemetry.tickBudgetDecision).toEqual({
      type: 'survivalOnlyTickBudget',
    });
    expect(tickExecution.constructionDecisions).toEqual([]);
    expect(tickExecution.spawnDecision).toEqual({
      body: ['work', 'carry', 'carry', 'move', 'move'],
      creepName: 'Spawn1-worker-44',
      spawnName: 'Spawn1',
    });
    expect(executedWorkerDecisions).toEqual([
      {
        controllerId: 'controller-1',
        creepName: 'Worker1',
        type: 'upgradeController',
      },
    ]);
    expect(runtimeEvents).toEqual([
      'readCpuSnapshot',
      'readDefenseWorld',
      'readSurvivalSpawningWorld',
      'readSurvivalWorkerWorld',
      'executeDefenseDecisions',
      'executeConstructionDecisions',
      'executeSpawnDecision',
      'executeWorkerActions',
      'sendRuntimeAlert',
      'sendRuntimeAlert',
      'writeConsoleLine',
    ]);
  });
});
