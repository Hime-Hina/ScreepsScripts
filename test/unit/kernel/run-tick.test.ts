import { describe, expect, it } from 'vitest';

import { runTick } from '../../../src/kernel/run-tick';
import type { ScreepsTickRuntime } from '../../../src/runtime/screeps-runtime';

describe('runTick', () => {
  it('reports the current tick and starting CPU usage', () => {
    const consoleLines: string[] = [];
    const tickRuntime: ScreepsTickRuntime = {
      gameTime: 42,
      readCpuUsed: () => 1.25,
      writeConsoleLine: (message) => consoleLines.push(message),
    };

    const tickTelemetry = runTick(tickRuntime);

    expect(tickTelemetry).toEqual({
      cpuAtTickStart: 1.25,
      gameTime: 42,
    });
    expect(consoleLines).toEqual(['[tick 42] cpu=1.25']);
  });
});
