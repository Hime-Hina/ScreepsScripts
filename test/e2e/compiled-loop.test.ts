import { readFileSync } from 'node:fs';
import vm from 'node:vm';

import { describe, expect, it } from 'vitest';

type ScreepsLoop = () => void;

const TEST_FIND_CONSTRUCTION_SITES = 107;
const TEST_FIND_DROPPED_RESOURCES = 106;
const TEST_FIND_HOSTILE_CREEPS = 103;
const TEST_FIND_MY_CONSTRUCTION_SITES = 108;
const TEST_FIND_MY_STRUCTURES = 109;
const TEST_FIND_MINERALS = 110;
const TEST_FIND_RUINS = 123;
const TEST_FIND_SOURCES = 105;
const TEST_FIND_STRUCTURES = 111;
const TEST_FIND_TOMBSTONES = 118;
const TEST_STRUCTURE_EXTENSION = 'extension';
const TEST_STRUCTURE_SPAWN = 'spawn';
const TEST_STRUCTURE_TOWER = 'tower';
const TEST_ATTACK = 'attack';
const TEST_HEAL = 'heal';
const TEST_MOVE = 'move';
const TEST_RANGED_ATTACK = 'ranged_attack';
const TEST_WORK = 'work';
const TEST_ATTACK_POWER = 30;
const TEST_DISMANTLE_POWER = 50;
const TEST_HEAL_POWER = 12;
const TEST_RANGED_ATTACK_POWER = 10;
const TEST_SPAWN_ENERGY_CAPACITY = 300;
const TEST_EXTENSION_ENERGY_CAPACITY = {
  0: 50,
  1: 50,
  2: 50,
  3: 50,
  4: 50,
  5: 50,
  6: 50,
  7: 100,
  8: 200,
};
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
  tower: {
    2: 0,
  },
};

const isScreepsLoop = (candidateLoop: unknown): candidateLoop is ScreepsLoop =>
  typeof candidateLoop === 'function';

const parseOpsEventLine = (opsEventLine: string): Record<string, unknown> =>
  JSON.parse(opsEventLine.replace(/^\[HERMES_EVENT\]\s*/u, '')) as Record<string, unknown>;

const findConsoleOpsEvent = (
  consoleLines: readonly string[],
  kind: string,
): Record<string, unknown> | undefined =>
  consoleLines
    .filter((consoleLine) => consoleLine.startsWith('[HERMES_EVENT] '))
    .map(parseOpsEventLine)
    .find((opsEvent) => opsEvent['kind'] === kind);

const createTestCpu = (usedAtTickStart: number) => ({
  bucket: 5000,
  getUsed: () => usedAtTickStart,
  limit: 20,
  tickLimit: 500,
});

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
        cpu: createTestCpu(2.5),
        getObjectById: () => null,
        notify: () => undefined,
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
      ATTACK: TEST_ATTACK,
      ATTACK_POWER: TEST_ATTACK_POWER,
      BODYPART_COST: TEST_BODY_PART_COST,
      CONSTRUCTION_COST: TEST_CONSTRUCTION_COST,
      CONTROLLER_STRUCTURES: TEST_CONTROLLER_STRUCTURES,
      DISMANTLE_POWER: TEST_DISMANTLE_POWER,
      EXTENSION_ENERGY_CAPACITY: TEST_EXTENSION_ENERGY_CAPACITY,
      FIND_CONSTRUCTION_SITES: TEST_FIND_CONSTRUCTION_SITES,
      FIND_DROPPED_RESOURCES: TEST_FIND_DROPPED_RESOURCES,
      FIND_HOSTILE_CREEPS: TEST_FIND_HOSTILE_CREEPS,
      FIND_MY_CONSTRUCTION_SITES: TEST_FIND_MY_CONSTRUCTION_SITES,
      FIND_MY_STRUCTURES: TEST_FIND_MY_STRUCTURES,
      FIND_MINERALS: TEST_FIND_MINERALS,
      FIND_MY_CREEPS: 101,
      FIND_RUINS: TEST_FIND_RUINS,
      FIND_SOURCES: TEST_FIND_SOURCES,
      FIND_STRUCTURES: TEST_FIND_STRUCTURES,
      FIND_TOMBSTONES: TEST_FIND_TOMBSTONES,
      HEAL: TEST_HEAL,
      HEAL_POWER: TEST_HEAL_POWER,
      Memory: screepsMemory,
      MOVE: TEST_MOVE,
      RANGED_ATTACK: TEST_RANGED_ATTACK,
      RANGED_ATTACK_POWER: TEST_RANGED_ATTACK_POWER,
      RESOURCE_ENERGY: 'energy',
      SPAWN_ENERGY_CAPACITY: TEST_SPAWN_ENERGY_CAPACITY,
      STRUCTURE_EXTENSION: TEST_STRUCTURE_EXTENSION,
      STRUCTURE_SPAWN: TEST_STRUCTURE_SPAWN,
      STRUCTURE_TOWER: TEST_STRUCTURE_TOWER,
      WORK: TEST_WORK,
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

    expect(findConsoleOpsEvent(consoleLines, 'runtime_heartbeat')).toMatchObject({
      kind: 'runtime_heartbeat',
      metrics: {
        bucket: 5000,
        budget: 'full',
        cpu: 2.5,
        limit: 20,
        rooms: [
          {
            constructionSiteCount: 0,
            hostileCount: 0,
            room: 'W1N1',
            spawnEnergy: '0/0',
            workerCount: 0,
          },
        ],
        tickLimit: 500,
      },
      tick: 99,
    });
    expect(consoleLines.some((consoleLine) => consoleLine.startsWith('[tick '))).toBe(false);
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
