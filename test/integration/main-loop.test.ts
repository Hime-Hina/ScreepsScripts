import { afterEach, describe, expect, it, vi } from 'vitest';

describe('Screeps main loop', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads the Screeps globals at loop time', async () => {
    const consoleLines: string[] = [];
    const screepsMemory: Record<string, unknown> = {};

    vi.stubGlobal('Game', {
      cpu: {
        getUsed: () => 0.5,
      },
      time: 7,
    });
    vi.stubGlobal('Memory', screepsMemory);
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
