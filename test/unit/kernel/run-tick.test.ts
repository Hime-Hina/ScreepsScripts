import { afterEach, describe, expect, it } from 'vitest';

import type { ConstructionDecision } from '../../../src/construction/construction-planner';
import { selectGmRuntimeStrategyDecision } from '../../../src/console/gm-console';
import { runTick } from '../../../src/kernel/run-tick';
import type { DefenseDecision, RoomDefenseState } from '../../../src/defense/defense-planner';
import type { TowerActionDecision } from '../../../src/defense/tower-planner';
import type { WorkerActionDecision } from '../../../src/creeps/worker-decision';
import { createEmptyScreepsMemoryState } from '../../../src/memory/screeps-memory';
import type { ScreepsTickIO } from '../../../src/runtime/screeps-runtime';
import type { SpawnDecision } from '../../../src/spawning/spawn-decision';

const parseOpsEventLine = (consoleLine: string): Record<string, unknown> =>
  JSON.parse(consoleLine.replace(/^\[HERMES_EVENT\]\s*/u, '')) as Record<string, unknown>;

const resetGmGlobals = (): void => {
  delete (globalThis as unknown as Record<string, unknown>)['gm'];
  delete (globalThis as unknown as Record<string, unknown>)['__gm'];
};

const createGmRecord = <T>(): Record<string, T> => Object.create(null) as Record<string, T>;

const createPlainTerrainRectangle = (minX: number, minY: number, maxX: number, maxY: number) => {
  const terrainTiles: { readonly terrain: 'plain'; readonly x: number; readonly y: number }[] = [];

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      terrainTiles.push({ terrain: 'plain', x, y });
    }
  }

  return terrainTiles;
};

