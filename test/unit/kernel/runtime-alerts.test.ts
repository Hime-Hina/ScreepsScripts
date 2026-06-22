import { describe, expect, it } from 'vitest';

import { selectRuntimeAlertDecisions } from '../../../src/kernel/runtime-alerts';
import type { DefenseWorldSnapshot } from '../../../src/defense/defense-planner';
import type { SpawningWorldSnapshot } from '../../../src/spawning/spawn-decision';

const createSpawningWorld = (
  roomOverrides: Partial<SpawningWorldSnapshot['rooms'][number]>,
): SpawningWorldSnapshot => ({
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
  gameTime: 51,
  rooms: [
    {
      constructionSites: [],
      controllerLevel: 2,
      energyStructures: [
        {
          availableEnergy: 200,
          energyCapacity: 300,
        },
      ],
      roomName: 'W1N1',
      structures: [
        {
          structureType: 'spawn',
        },
      ],
      ticksToDowngrade: 4999,
      workerCreepCount: 2,
      ...roomOverrides,
      sourceCount: roomOverrides.sourceCount ?? 2,
      workerCreepWorkParts: roomOverrides.workerCreepWorkParts ?? 2,
    },
  ],
  spawns: [
    {
      availableEnergy: 200,
      energyCapacity: 300,
      isSpawning: false,
      name: 'Spawn1',
      roomName: 'W1N1',
    },
  ],
});

