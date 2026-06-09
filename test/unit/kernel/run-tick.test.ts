import { describe, expect, it } from 'vitest';

import { runTick } from '../../../src/kernel/run-tick';
import { createEmptyScreepsMemoryState } from '../../../src/memory/screeps-memory';
import type { ScreepsTickIO } from '../../../src/runtime/screeps-runtime';

describe('runTick', () => {
  it('reports the current tick and starting CPU usage', () => {
    const consoleLines: string[] = [];
    const tickRuntime: ScreepsTickIO = {
      gameTime: 42,
      readCpuUsed: () => 1.25,
      readSpawningWorld: () => ({
        creepCount: 0,
        spawns: [
          {
            availableEnergy: 300,
            isSpawning: false,
            name: 'Spawn1',
          },
        ],
      }),
      writeConsoleLine: (message) => consoleLines.push(message),
    };

    const tickExecution = runTick(tickRuntime, createEmptyScreepsMemoryState());

    expect(tickExecution).toEqual({
      memoryState: {
        schemaVersion: 1,
      },
      spawnDecision: {
        body: ['work', 'carry', 'move'],
        creepName: 'Worker1',
        spawnName: 'Spawn1',
      },
      telemetry: {
        cpuAtTickStart: 1.25,
        gameTime: 42,
      },
    });
    expect(consoleLines).toEqual(['[tick 42] cpu=1.25']);
  });
});
