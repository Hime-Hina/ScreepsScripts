import { describe, expect, it } from 'vitest';

import { runTick } from '../../../src/kernel/run-tick';
import type { WorkerActionDecision } from '../../../src/creeps/worker-decision';
import { createEmptyScreepsMemoryState } from '../../../src/memory/screeps-memory';
import type { ScreepsTickIO } from '../../../src/runtime/screeps-runtime';
import type { SpawnDecision } from '../../../src/spawning/spawn-decision';

describe('runTick', () => {
  it('reports the current tick and executes bootstrap actions', () => {
    const consoleLines: string[] = [];
    const executedSpawnDecisions: SpawnDecision[] = [];
    const executedWorkerDecisions: WorkerActionDecision[] = [];
    const tickRuntime: ScreepsTickIO = {
      executeSpawnDecision: (spawnDecision) => executedSpawnDecisions.push(spawnDecision),
      executeWorkerActions: (workerDecisions) => executedWorkerDecisions.push(...workerDecisions),
      gameTime: 42,
      readCpuUsed: () => 1.25,
      readSpawningWorld: () => ({
        gameTime: 42,
        spawns: [
          {
            availableEnergy: 300,
            energyCapacity: 300,
            isSpawning: false,
            name: 'Spawn1',
          },
        ],
        workerCreepCount: 0,
      }),
      readWorkerWorld: () => ({
        controllers: [],
        creeps: [],
        sources: [],
        spawns: [],
      }),
      writeConsoleLine: (message) => consoleLines.push(message),
    };

    const tickExecution = runTick(tickRuntime, createEmptyScreepsMemoryState());

    expect(tickExecution).toEqual({
      memoryState: {
        schemaVersion: 1,
      },
      spawnDecision: {
        body: ['work', 'carry', 'carry', 'move', 'move'],
        creepName: 'Spawn1-worker-42',
        spawnName: 'Spawn1',
      },
      telemetry: {
        cpuAtTickStart: 1.25,
        gameTime: 42,
      },
      workerDecisions: [],
    });
    expect(consoleLines).toEqual(['[tick 42] cpu=1.25']);
    expect(executedSpawnDecisions).toEqual([
      {
        body: ['work', 'carry', 'carry', 'move', 'move'],
        creepName: 'Spawn1-worker-42',
        spawnName: 'Spawn1',
      },
    ]);
    expect(executedWorkerDecisions).toEqual([]);
  });
});
