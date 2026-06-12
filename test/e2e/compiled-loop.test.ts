import { readFileSync } from 'node:fs';
import vm from 'node:vm';

import { describe, expect, it } from 'vitest';

type ScreepsLoop = () => void;

const TEST_FIND_CONSTRUCTION_SITES = 107;
const TEST_FIND_DROPPED_RESOURCES = 106;
const TEST_FIND_MY_CONSTRUCTION_SITES = 108;
const TEST_FIND_MY_STRUCTURES = 109;
const TEST_FIND_MINERALS = 110;
const TEST_FIND_RUINS = 123;
const TEST_FIND_SOURCES = 105;
const TEST_FIND_STRUCTURES = 111;
const TEST_FIND_TOMBSTONES = 118;
const TEST_STRUCTURE_EXTENSION = 'extension';
const TEST_STRUCTURE_SPAWN = 'spawn';
const TEST_BODY_PART_COST = {
  carry: 50,
  move: 50,
  work: 100,
};
const TEST_CONSTRUCTION_COST = {
  extension: 3000,
};
const TEST_CONTROLLER_STRUCTURES = {
  extension: {
    2: 5,
  },
};

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
            name: 'W1N1',
          },
        },
        spawns: {
          Spawn1: firstSpawn,
        },
        time: 99,
      },
      BODYPART_COST: TEST_BODY_PART_COST,
      CONSTRUCTION_COST: TEST_CONSTRUCTION_COST,
      CONTROLLER_STRUCTURES: TEST_CONTROLLER_STRUCTURES,
      FIND_CONSTRUCTION_SITES: TEST_FIND_CONSTRUCTION_SITES,
      FIND_DROPPED_RESOURCES: TEST_FIND_DROPPED_RESOURCES,
      FIND_MY_CONSTRUCTION_SITES: TEST_FIND_MY_CONSTRUCTION_SITES,
      FIND_MY_STRUCTURES: TEST_FIND_MY_STRUCTURES,
      FIND_MINERALS: TEST_FIND_MINERALS,
      FIND_MY_CREEPS: 101,
      FIND_RUINS: TEST_FIND_RUINS,
      FIND_SOURCES: TEST_FIND_SOURCES,
      FIND_STRUCTURES: TEST_FIND_STRUCTURES,
      FIND_TOMBSTONES: TEST_FIND_TOMBSTONES,
      Memory: screepsMemory,
      RESOURCE_ENERGY: 'energy',
      STRUCTURE_EXTENSION: TEST_STRUCTURE_EXTENSION,
      STRUCTURE_SPAWN: TEST_STRUCTURE_SPAWN,
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
