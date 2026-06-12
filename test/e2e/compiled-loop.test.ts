import { readFileSync } from 'node:fs';
import vm from 'node:vm';

import { describe, expect, it } from 'vitest';

type ScreepsLoop = () => void;

const isScreepsLoop = (candidateLoop: unknown): candidateLoop is ScreepsLoop =>
  typeof candidateLoop === 'function';

describe('compiled Screeps bundle', () => {
  it('exports and executes loop from dist/main.js', () => {
    const compiledSource = readFileSync('dist/main.js', 'utf8');
    const commonjsExports: { loop?: unknown } = {};
    const consoleLines: string[] = [];
    const screepsMemory: Record<string, unknown> = {};
    const spawnRequests: unknown[] = [];
    const firstSpawn = {
      name: 'Spawn1',
      pos: {
        roomName: 'W1N1',
      },
      spawnCreep: (...spawnArguments: unknown[]) => spawnRequests.push(spawnArguments),
      spawning: null,
      store: {
        getCapacity: () => 300,
        getUsedCapacity: () => 300,
      },
    };
    const scriptContext = {
      Game: {
        creeps: {},
        cpu: {
          getUsed: () => 2.5,
        },
        getObjectById: () => null,
        rooms: {
          W1N1: {
            controller: undefined,
            find: () => [],
          },
        },
        spawns: {
          Spawn1: firstSpawn,
        },
        time: 99,
      },
      FIND_MY_CREEPS: 101,
      FIND_SOURCES: 105,
      Memory: screepsMemory,
      RESOURCE_ENERGY: 'energy',
      console: {
        log: (message: string) => consoleLines.push(message),
      },
      exports: commonjsExports,
      module: {
        exports: commonjsExports,
      },
    };

    new vm.Script(compiledSource).runInNewContext(scriptContext);

    expect(isScreepsLoop(commonjsExports.loop)).toBe(true);

    if (!isScreepsLoop(commonjsExports.loop)) {
      throw new Error('Compiled Screeps bundle did not export a callable loop.');
    }

    commonjsExports.loop();

    expect(consoleLines).toEqual(['[tick 99] cpu=2.50']);
    expect(spawnRequests).toEqual([
      [['work', 'carry', 'carry', 'move', 'move'], 'Spawn1-worker-99'],
    ]);
    expect(screepsMemory).toEqual({
      screepsScripts: {
        schemaVersion: 1,
      },
    });
  });
});