const emptyDefenseWorld: DefenseWorldSnapshot = {
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

describe('runtime alert decisions', () => {
  it('creates throttled notify decisions for survival risks', () => {
    const alertDecisions = selectRuntimeAlertDecisions({
      actionFailures: [],
      defenseWorld: {
        ...emptyDefenseWorld,
        hostileCreeps: [
          {
            bodyParts: [{ hits: 100, type: 'attack' }],
            hits: 100,
            id: 'hostile-1',
            owner: 'Invader',
            roomName: 'W1N1',
            x: 10,
            y: 10,
          },
        ],
      },
      gameTime: 51,
      shardName: 'shard1',
      spawningWorld: createSpawningWorld({}),
    });

    expect(
      alertDecisions.map((alertDecision) => ({
        emailFallback: alertDecision.emailFallback,
        kind: alertDecision.opsEvent.kind,
        dedupeKey: alertDecision.opsEvent.dedupeKey,
        severity: alertDecision.opsEvent.severity,
      })),
    ).toEqual([
      {
        dedupeKey: 'controller_downgrade_critical:shard1:W1N1',
        emailFallback: true,
        kind: 'controller_downgrade_critical',
        severity: 'critical',
      },
      {
        dedupeKey: 'worker_count_low:shard1:W1N1',
        emailFallback: true,
        kind: 'worker_count_low',
        severity: 'critical',
      },
      {
        dedupeKey: 'spawn_energy_low:shard1:W1N1',
        emailFallback: false,
        kind: 'spawn_energy_low',
        severity: 'actionable',
      },
      {
        dedupeKey: 'hostile_present:shard1:W1N1',
        emailFallback: false,
        kind: 'hostile_present',
        severity: 'warning',
      },
    ]);
    expect(
      alertDecisions.every((alertDecision) => alertDecision.message.startsWith('[HERMES_EVENT] ')),
    ).toBe(true);
  });

  it('does not notify for transient low spawn energy when the room is healthy', () => {
    expect(
      selectRuntimeAlertDecisions({
        actionFailures: [],
        defenseWorld: emptyDefenseWorld,
        gameTime: 51,
        shardName: 'shard1',
        spawningWorld: createSpawningWorld({
          energyStructures: [
            {
              availableEnergy: 100,
              energyCapacity: 300,
            },
          ],
          ticksToDowngrade: 9000,
          workerCreepCount: 5,
        }),
      }),
    ).toEqual([]);
  });

  it('does not notify for a one-worker replacement dip when spawn recovery is available', () => {
    expect(
      selectRuntimeAlertDecisions({
        actionFailures: [],
        defenseWorld: emptyDefenseWorld,
        gameTime: 51,
        shardName: 'shard1',
        spawningWorld: createSpawningWorld({
          energyStructures: [
            {
              availableEnergy: 200,
              energyCapacity: 300,
            },
          ],
          ticksToDowngrade: 9000,
          workerCreepCount: 2,
        }),
      }),
    ).toEqual([]);
  });

  it('keeps worker count critical when a one-worker dip has no available recovery spawn', () => {
    const spawningWorld = createSpawningWorld({
      energyStructures: [
        {
          availableEnergy: 300,
          energyCapacity: 300,
        },
      ],
      ticksToDowngrade: 9000,
      workerCreepCount: 2,
    });

    const alertDecisions = selectRuntimeAlertDecisions({
      actionFailures: [],
      defenseWorld: emptyDefenseWorld,
      gameTime: 51,
      shardName: 'shard1',
      spawningWorld: {
        ...spawningWorld,
        spawns: [
          {
            ...spawningWorld.spawns[0],
            isSpawning: true,
          },
        ],
      },
    });

    expect(
      alertDecisions.map((alertDecision) => ({
        emailFallback: alertDecision.emailFallback,
        kind: alertDecision.opsEvent.kind,
        severity: alertDecision.opsEvent.severity,
      })),
    ).toEqual([
      {
        emailFallback: true,
        kind: 'worker_count_low',
        severity: 'critical',
      },
    ]);
  });

  it('keeps worker count critical when a one-worker dip lacks survival spawn energy', () => {
    const spawningWorld = createSpawningWorld({
      energyStructures: [
        {
          availableEnergy: 300,
          energyCapacity: 300,
        },
      ],
      ticksToDowngrade: 9000,
      workerCreepCount: 2,
    });

    const alertDecisions = selectRuntimeAlertDecisions({
      actionFailures: [],
      defenseWorld: emptyDefenseWorld,
      gameTime: 51,
      shardName: 'shard1',
      spawningWorld: {
        ...spawningWorld,
        spawns: [
          {
            ...spawningWorld.spawns[0],
            availableEnergy: 150,
          },
        ],
      },
    });

    expect(
      alertDecisions.map((alertDecision) => ({
        emailFallback: alertDecision.emailFallback,
        kind: alertDecision.opsEvent.kind,
        severity: alertDecision.opsEvent.severity,
      })),
    ).toEqual([
      {
        emailFallback: true,
        kind: 'worker_count_low',
        severity: 'critical',
      },
    ]);
  });

  it('keeps worker count critical when the worker population is missing', () => {
    const alertDecisions = selectRuntimeAlertDecisions({
      actionFailures: [],
      defenseWorld: emptyDefenseWorld,
      gameTime: 51,
      shardName: 'shard1',
      spawningWorld: createSpawningWorld({
        energyStructures: [
          {
            availableEnergy: 300,
            energyCapacity: 300,
          },
        ],
        ticksToDowngrade: 9000,
        workerCreepCount: 0,
      }),
    });

    expect(
      alertDecisions.map((alertDecision) => ({
        emailFallback: alertDecision.emailFallback,
        kind: alertDecision.opsEvent.kind,
        severity: alertDecision.opsEvent.severity,
      })),
    ).toEqual([
      {
        emailFallback: true,
        kind: 'worker_count_low',
        severity: 'critical',
      },
    ]);
  });

  it('keeps hostile presence critical when a damaging hostile is near core structures', () => {
    const alertDecisions = selectRuntimeAlertDecisions({
      actionFailures: [],
      defenseWorld: {
        ...emptyDefenseWorld,
        coreStructures: [
          {
            id: 'spawn-1',
            roomName: 'W1N1',
            structureType: 'spawn',
            x: 11,
            y: 10,
          },
        ],
        hostileCreeps: [
          {
            bodyParts: [{ hits: 100, type: 'attack' }],
            hits: 100,
            id: 'hostile-1',
            owner: 'Invader',
            roomName: 'W1N1',
            x: 10,
            y: 10,
          },
        ],
      },
      gameTime: 51,
      shardName: 'shard1',
      spawningWorld: createSpawningWorld({
        energyStructures: [
          {
            availableEnergy: 300,
            energyCapacity: 300,
          },
        ],
        ticksToDowngrade: 9000,
        workerCreepCount: 3,
      }),
    });

    expect(
      alertDecisions.map((alertDecision) => ({
        emailFallback: alertDecision.emailFallback,
        kind: alertDecision.opsEvent.kind,
        severity: alertDecision.opsEvent.severity,
      })),
    ).toEqual([
      {
        emailFallback: true,
        kind: 'hostile_present',
        severity: 'critical',
      },
    ]);
  });

  it('creates an actionable role composition drift event when surplus miners mask missing recovery roles', () => {
    const alertDecisions = selectRuntimeAlertDecisions({
      actionFailures: [],
      defenseWorld: emptyDefenseWorld,
      gameTime: 71835876,
      shardName: 'shard1',
      spawningWorld: createSpawningWorld({
        constructionSites: [{ remainingWork: 21120, structureType: 'storage' }],
        controllerEnergyAvailable: 2000,
        controllerLevel: 4,
        energyStructures: [
          {
            availableEnergy: 300,
            energyCapacity: 1050,
          },
        ],
        sourceContainerCount: 2,
        sourceContainerEnergyAvailable: 4000,
        sourceCount: 2,
        ticksToDowngrade: 9000,
        workerCreepCount: 15,
        workerCreeps: [
          ...Array.from({ length: 14 }, () => ({ role: 'miner' as const, ticksToLive: 1500 })),
          { role: 'hauler' as const, ticksToLive: 1500 },
        ],
      }),
    });

    expect(
      alertDecisions.map((alertDecision) => ({
        emailFallback: alertDecision.emailFallback,
        kind: alertDecision.opsEvent.kind,
        metrics: alertDecision.opsEvent.metrics,
        severity: alertDecision.opsEvent.severity,
      })),
    ).toEqual([
      {
        emailFallback: false,
        kind: 'role_composition_drift',
        metrics: {
          builderCount: 0,
          builderGap: 2,
          builderTarget: 2,
          constructionBacklogEnergy: 21120,
          haulerCount: 1,
          haulerGap: 1,
          haulerTarget: 2,
          minerCount: 14,
          minerSurplus: 12,
          minerTarget: 2,
          sourceContainerEnergyAvailable: 4000,
          upgraderCount: 0,
          upgraderGap: 1,
          upgraderTarget: 1,
          workerCount: 15,
        },
        severity: 'actionable',
      },
    ]);
    expect(alertDecisions[0]?.message).toContain('[HERMES_EVENT] ');
    expect(alertDecisions[0]?.opsEvent.dedupeKey).toBe('role_composition_drift:shard1:W1N1');
  });

  it('does not create role composition drift events for generic-only bootstrap rooms', () => {
    expect(
      selectRuntimeAlertDecisions({
        actionFailures: [],
        defenseWorld: emptyDefenseWorld,
        gameTime: 71835876,
        shardName: 'shard1',
        spawningWorld: createSpawningWorld({
          constructionSites: [{ remainingWork: 21120, structureType: 'storage' }],
          controllerEnergyAvailable: 2000,
          controllerLevel: 4,
          energyStructures: [
            {
              availableEnergy: 1050,
              energyCapacity: 1050,
            },
          ],
          sourceContainerCount: 2,
          sourceContainerEnergyAvailable: 4000,
          sourceCount: 2,
          ticksToDowngrade: 9000,
          workerCreepCount: 15,
          workerCreeps: Array.from({ length: 15 }, () => ({
            role: 'worker' as const,
            ticksToLive: 1500,
          })),
        }),
      }),
    ).toEqual([]);
  });

  it('does not create role composition drift events when role targets are covered', () => {
    expect(
      selectRuntimeAlertDecisions({
        actionFailures: [],
        defenseWorld: emptyDefenseWorld,
        gameTime: 71835876,
        shardName: 'shard1',
        spawningWorld: createSpawningWorld({
          constructionSites: [{ remainingWork: 21120, structureType: 'storage' }],
          controllerEnergyAvailable: 2000,
          controllerLevel: 4,
          energyStructures: [
            {
              availableEnergy: 1050,
              energyCapacity: 1050,
            },
          ],
          sourceContainerCount: 2,
          sourceContainerEnergyAvailable: 4000,
          sourceCount: 2,
          ticksToDowngrade: 9000,
          workerCreepCount: 7,
          workerCreeps: [
            { role: 'miner', ticksToLive: 1500 },
            { role: 'miner', ticksToLive: 1500 },
            { role: 'hauler', ticksToLive: 1500 },
            { role: 'hauler', ticksToLive: 1500 },
            { role: 'builder', ticksToLive: 1500 },
            { role: 'builder', ticksToLive: 1500 },
            { role: 'upgrader', ticksToLive: 1500 },
          ],
        }),
      }),
    ).toEqual([]);
  });

  it('does not notify when survival signals are stable', () => {
    expect(
      selectRuntimeAlertDecisions({
        actionFailures: [],
        defenseWorld: emptyDefenseWorld,
        gameTime: 51,
        shardName: 'shard1',
        spawningWorld: createSpawningWorld({
          energyStructures: [
            {
              availableEnergy: 300,
              energyCapacity: 300,
            },
          ],
          ticksToDowngrade: 9000,
          workerCreepCount: 3,
        }),
      }),
    ).toEqual([]);
  });
});