describe('runTick', () => {
  afterEach(() => resetGmGlobals());

  it('reports the current tick and executes bootstrap actions', () => {
    const consoleLines: string[] = [];
    const executedConstructionDecisions: ConstructionDecision[] = [];
    const executedDefenseDecisions: DefenseDecision[] = [];
    const executedSpawnDecisions: SpawnDecision[] = [];
    const executedTowerDecisions: TowerActionDecision[] = [];
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
      executeTowerActions: (towerDecisions) => executedTowerDecisions.push(...towerDecisions),
      executeWorkerActions: (workerDecisions) => executedWorkerDecisions.push(...workerDecisions),
      gameTime: 42,
      shardName: 'shard1',
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
          tower: {
            2: 0,
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
            sourceCount: 2,
            structures: [
              {
                structureType: 'spawn',
              },
            ],
            ticksToDowngrade: 9000,
            workerCreepCount: 0,
            workerCreepWorkParts: 0,
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
      readTowerWorld: () => ({
        hostileCreeps: [],
        ownedCreeps: [],
        repairTargets: [],
        towerEnergyCost: 10,
        towers: [],
      }),
      readWorkerWorld: (capturedRoomDefenseStates) => {
        expect(capturedRoomDefenseStates).toEqual(roomDefenseStates);

        return {
          constructionEligibilities: [],
          constructionSites: [],
          controllers: [],
          creeps: [],
          energyDeposits: [],
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
        runtimeStrategyDecision: {
          type: 'none',
        },
        tickBudgetDecision: {
          type: 'fullTickBudget',
        },
      },
      towerDecisions: [],
      workerDecisions: [],
    });
    expect(consoleLines).toHaveLength(2);
    expect(consoleLines.every((consoleLine) => consoleLine.startsWith('[HERMES_EVENT] '))).toBe(
      true,
    );
    expect(consoleLines.some((consoleLine) => consoleLine.startsWith('[tick '))).toBe(false);
    expect(parseOpsEventLine(consoleLines[0])).toMatchObject({
      dedupeKey: 'worker_count_low:shard1:W1N1',
      id: 'worker_count_low:shard1:W1N1:42',
      kind: 'worker_count_low',
      metrics: {
        survivalFloor: 3,
        workers: 0,
      },
      room: 'W1N1',
      schema: 'screeps.ops.event.v1',
      severity: 'critical',
      shard: 'shard1',
      tick: 42,
    });
    expect(parseOpsEventLine(consoleLines[1])).toMatchObject({
      dedupeKey: 'runtime_heartbeat:shard1',
      id: 'runtime_heartbeat:shard1:42',
      kind: 'runtime_heartbeat',
      metrics: {
        bucket: 5000,
        budget: 'full',
        cpu: 1.25,
        limit: 20,
        rooms: [
          {
            constructionSiteCount: 0,
            hostileCount: 0,
            room: 'W1N1',
            spawnEnergy: '300/300',
            workerCount: 0,
          },
        ],
        tickLimit: 500,
      },
      schema: 'screeps.ops.event.v1',
      severity: 'info',
      shard: 'shard1',
      tick: 42,
    });
    expect(executedConstructionDecisions).toEqual([]);
    expect(executedDefenseDecisions).toEqual([]);
    expect(executedTowerDecisions).toEqual([]);
    expect(executedSpawnDecisions).toEqual([
      {
        body: ['work', 'carry', 'carry', 'move', 'move'],
        creepName: 'Spawn1-worker-42',
        spawnName: 'Spawn1',
      },
    ]);
    expect(executedWorkerDecisions).toEqual([]);
    expect(sentRuntimeAlerts).toHaveLength(1);
    expect(sentRuntimeAlerts[0]).toMatchObject({
      emailFallback: true,
      groupInterval: 100,
      opsEvent: {
        dedupeKey: 'worker_count_low:shard1:W1N1',
        id: 'worker_count_low:shard1:W1N1:42',
        kind: 'worker_count_low',
        severity: 'critical',
      },
      type: 'notify',
    });
  });

  it('applies a bounded GM pauseConstruction strategy without skipping defense, spawn, or worker work', () => {
    const consoleLines: string[] = [];
    const runtimeEvents: string[] = [];
    const runtimeStrategyInputs: Parameters<typeof selectGmRuntimeStrategyDecision>[0][] = [];
    const globalScope = globalThis as unknown as Record<string, unknown>;
    globalScope['__gm'] = {
      lastIntentByCreep: createGmRecord<unknown>(),
      lastWatchOutputById: createGmRecord<string>(),
      lastWatchSampleById: createGmRecord<string>(),
      nextWatchId: 1,
      runtimeStrategy: {
        createdAt: 100,
        expiresAt: 120,
        mode: 'pauseConstruction',
        roomName: 'W1N1',
      },
      version: 1,
      watches: createGmRecord<unknown>(),
    };

    const tickRuntime: ScreepsTickIO = {
      executeConstructionDecisions: (constructionDecisions) => {
        runtimeEvents.push(`executeConstructionDecisions:${constructionDecisions.length}`);
      },
      executeDefenseDecisions: () => runtimeEvents.push('executeDefenseDecisions'),
      executeSpawnDecision: () => runtimeEvents.push('executeSpawnDecision'),
      executeTowerActions: () => runtimeEvents.push('executeTowerActions'),
      executeWorkerActions: (workerDecisions) => {
        runtimeEvents.push(`executeWorkerActions:${workerDecisions.length}`);
      },
      gameTime: 110,
      shardName: 'shard1',
      readCpuSnapshot: () => ({
        bucket: 5000,
        limit: 20,
        tickLimit: 500,
        usedAtTickStart: 1,
      }),
      readConstructionWorld: () => {
        runtimeEvents.push('readConstructionWorld');

        return {
          controllerStructureLimits: {
            extension: {
              3: 10,
            },
            tower: {
              3: 1,
            },
          },
          ownedRooms: [
            {
              blockedPositions: [],
              constructionSites: [],
              controllerLevel: 3,
              roomName: 'W1N1',
              spawnPosition: { x: 10, y: 10 },
              structures: [
                {
                  structureType: 'spawn',
                  x: 10,
                  y: 10,
                },
              ],
              terrain: createPlainTerrainRectangle(8, 8, 12, 12),
            },
          ],
        };
      },
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
            3: 10,
          },
        },
        gameTime: 110,
        rooms: [
          {
            constructionSites: [
              {
                remainingWork: 2900,
                structureType: 'extension',
              },
            ],
            controllerLevel: 3,
            energyStructures: [
              {
                availableEnergy: 300,
                energyCapacity: 300,
              },
            ],
            isOwned: true,
            roomName: 'W1N1',
            sourceCount: 2,
            structures: [
              {
                structureType: 'spawn',
              },
            ],
            ticksToDowngrade: 9000,
            workerCreepCount: 4,
            workerCreepWorkParts: 4,
          },
          {
            constructionSites: [],
            controllerLevel: 0,
            energyStructures: [],
            isOwned: false,
            roomName: 'W9N9',
            sourceCount: 0,
            structures: [],
            ticksToDowngrade: 9000,
            workerCreepCount: 4,
            workerCreepWorkParts: 0,
          },
        ],
        spawns: [],
      }),
      readSurvivalSpawningWorld: () => {
        throw new Error('Full budget tick must not read survival spawning world.');
      },
      readTowerWorld: () => ({
        hostileCreeps: [],
        ownedCreeps: [],
        repairTargets: [],
        towerEnergyCost: 10,
        towers: [],
      }),
      readWorkerWorld: () => ({
        constructionEligibilities: [],
        constructionSites: [],
        controllers: [],
        creeps: [],
        energyDeposits: [],
        energyPickups: [],
        energyStructures: [],
        energyWithdrawals: [],
        repairTargets: [],
        sources: [],
      }),
      readSurvivalWorkerWorld: () => {
        throw new Error('Full budget tick must not read survival worker world.');
      },
      selectGmRuntimeStrategyDecision: (input) => {
        runtimeStrategyInputs.push(input);

        return selectGmRuntimeStrategyDecision(input);
      },
      sendRuntimeAlert: () => runtimeEvents.push('sendRuntimeAlert'),
      writeConsoleLine: (message) => consoleLines.push(message),
    };

    const tickExecution = runTick(tickRuntime, createEmptyScreepsMemoryState());

    expect(tickExecution.constructionDecisions).toEqual([]);
    expect(tickExecution.telemetry.runtimeStrategyDecision).toEqual({
      mode: 'pauseConstruction',
      roomName: 'W1N1',
      type: 'active',
    });
    expect(runtimeStrategyInputs).toHaveLength(1);
    expect(runtimeStrategyInputs[0].rooms.map((room) => room.roomName)).toEqual(['W1N1']);
    expect(runtimeEvents).toContain('executeDefenseDecisions');
    expect(runtimeEvents).toContain('executeTowerActions');
    expect(runtimeEvents).toContain('readConstructionWorld');
    expect(runtimeEvents).toContain('executeConstructionDecisions:0');
    expect(runtimeEvents).not.toContain('sendRuntimeAlert');
    expect(consoleLines.join('\n')).toContain('Status: active');
    expect(consoleLines.join('\n')).toContain('Mode: pauseConstruction');
  });

  it('plans construction, spawning, and worker actions before executing them in order', () => {
    const runtimeEvents: string[] = [];
    const tickRuntime: ScreepsTickIO = {
      executeConstructionDecisions: () => runtimeEvents.push('executeConstructionDecisions'),
      executeDefenseDecisions: () => runtimeEvents.push('executeDefenseDecisions'),
      executeSpawnDecision: () => runtimeEvents.push('executeSpawnDecision'),
      executeTowerActions: () => runtimeEvents.push('executeTowerActions'),
      executeWorkerActions: () => runtimeEvents.push('executeWorkerActions'),
      gameTime: 43,
      shardName: 'shard1',
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
            tower: {
              2: 0,
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
              terrain: createPlainTerrainRectangle(8, 8, 12, 12),
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
              sourceCount: 2,
              structures: [
                {
                  structureType: 'spawn',
                },
              ],
              ticksToDowngrade: 9000,
              workerCreepCount: 0,
              workerCreepWorkParts: 0,
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
      readTowerWorld: () => {
        runtimeEvents.push('readTowerWorld');

        return {
          hostileCreeps: [],
          ownedCreeps: [],
          repairTargets: [],
          towerEnergyCost: 10,
          towers: [],
        };
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
              energyMode: 'working',
              freeCapacity: 0,
              name: 'Worker1',
              roomName: 'W1N1',
            },
          ],
          energyDeposits: [],
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
      'readTowerWorld',
      'readSpawningWorld',
      'readConstructionWorld',
      'readWorkerWorld',
      'executeDefenseDecisions',
      'executeTowerActions',
      'executeConstructionDecisions',
      'executeSpawnDecision',
      'executeWorkerActions',
      'writeConsoleLine',
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
      executeTowerActions: () => runtimeEvents.push('executeTowerActions'),
      executeWorkerActions: (workerDecisions) => {
        runtimeEvents.push('executeWorkerActions');
        executedWorkerDecisions.push(...workerDecisions);
      },
      gameTime: 44,
      shardName: 'shard1',
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
      readTowerWorld: () => {
        runtimeEvents.push('readTowerWorld');

        return {
          hostileCreeps: [],
          ownedCreeps: [],
          repairTargets: [],
          towerEnergyCost: 10,
          towers: [],
        };
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
              sourceCount: 2,
              structures: [
                {
                  structureType: 'spawn',
                },
              ],
              ticksToDowngrade: 4000,
              workerCreepCount: 0,
              workerCreepWorkParts: 0,
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
              energyMode: 'working',
              freeCapacity: 0,
              name: 'Worker1',
              roomName: 'W1N1',
            },
          ],
          energyDeposits: [],
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
      'readTowerWorld',
      'readSurvivalSpawningWorld',
      'readSurvivalWorkerWorld',
      'executeDefenseDecisions',
      'executeTowerActions',
      'executeConstructionDecisions',
      'executeSpawnDecision',
      'executeWorkerActions',
      'writeConsoleLine',
      'sendRuntimeAlert',
      'writeConsoleLine',
      'sendRuntimeAlert',
      'writeConsoleLine',
    ]);
  });

  it('skips the normal worker action when a GM manual move override handled that creep', () => {
    const executedWorkerDecisions: WorkerActionDecision[] = [];
    const runtimeEvents: string[] = [];
    const tickRuntime: ScreepsTickIO = {
      applyGmFlagDirectives: () => {
        runtimeEvents.push('applyGmFlagDirectives');
        return ['Worker1'];
      },
      executeConstructionDecisions: () => runtimeEvents.push('executeConstructionDecisions'),
      executeDefenseDecisions: () => runtimeEvents.push('executeDefenseDecisions'),
      executeSpawnDecision: () => runtimeEvents.push('executeSpawnDecision'),
      executeTowerActions: () => runtimeEvents.push('executeTowerActions'),
      executeWorkerActions: (workerDecisions) => executedWorkerDecisions.push(...workerDecisions),
      gameTime: 45,
      shardName: 'shard1',
      readCpuSnapshot: () => ({
        bucket: 5000,
        limit: 20,
        tickLimit: 500,
        usedAtTickStart: 1,
      }),
      readConstructionWorld: () => ({
        controllerStructureLimits: {
          extension: {
            2: 5,
          },
          tower: {
            2: 0,
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
        gameTime: 45,
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
            sourceCount: 2,
            structures: [
              {
                structureType: 'spawn',
              },
            ],
            ticksToDowngrade: 9000,
            workerCreepCount: 3,
            workerCreepWorkParts: 3,
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
      readTowerWorld: () => {
        runtimeEvents.push('readTowerWorld');

        return {
          hostileCreeps: [],
          ownedCreeps: [],
          repairTargets: [],
          towerEnergyCost: 10,
          towers: [],
        };
      },
      readWorkerWorld: () => ({
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
        controllers: [],
        creeps: [
          {
            energy: 50,
            energyMode: 'working',
            freeCapacity: 0,
            name: 'Worker1',
            roomName: 'W1N1',
          },
        ],
        energyDeposits: [],
        energyPickups: [],
        energyStructures: [],
        energyWithdrawals: [],
        repairTargets: [],
        sources: [],
      }),
      readSurvivalWorkerWorld: () => {
        throw new Error('Full budget tick must not read the survival worker world.');
      },
      sendRuntimeAlert: () => runtimeEvents.push('sendRuntimeAlert'),
      writeConsoleLine: () => runtimeEvents.push('writeConsoleLine'),
    };

    const tickExecution = runTick(tickRuntime, createEmptyScreepsMemoryState());

    expect(tickExecution.workerDecisions).toEqual([
      {
        constructionSiteId: 'site-1',
        creepName: 'Worker1',
        type: 'buildConstructionSite',
      },
    ]);
    expect(executedWorkerDecisions).toEqual([]);
    expect(runtimeEvents).toContain('applyGmFlagDirectives');
  });
});
