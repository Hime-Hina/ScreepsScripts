import { afterEach, describe, expect, it, vi } from 'vitest';

describe('Screeps main loop', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads the Screeps globals at loop time', async () => {
    const consoleLines: string[] = [];
    const screepsMemory: Record<string, unknown> = {};
    const firstSpawn = {
      name: 'Spawn1',
      spawning: null,
      store: {
        getUsedCapacity: () => 300,
      },
    };

    vi.stubGlobal('Game', {
      creeps: {},
      cpu: {
        getUsed: () => 0.5,
      },
      spawns: {
        Spawn1: firstSpawn,
      },
      time: 7,
    });
    vi.stubGlobal('Memory', screepsMemory);
    vi.stubGlobal('RESOURCE_ENERGY', 'energy');
    vi.stubGlobal('console', {
      log: (message: string) => consoleLines.push(message),
    });

    const mainModule = await import('../../src/main');

    mainModule.loop();

    expect(consoleLines).toEqual(['[tick 7] cpu=0.50']);
    expect(screepsMemory).toEqual({
      screepsScripts: {
        schemaVersion: 1,
      },
    });
  });
});
