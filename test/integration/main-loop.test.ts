import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const TEST_FIND_CONSTRUCTION_SITES = 111;
const TEST_FIND_DROPPED_RESOURCES = 106;
const TEST_FIND_HOSTILE_CREEPS = 103;
const TEST_FIND_MY_CONSTRUCTION_SITES = 114;
const TEST_FIND_MY_STRUCTURES = 108;
const TEST_FIND_MINERALS = 116;
const TEST_FIND_RUINS = 123;
const TEST_FIND_SOURCES = 105;
const TEST_FIND_STRUCTURES = 107;
const TEST_FIND_TOMBSTONES = 118;
const TEST_STRUCTURE_CONTAINER = 'container';
const TEST_STRUCTURE_EXTENSION = 'extension';
const TEST_STRUCTURE_RAMPART = 'rampart';
const TEST_STRUCTURE_ROAD = 'road';
const TEST_STRUCTURE_SPAWN = 'spawn';
const TEST_STRUCTURE_STORAGE = 'storage';
const TEST_STRUCTURE_TERMINAL = 'terminal';
const TEST_STRUCTURE_TOWER = 'tower';
const TEST_STRUCTURE_WALL = 'constructedWall';
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
    1: 0,
    2: 5,
    3: 10,
  },
  tower: {
    1: 0,
    2: 0,
    3: 1,
  },
};

const parseOpsEventLine = (opsEventLine: string): Record<string, unknown> =>
  JSON.parse(opsEventLine.replace(/^\[HERMES_EVENT\]\s*/u, '')) as Record<string, unknown>;

const parseConsoleOpsEvents = (consoleLines: readonly string[]): Record<string, unknown>[] =>
  consoleLines
    .filter((consoleLine) => consoleLine.startsWith('[HERMES_EVENT] '))
    .map(parseOpsEventLine);

const findConsoleOpsEvent = (
  consoleLines: readonly string[],
  kind: string,
): Record<string, unknown> | undefined =>
  parseConsoleOpsEvents(consoleLines).find((opsEvent) => opsEvent['kind'] === kind);

const findNotifyOpsEvent = (
  notifyRequests: readonly unknown[],
  kind: string,
): Record<string, unknown> | undefined => {
  for (const notifyRequest of notifyRequests) {
    if (!Array.isArray(notifyRequest) || typeof notifyRequest[0] !== 'string') {
      continue;
    }

    if (!notifyRequest[0].startsWith('[HERMES_EVENT] ')) {
      continue;
    }

    const opsEvent = parseOpsEventLine(notifyRequest[0]);

    if (opsEvent['kind'] === kind) {
      return opsEvent;
    }
  }

  return undefined;
};

const createTestCpu = (usedAtTickStart: number) => ({
  bucket: 5000,
  getUsed: () => usedAtTickStart,
  limit: 20,
  tickLimit: 500,
});

describe('Screeps main loop', () => {
  beforeEach(() => {
    vi.stubGlobal('BODYPART_COST', TEST_BODY_PART_COST);
    vi.stubGlobal('ATTACK', TEST_ATTACK);
    vi.stubGlobal('ATTACK_POWER', TEST_ATTACK_POWER);
    vi.stubGlobal('CONSTRUCTION_COST', TEST_CONSTRUCTION_COST);
    vi.stubGlobal('CONTROLLER_STRUCTURES', TEST_CONTROLLER_STRUCTURES);
    vi.stubGlobal('DISMANTLE_POWER', TEST_DISMANTLE_POWER);
    vi.stubGlobal('FIND_CONSTRUCTION_SITES', TEST_FIND_CONSTRUCTION_SITES);
    vi.stubGlobal('FIND_DROPPED_RESOURCES', TEST_FIND_DROPPED_RESOURCES);
    vi.stubGlobal('FIND_HOSTILE_CREEPS', TEST_FIND_HOSTILE_CREEPS);
    vi.stubGlobal('FIND_MY_CONSTRUCTION_SITES', TEST_FIND_MY_CONSTRUCTION_SITES);
    vi.stubGlobal('FIND_MY_STRUCTURES', TEST_FIND_MY_STRUCTURES);
    vi.stubGlobal('FIND_MINERALS', TEST_FIND_MINERALS);
    vi.stubGlobal('FIND_RUINS', TEST_FIND_RUINS);
    vi.stubGlobal('FIND_SOURCES', TEST_FIND_SOURCES);
    vi.stubGlobal('FIND_STRUCTURES', TEST_FIND_STRUCTURES);
    vi.stubGlobal('FIND_TOMBSTONES', TEST_FIND_TOMBSTONES);
    vi.stubGlobal('HEAL', TEST_HEAL);
    vi.stubGlobal('HEAL_POWER', TEST_HEAL_POWER);
    vi.stubGlobal('MOVE', TEST_MOVE);
    vi.stubGlobal('RANGED_ATTACK', TEST_RANGED_ATTACK);
    vi.stubGlobal('RANGED_ATTACK_POWER', TEST_RANGED_ATTACK_POWER);
    vi.stubGlobal('STRUCTURE_EXTENSION', TEST_STRUCTURE_EXTENSION);
    vi.stubGlobal('STRUCTURE_CONTAINER', TEST_STRUCTURE_CONTAINER);
    vi.stubGlobal('STRUCTURE_RAMPART', TEST_STRUCTURE_RAMPART);
    vi.stubGlobal('STRUCTURE_ROAD', TEST_STRUCTURE_ROAD);
    vi.stubGlobal('STRUCTURE_SPAWN', TEST_STRUCTURE_SPAWN);
    vi.stubGlobal('STRUCTURE_STORAGE', TEST_STRUCTURE_STORAGE);
    vi.stubGlobal('STRUCTURE_TERMINAL', TEST_STRUCTURE_TERMINAL);
    vi.stubGlobal('STRUCTURE_TOWER', TEST_STRUCTURE_TOWER);
    vi.stubGlobal('STRUCTURE_WALL', TEST_STRUCTURE_WALL);
    vi.stubGlobal('SPAWN_ENERGY_CAPACITY', TEST_SPAWN_ENERGY_CAPACITY);
    vi.stubGlobal('EXTENSION_ENERGY_CAPACITY', TEST_EXTENSION_ENERGY_CAPACITY);
    vi.stubGlobal('WORK', TEST_WORK);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads the Screeps globals at loop time', async () => {
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

    vi.stubGlobal('Game', {
      creeps: {},
      cpu: createTestCpu(0.5),
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
      time: 7,
    });
    vi.stubGlobal('Memory', screepsMemory);
    vi.stubGlobal('RESOURCE_ENERGY', 'energy');
    vi.stubGlobal('console', {
      log: (message: string) => consoleLines.push(message),
    });

    const mainModule = await import('../../src/main');

    mainModule.loop();

    expect(findConsoleOpsEvent(consoleLines, 'runtime_heartbeat')).toMatchObject({
      kind: 'runtime_heartbeat',
      metrics: {
        bucket: 5000,
        budget: 'full',
        cpu: 0.5,
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
      tick: 7,
    });
    expect(consoleLines.some((consoleLine) => consoleLine.startsWith('[tick '))).toBe(false);
    expect(spawnRequests).toEqual([
      [['work', 'carry', 'carry', 'move', 'move'], 'Spawn1-worker-7'],
    ]);
    expect(screepsMemory).toEqual({
      screepsScripts: {
        schemaVersion: 1,
      },
    });
  });

  it('captures spawn and extension energy capacity when the store reports null capacity', async () => {
    const consoleLines: string[] = [];
    const spawnRequests: unknown[] = [];
    const firstSpawn = {
      id: 'spawn-1',
      name: 'Spawn1',
      pos: {
        roomName: 'W1N1',
      },
      spawnCreep: (...spawnArguments: unknown[]) => spawnRequests.push(spawnArguments),
      spawning: null,
      structureType: TEST_STRUCTURE_SPAWN,
      store: {
        getCapacity: () => null,
        getUsedCapacity: () => 300,
      },
    };
    const firstExtension = {
      id: 'extension-1',
      pos: {
        roomName: 'W1N1',
      },
      structureType: TEST_STRUCTURE_EXTENSION,
      store: {
        getCapacity: () => null,
        getUsedCapacity: () => 0,
      },
    };

    vi.stubGlobal('Game', {
      creeps: {},
      cpu: createTestCpu(0.55),
      getObjectById: () => null,
      notify: () => undefined,
      rooms: {
        W1N1: {
          controller: {
            level: 2,
            ticksToDowngrade: 9000,
          },
          find: (findType: number) =>
            findType === TEST_FIND_MY_STRUCTURES ? [firstSpawn, firstExtension] : [],
          name: 'W1N1',
        },
      },
      spawns: {
        Spawn1: firstSpawn,
      },
      time: 27,
    });
    vi.stubGlobal('Memory', {});
    vi.stubGlobal('RESOURCE_ENERGY', 'energy');
    vi.stubGlobal('console', {
      log: (message: string) => consoleLines.push(message),
    });

    const mainModule = await import('../../src/main');

    mainModule.loop();

    expect(findConsoleOpsEvent(consoleLines, 'runtime_heartbeat')).toMatchObject({
      kind: 'runtime_heartbeat',
      metrics: {
        bucket: 5000,
        budget: 'full',
        cpu: 0.55,
        limit: 20,
        rooms: [
          {
            constructionSiteCount: 0,
            hostileCount: 0,
            room: 'W1N1',
            spawnEnergy: '300/350',
            workerCount: 0,
          },
        ],
        tickLimit: 500,
      },
      tick: 27,
    });
    expect(spawnRequests).toEqual([
      [['work', 'carry', 'carry', 'move', 'move'], 'Spawn1-worker-27'],
    ]);
  });

  it('uses room-level spawn and extension energy for worker body selection', async () => {
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
    } as {
      readonly name: string;
      readonly pos: { readonly roomName: string };
      readonly spawnCreep: (...spawnArguments: unknown[]) => number;
      readonly spawning: null;
      readonly store: {
        readonly getCapacity: () => number;
        readonly getUsedCapacity: () => number;
      };
      room?: unknown;
    };
    const room = {
      controller: undefined,
      energyAvailable: 550,
      energyCapacityAvailable: 550,
      find: () => [],
      name: 'W1N1',
    };
    firstSpawn.room = room;

    vi.stubGlobal('Game', {
      creeps: {},
      cpu: createTestCpu(0.58),
      getObjectById: () => null,
      notify: () => undefined,
      rooms: {
        W1N1: room,
      },
      spawns: {
        Spawn1: firstSpawn,
      },
      time: 28,
    });
    vi.stubGlobal('Memory', {});
    vi.stubGlobal('RESOURCE_ENERGY', 'energy');
    vi.stubGlobal('console', {
      log: () => undefined,
    });

    const mainModule = await import('../../src/main');

    mainModule.loop();

    expect(spawnRequests).toEqual([
      [
        ['work', 'work', 'carry', 'carry', 'carry', 'move', 'move', 'move', 'move'],
        'Spawn1-worker-28',
      ],
    ]);
  });

  it('cleans dead top-level creep memory before writing project memory', async () => {
    const liveWorkerCreep = {
      harvest: () => 0,
      moveTo: () => undefined,
      name: 'LiveWorker',
      room: {
        name: 'W1N1',
      },
      store: {
        getFreeCapacity: () => 50,
        getUsedCapacity: () => 0,
      },
      transfer: () => 0,
      upgradeController: () => 0,
    };
    const screepsMemory: Record<string, unknown> = {
      creeps: {
        DeadWorker: {
          role: 'worker',
        },
        LiveWorker: {
          role: 'worker',
        },
      },
    };

    vi.stubGlobal('Game', {
      creeps: {
        LiveWorker: liveWorkerCreep,
      },
      cpu: createTestCpu(0.55),
      getObjectById: () => null,
      notify: () => undefined,
      rooms: {
        W1N1: {
          controller: undefined,
          find: () => [],
          name: 'W1N1',
        },
      },
      spawns: {},
      time: 16,
    });
    vi.stubGlobal('Memory', screepsMemory);
    vi.stubGlobal('RESOURCE_ENERGY', 'energy');
    vi.stubGlobal('console', {
      log: () => undefined,
    });

    const mainModule = await import('../../src/main');

    mainModule.loop();

    expect(screepsMemory).toEqual({
      creeps: {
        LiveWorker: {
          role: 'worker',
        },
      },
      screepsScripts: {
        schemaVersion: 1,
      },
    });
  });

  it('moves a worker toward a source when harvest is out of range', async () => {
    const consoleLines: string[] = [];
    const screepsMemory: Record<string, unknown> = {};
    const harvestTargets: unknown[] = [];
    const moveTargets: unknown[] = [];
    const sourceTarget = {
      id: 'source-1',
    };
    const firstSpawn = {
      name: 'Spawn1',
      pos: {
        roomName: 'W1N1',
      },
      spawnCreep: () => 0,
      spawning: {},
      store: {
        getCapacity: () => 300,
        getUsedCapacity: () => 0,
      },
    };
    const workerCreep = {
      harvest: (target: unknown) => {
        harvestTargets.push(target);
        return -9;
      },
      moveTo: (target: unknown) => moveTargets.push(target),
      name: 'Worker1',
      room: {
        name: 'W1N1',
      },
      store: {
        getFreeCapacity: () => 50,
        getUsedCapacity: () => 0,
      },
      transfer: () => 0,
      upgradeController: () => 0,
    };

    vi.stubGlobal('Game', {
      creeps: {
        Worker1: workerCreep,
      },
      cpu: createTestCpu(0.7),
      getObjectById: (objectId: string) => (objectId === 'source-1' ? sourceTarget : null),
      notify: () => undefined,
      rooms: {
        W1N1: {
          controller: undefined,
          find: (findType: number) => (findType === TEST_FIND_SOURCES ? [sourceTarget] : []),
          name: 'W1N1',
        },
      },
      spawns: {
        Spawn1: firstSpawn,
      },
      time: 8,
    });
    vi.stubGlobal('ERR_NOT_IN_RANGE', -9);
    vi.stubGlobal('Memory', screepsMemory);
    vi.stubGlobal('RESOURCE_ENERGY', 'energy');
    vi.stubGlobal('console', {
      log: (message: string) => consoleLines.push(message),
    });

    const mainModule = await import('../../src/main');

    mainModule.loop();

    expect(harvestTargets).toEqual([sourceTarget]);
    expect(moveTargets).toEqual([sourceTarget]);
    expect(findConsoleOpsEvent(consoleLines, 'runtime_heartbeat')).toMatchObject({
      kind: 'runtime_heartbeat',
      metrics: {
        bucket: 5000,
        budget: 'full',
        cpu: 0.7,
        limit: 20,
        rooms: [
          {
            constructionSiteCount: 0,
            hostileCount: 0,
            room: 'W1N1',
            spawnEnergy: '0/0',
            workerCount: 1,
          },
        ],
        tickLimit: 500,
      },
      tick: 8,
    });
  });

  it('executes distributed harvest decisions through the runtime boundary', async () => {
    const harvestedSources: unknown[] = [];
    const firstSource = {
      id: 'source-a',
    };
    const secondSource = {
      id: 'source-b',
    };
    const firstSpawn = {
      name: 'Spawn1',
      pos: {
        roomName: 'W1N1',
      },
      spawnCreep: () => 0,
      spawning: {},
      store: {
        getCapacity: () => 300,
        getUsedCapacity: () => 0,
      },
    };
    const firstWorkerCreep = {
      harvest: (target: unknown) => {
        harvestedSources.push(target);
        return 0;
      },
      moveTo: () => undefined,
      name: 'WorkerA',
      room: {
        name: 'W1N1',
      },
      store: {
        getFreeCapacity: () => 50,
        getUsedCapacity: () => 0,
      },
      transfer: () => 0,
      upgradeController: () => 0,
    };
    const secondWorkerCreep = {
      harvest: (target: unknown) => {
        harvestedSources.push(target);
        return 0;
      },
      moveTo: () => undefined,
      name: 'WorkerB',
      room: {
        name: 'W1N1',
      },
      store: {
        getFreeCapacity: () => 50,
        getUsedCapacity: () => 0,
      },
      transfer: () => 0,
      upgradeController: () => 0,
    };

    vi.stubGlobal('Game', {
      creeps: {
        WorkerA: firstWorkerCreep,
        WorkerB: secondWorkerCreep,
      },
      cpu: createTestCpu(0.75),
      getObjectById: (objectId: string) => {
        if (objectId === 'source-a') {
          return firstSource;
        }

        if (objectId === 'source-b') {
          return secondSource;
        }

        return null;
      },
      notify: () => undefined,
      rooms: {
        W1N1: {
          controller: undefined,
          find: (findType: number) =>
            findType === TEST_FIND_SOURCES ? [firstSource, secondSource] : [],
          name: 'W1N1',
        },
      },
      spawns: {
        Spawn1: firstSpawn,
      },
      time: 11,
    });
    vi.stubGlobal('ERR_NOT_IN_RANGE', -9);
    vi.stubGlobal('Memory', {});
    vi.stubGlobal('RESOURCE_ENERGY', 'energy');
    vi.stubGlobal('console', {
      log: () => undefined,
    });

    const mainModule = await import('../../src/main');

    mainModule.loop();

    expect(harvestedSources).toEqual([firstSource, secondSource]);
  });

  it('picks up dropped energy through the runtime boundary before harvesting', async () => {
    const pickupTargets: unknown[] = [];
    const droppedEnergyTarget = {
      amount: 50,
      id: 'dropped-energy-1',
      pos: {
        roomName: 'W1N1',
      },
      resourceType: 'energy',
    };
    const sourceTarget = {
      id: 'source-1',
    };
    const firstSpawn = {
      name: 'Spawn1',
      pos: {
        roomName: 'W1N1',
      },
      spawnCreep: () => 0,
      spawning: {},
      store: {
        getCapacity: () => 300,
        getUsedCapacity: () => 0,
      },
    };
    const workerCreep = {
      harvest: () => 0,
      moveTo: () => undefined,
      name: 'Worker1',
      pickup: (target: unknown) => {
        pickupTargets.push(target);
        return 0;
      },
      room: {
        name: 'W1N1',
      },
      store: {
        getFreeCapacity: () => 50,
        getUsedCapacity: () => 0,
      },
      transfer: () => 0,
      upgradeController: () => 0,
    };

    vi.stubGlobal('Game', {
      creeps: {
        Worker1: workerCreep,
      },
      cpu: createTestCpu(0.71),
      getObjectById: (objectId: string) =>
        objectId === 'dropped-energy-1' ? droppedEnergyTarget : sourceTarget,
      notify: () => undefined,
      rooms: {
        W1N1: {
          controller: undefined,
          find: (findType: number) => {
            if (findType === TEST_FIND_DROPPED_RESOURCES) {
              return [droppedEnergyTarget];
            }

            if (findType === TEST_FIND_SOURCES) {
              return [sourceTarget];
            }

            return [];
          },
          name: 'W1N1',
        },
      },
      spawns: {
        Spawn1: firstSpawn,
      },
      time: 18,
    });
    vi.stubGlobal('ERR_NOT_IN_RANGE', -9);
    vi.stubGlobal('Memory', {});
    vi.stubGlobal('RESOURCE_ENERGY', 'energy');
    vi.stubGlobal('console', {
      log: () => undefined,
    });

    const mainModule = await import('../../src/main');

    mainModule.loop();

    expect(pickupTargets).toEqual([droppedEnergyTarget]);
  });

  it('withdraws tombstone energy through the runtime boundary before harvesting', async () => {
    const withdrawTargets: unknown[] = [];
    const tombstoneTarget = {
      id: 'tombstone-1',
      pos: {
        roomName: 'W1N1',
      },
      store: {
        getUsedCapacity: () => 50,
      },
    };
    const sourceTarget = {
      id: 'source-1',
    };
    const firstSpawn = {
      name: 'Spawn1',
      pos: {
        roomName: 'W1N1',
      },
      spawnCreep: () => 0,
      spawning: {},
      store: {
        getCapacity: () => 300,
        getUsedCapacity: () => 0,
      },
    };
    const workerCreep = {
      harvest: () => 0,
      moveTo: () => undefined,
      name: 'Worker1',
      room: {
        name: 'W1N1',
      },
      store: {
        getFreeCapacity: () => 50,
        getUsedCapacity: () => 0,
      },
      transfer: () => 0,
      upgradeController: () => 0,
      withdraw: (target: unknown, resourceType: unknown) => {
        withdrawTargets.push([target, resourceType]);
        return 0;
      },
    };

    vi.stubGlobal('Game', {
      creeps: {
        Worker1: workerCreep,
      },
      cpu: createTestCpu(0.72),
      getObjectById: (objectId: string) =>
        objectId === 'tombstone-1' ? tombstoneTarget : sourceTarget,
      notify: () => undefined,
      rooms: {
        W1N1: {
          controller: undefined,
          find: (findType: number) => {
            if (findType === TEST_FIND_TOMBSTONES) {
              return [tombstoneTarget];
            }

            if (findType === TEST_FIND_SOURCES) {
              return [sourceTarget];
            }

            return [];
          },
          name: 'W1N1',
        },
      },
      spawns: {
        Spawn1: firstSpawn,
      },
      time: 19,
    });
    vi.stubGlobal('ERR_NOT_IN_RANGE', -9);
    vi.stubGlobal('Memory', {});
    vi.stubGlobal('RESOURCE_ENERGY', 'energy');
    vi.stubGlobal('console', {
      log: () => undefined,
    });

    const mainModule = await import('../../src/main');

    mainModule.loop();

    expect(withdrawTargets).toEqual([[tombstoneTarget, 'energy']]);
  });

  it.each([
    {
      findType: TEST_FIND_RUINS,
      targetId: 'ruin-1',
      targetStructureType: undefined,
    },
    {
      findType: TEST_FIND_MY_STRUCTURES,
      targetId: 'storage-1',
      targetStructureType: 'storage',
    },
    {
      findType: TEST_FIND_STRUCTURES,
      targetId: 'container-1',
      targetStructureType: TEST_STRUCTURE_CONTAINER,
    },
  ])('withdraws captured energy from $targetId through the runtime boundary', async (testCase) => {
    const withdrawTargets: unknown[] = [];
    const storedEnergyTarget = {
      id: testCase.targetId,
      pos: {
        roomName: 'W1N1',
      },
      store: {
        getUsedCapacity: () => 50,
      },
      structureType: testCase.targetStructureType,
    };
    const sourceTarget = {
      id: 'source-1',
    };
    const firstSpawn = {
      name: 'Spawn1',
      pos: {
        roomName: 'W1N1',
      },
      spawnCreep: () => 0,
      spawning: {},
      store: {
        getCapacity: () => 300,
        getUsedCapacity: () => 0,
      },
    };
    const workerCreep = {
      harvest: () => 0,
      moveTo: () => undefined,
      name: 'Worker1',
      room: {
        name: 'W1N1',
      },
      store: {
        getFreeCapacity: () => 50,
        getUsedCapacity: () => 0,
      },
      transfer: () => 0,
      upgradeController: () => 0,
      withdraw: (target: unknown, resourceType: unknown) => {
        withdrawTargets.push([target, resourceType]);
        return 0;
      },
    };

    vi.stubGlobal('Game', {
      creeps: {
        Worker1: workerCreep,
      },
      cpu: createTestCpu(0.73),
      getObjectById: (objectId: string) =>
        objectId === testCase.targetId ? storedEnergyTarget : sourceTarget,
      notify: () => undefined,
      rooms: {
        W1N1: {
          controller: undefined,
          find: (findType: number) => {
            if (findType === testCase.findType) {
              return [storedEnergyTarget];
            }

            if (findType === TEST_FIND_SOURCES) {
              return [sourceTarget];
            }

            return [];
          },
          name: 'W1N1',
        },
      },
      spawns: {
        Spawn1: firstSpawn,
      },
      time: 20,
    });
    vi.stubGlobal('ERR_NOT_IN_RANGE', -9);
    vi.stubGlobal('Memory', {});
    vi.stubGlobal('RESOURCE_ENERGY', 'energy');
    vi.stubGlobal('console', {
      log: () => undefined,
    });

    const mainModule = await import('../../src/main');

    mainModule.loop();

    expect(withdrawTargets).toEqual([[storedEnergyTarget, 'energy']]);
  });

  it('moves a worker toward the spawn before controller upgrading', async () => {
    const transferTargets: unknown[] = [];
    const moveTargets: unknown[] = [];
    const firstSpawn = {
      id: 'spawn-1',
      name: 'Spawn1',
      pos: {
        roomName: 'W1N1',
      },
      spawnCreep: () => 0,
      spawning: {},
      structureType: TEST_STRUCTURE_SPAWN,
      store: {
        getCapacity: () => 300,
        getUsedCapacity: () => 250,
      },
    };
    const workerCreep = {
      harvest: () => 0,
      moveTo: (target: unknown) => moveTargets.push(target),
      name: 'Worker1',
      room: {
        name: 'W1N1',
      },
      store: {
        getFreeCapacity: () => 0,
        getUsedCapacity: () => 50,
      },
      transfer: (target: unknown) => {
        transferTargets.push(target);
        return -9;
      },
      upgradeController: () => 0,
    };

    vi.stubGlobal('Game', {
      creeps: {
        Worker1: workerCreep,
      },
      cpu: createTestCpu(0.8),
      getObjectById: (objectId: string) => (objectId === 'spawn-1' ? firstSpawn : null),
      notify: () => undefined,
      rooms: {
        W1N1: {
          controller: {
            id: 'controller-1',
          },
          find: (findType: number) => (findType === TEST_FIND_MY_STRUCTURES ? [firstSpawn] : []),
          name: 'W1N1',
        },
      },
      spawns: {
        Spawn1: firstSpawn,
      },
      time: 9,
    });
    vi.stubGlobal('ERR_NOT_IN_RANGE', -9);
    vi.stubGlobal('Memory', {});
    vi.stubGlobal('RESOURCE_ENERGY', 'energy');
    vi.stubGlobal('console', {
      log: () => undefined,
    });

    const mainModule = await import('../../src/main');

    mainModule.loop();

    expect(transferTargets).toEqual([firstSpawn]);
    expect(moveTargets).toEqual([firstSpawn]);
  });

  it('moves a worker toward the controller when spawn energy is stable', async () => {
    const upgradeTargets: unknown[] = [];
    const moveTargets: unknown[] = [];
    const controllerTarget = {
      id: 'controller-1',
      level: 2,
      my: true,
      pos: {
        x: 20,
        y: 20,
      },
      ticksToDowngrade: 9000,
    };
    const firstSpawn = {
      id: 'spawn-1',
      name: 'Spawn1',
      pos: {
        roomName: 'W1N1',
        x: 10,
        y: 10,
      },
      spawnCreep: () => 0,
      spawning: {},
      structureType: TEST_STRUCTURE_SPAWN,
      store: {
        getCapacity: () => 300,
        getUsedCapacity: () => 300,
      },
    };
    const roomTerrain = {
      get: () => 0,
    };
    const workerCreep = {
      harvest: () => 0,
      moveTo: (target: unknown) => moveTargets.push(target),
      name: 'Worker1',
      room: {
        name: 'W1N1',
      },
      store: {
        getFreeCapacity: () => 0,
        getUsedCapacity: () => 50,
      },
      transfer: () => 0,
      upgradeController: (target: unknown) => {
        upgradeTargets.push(target);
        return -9;
      },
    };

    vi.stubGlobal('Game', {
      creeps: {
        Worker1: workerCreep,
      },
      cpu: createTestCpu(0.9),
      getObjectById: (objectId: string) => (objectId === 'controller-1' ? controllerTarget : null),
      notify: () => undefined,
      rooms: {
        W1N1: {
          controller: controllerTarget,
          createConstructionSite: () => 0,
          find: (findType: number) =>
            findType === TEST_FIND_STRUCTURES || findType === TEST_FIND_MY_STRUCTURES
              ? [firstSpawn]
              : [],
          getTerrain: () => roomTerrain,
          name: 'W1N1',
        },
      },
      spawns: {
        Spawn1: firstSpawn,
      },
      time: 10,
    });
    vi.stubGlobal('ERR_NOT_IN_RANGE', -9);
    vi.stubGlobal('Memory', {});
    vi.stubGlobal('RESOURCE_ENERGY', 'energy');
    vi.stubGlobal('console', {
      log: () => undefined,
    });

    const mainModule = await import('../../src/main');

    mainModule.loop();

    expect(upgradeTargets).toEqual([controllerTarget]);
    expect(moveTargets).toEqual([controllerTarget]);
  });

  it('creates RCL2 extension construction sites through the runtime boundary', async () => {
    const constructionSiteRequests: unknown[] = [];
    const firstSpawn = {
      id: 'spawn-1',
      name: 'Spawn1',
      pos: {
        roomName: 'W1N1',
        x: 10,
        y: 10,
      },
      spawnCreep: () => 0,
      spawning: {},
      structureType: TEST_STRUCTURE_SPAWN,
      store: {
        getCapacity: () => 300,
        getUsedCapacity: () => 300,
      },
    };
    const controllerTarget = {
      id: 'controller-1',
      my: true,
      level: 2,
      pos: {
        x: 20,
        y: 20,
      },
    };
    const roomTerrain = {
      get: () => 0,
    };

    vi.stubGlobal('Game', {
      creeps: {},
      cpu: createTestCpu(0.6),
      getObjectById: () => null,
      notify: () => undefined,
      rooms: {
        W1N1: {
          controller: controllerTarget,
          createConstructionSite: (...request: unknown[]) => constructionSiteRequests.push(request),
          find: (findType: number) => {
            if (findType === TEST_FIND_STRUCTURES || findType === TEST_FIND_MY_STRUCTURES) {
              return [firstSpawn];
            }

            return [];
          },
          getTerrain: () => roomTerrain,
          name: 'W1N1',
        },
      },
      spawns: {
        Spawn1: firstSpawn,
      },
      time: 12,
    });
    vi.stubGlobal('ERR_NOT_IN_RANGE', -9);
    vi.stubGlobal('Memory', {});
    vi.stubGlobal('RESOURCE_ENERGY', 'energy');
    vi.stubGlobal('console', {
      log: () => undefined,
    });

    const mainModule = await import('../../src/main');

    mainModule.loop();

    expect(constructionSiteRequests).toEqual([
      [9, 9, TEST_STRUCTURE_EXTENSION],
      [10, 9, TEST_STRUCTURE_EXTENSION],
      [11, 9, TEST_STRUCTURE_EXTENSION],
      [9, 10, TEST_STRUCTURE_EXTENSION],
      [11, 10, TEST_STRUCTURE_EXTENSION],
    ]);
  });

  it('creates source and controller logistics sites through the runtime boundary once extensions are built', async () => {
    const constructionSiteRequests: unknown[] = [];
    const sourceTarget = {
      id: 'source-1',
      pos: {
        x: 6,
        y: 10,
      },
    };
    const controllerTarget = {
      id: 'controller-1',
      my: true,
      level: 2,
      pos: {
        x: 10,
        y: 14,
      },
    };
    const firstSpawn = {
      id: 'spawn-1',
      name: 'Spawn1',
      pos: {
        roomName: 'W1N1',
        x: 10,
        y: 10,
      },
      spawnCreep: () => 0,
      spawning: {},
      structureType: TEST_STRUCTURE_SPAWN,
      store: {
        getCapacity: () => 300,
        getUsedCapacity: () => 300,
      },
    };
    const extensionStructures = [
      {
        id: 'extension-1',
        pos: {
          roomName: 'W1N1',
          x: 9,
          y: 9,
        },
        structureType: TEST_STRUCTURE_EXTENSION,
        store: {
          getCapacity: () => 50,
          getUsedCapacity: () => 50,
        },
      },
      {
        id: 'extension-2',
        pos: {
          roomName: 'W1N1',
          x: 10,
          y: 9,
        },
        structureType: TEST_STRUCTURE_EXTENSION,
        store: {
          getCapacity: () => 50,
          getUsedCapacity: () => 50,
        },
      },
      {
        id: 'extension-3',
        pos: {
          roomName: 'W1N1',
          x: 11,
          y: 9,
        },
        structureType: TEST_STRUCTURE_EXTENSION,
        store: {
          getCapacity: () => 50,
          getUsedCapacity: () => 50,
        },
      },
      {
        id: 'extension-4',
        pos: {
          roomName: 'W1N1',
          x: 9,
          y: 10,
        },
        structureType: TEST_STRUCTURE_EXTENSION,
        store: {
          getCapacity: () => 50,
          getUsedCapacity: () => 50,
        },
      },
      {
        id: 'extension-5',
        pos: {
          roomName: 'W1N1',
          x: 11,
          y: 10,
        },
        structureType: TEST_STRUCTURE_EXTENSION,
        store: {
          getCapacity: () => 50,
          getUsedCapacity: () => 50,
        },
      },
    ];
    const roomTerrain = {
      get: () => 0,
    };

    vi.stubGlobal('Game', {
      creeps: {},
      cpu: createTestCpu(0.61),
      getObjectById: () => null,
      notify: () => undefined,
      rooms: {
        W1N1: {
          controller: controllerTarget,
          createConstructionSite: (...request: unknown[]) => constructionSiteRequests.push(request),
          find: (findType: number) => {
            if (findType === TEST_FIND_SOURCES) {
              return [sourceTarget];
            }

            if (findType === TEST_FIND_STRUCTURES || findType === TEST_FIND_MY_STRUCTURES) {
              return [firstSpawn, ...extensionStructures];
            }

            return [];
          },
          getTerrain: () => roomTerrain,
          name: 'W1N1',
        },
      },
      spawns: {
        Spawn1: firstSpawn,
      },
      time: 12,
    });
    vi.stubGlobal('ERR_NOT_IN_RANGE', -9);
    vi.stubGlobal('Memory', {});
    vi.stubGlobal('RESOURCE_ENERGY', 'energy');
    vi.stubGlobal('console', {
      log: () => undefined,
    });

    const mainModule = await import('../../src/main');

    mainModule.loop();

    expect(constructionSiteRequests).toEqual([
      [7, 10, TEST_STRUCTURE_CONTAINER],
      [10, 13, TEST_STRUCTURE_CONTAINER],
      [8, 10, TEST_STRUCTURE_ROAD],
      [9, 11, TEST_STRUCTURE_ROAD],
    ]);
  });

  it('creates the first RCL3 tower construction site through the runtime boundary', async () => {
    const constructionSiteRequests: unknown[] = [];
    const controllerTarget = {
      id: 'controller-1',
      level: 3,
      my: true,
      pos: {
        x: 10,
        y: 14,
      },
    };
    const firstSpawn = {
      id: 'spawn-1',
      name: 'Spawn1',
      pos: {
        roomName: 'W1N1',
        x: 10,
        y: 10,
      },
      spawnCreep: () => 0,
      spawning: {},
      structureType: TEST_STRUCTURE_SPAWN,
      store: {
        getCapacity: () => 300,
        getUsedCapacity: () => 300,
      },
    };
    const extensionStructures = [
      {
        id: 'extension-1',
        pos: {
          roomName: 'W1N1',
          x: 9,
          y: 9,
        },
        structureType: TEST_STRUCTURE_EXTENSION,
        store: {
          getCapacity: () => 50,
          getUsedCapacity: () => 50,
        },
      },
      {
        id: 'extension-2',
        pos: {
          roomName: 'W1N1',
          x: 10,
          y: 9,
        },
        structureType: TEST_STRUCTURE_EXTENSION,
        store: {
          getCapacity: () => 50,
          getUsedCapacity: () => 50,
        },
      },
      {
        id: 'extension-3',
        pos: {
          roomName: 'W1N1',
          x: 11,
          y: 9,
        },
        structureType: TEST_STRUCTURE_EXTENSION,
        store: {
          getCapacity: () => 50,
          getUsedCapacity: () => 50,
        },
      },
      {
        id: 'extension-4',
        pos: {
          roomName: 'W1N1',
          x: 9,
          y: 10,
        },
        structureType: TEST_STRUCTURE_EXTENSION,
        store: {
          getCapacity: () => 50,
          getUsedCapacity: () => 50,
        },
      },
      {
        id: 'extension-5',
        pos: {
          roomName: 'W1N1',
          x: 11,
          y: 10,
        },
        structureType: TEST_STRUCTURE_EXTENSION,
        store: {
          getCapacity: () => 50,
          getUsedCapacity: () => 50,
        },
      },
      {
        id: 'extension-6',
        pos: {
          roomName: 'W1N1',
          x: 9,
          y: 11,
        },
        structureType: TEST_STRUCTURE_EXTENSION,
        store: {
          getCapacity: () => 50,
          getUsedCapacity: () => 50,
        },
      },
      {
        id: 'extension-7',
        pos: {
          roomName: 'W1N1',
          x: 10,
          y: 11,
        },
        structureType: TEST_STRUCTURE_EXTENSION,
        store: {
          getCapacity: () => 50,
          getUsedCapacity: () => 50,
        },
      },
      {
        id: 'extension-8',
        pos: {
          roomName: 'W1N1',
          x: 11,
          y: 11,
        },
        structureType: TEST_STRUCTURE_EXTENSION,
        store: {
          getCapacity: () => 50,
          getUsedCapacity: () => 50,
        },
      },
      {
        id: 'extension-9',
        pos: {
          roomName: 'W1N1',
          x: 8,
          y: 8,
        },
        structureType: TEST_STRUCTURE_EXTENSION,
        store: {
          getCapacity: () => 50,
          getUsedCapacity: () => 50,
        },
      },
      {
        id: 'extension-10',
        pos: {
          roomName: 'W1N1',
          x: 9,
          y: 8,
        },
        structureType: TEST_STRUCTURE_EXTENSION,
        store: {
          getCapacity: () => 50,
          getUsedCapacity: () => 50,
        },
      },
    ];
    const roomTerrain = {
      get: () => 0,
    };

    vi.stubGlobal('Game', {
      creeps: {},
      cpu: createTestCpu(0.62),
      getObjectById: () => null,
      notify: () => undefined,
      rooms: {
        W1N1: {
          controller: controllerTarget,
          createConstructionSite: (...request: unknown[]) => constructionSiteRequests.push(request),
          find: (findType: number) => {
            if (findType === TEST_FIND_STRUCTURES || findType === TEST_FIND_MY_STRUCTURES) {
              return [firstSpawn, ...extensionStructures];
            }

            return [];
          },
          getTerrain: () => roomTerrain,
          name: 'W1N1',
        },
      },
      spawns: {
        Spawn1: firstSpawn,
      },
      time: 14,
    });
    vi.stubGlobal('ERR_NOT_IN_RANGE', -9);
    vi.stubGlobal('Memory', {});
    vi.stubGlobal('RESOURCE_ENERGY', 'energy');
    vi.stubGlobal('console', {
      log: () => undefined,
    });

    const mainModule = await import('../../src/main');

    mainModule.loop();

    expect(constructionSiteRequests).toEqual([[10, 12, TEST_STRUCTURE_TOWER]]);
  });

  it('refills an extension through the runtime boundary', async () => {
    const transferTargets: unknown[] = [];
    const extensionTarget = {
      id: 'extension-1',
      pos: {
        roomName: 'W1N1',
      },
      structureType: TEST_STRUCTURE_EXTENSION,
      store: {
        getCapacity: () => 50,
        getUsedCapacity: () => 0,
      },
    };
    const firstSpawn = {
      id: 'spawn-1',
      name: 'Spawn1',
      pos: {
        roomName: 'W1N1',
      },
      spawnCreep: () => 0,
      spawning: {},
      structureType: TEST_STRUCTURE_SPAWN,
      store: {
        getCapacity: () => 300,
        getUsedCapacity: () => 300,
      },
    };
    const workerCreep = {
      build: () => 0,
      harvest: () => 0,
      moveTo: () => undefined,
      name: 'Worker1',
      room: {
        name: 'W1N1',
      },
      store: {
        getFreeCapacity: () => 0,
        getUsedCapacity: () => 50,
      },
      transfer: (target: unknown) => {
        transferTargets.push(target);
        return 0;
      },
      upgradeController: () => 0,
    };

    vi.stubGlobal('Game', {
      creeps: {
        Worker1: workerCreep,
      },
      cpu: createTestCpu(0.65),
      getObjectById: (objectId: string) => (objectId === 'extension-1' ? extensionTarget : null),
      notify: () => undefined,
      rooms: {
        W1N1: {
          controller: undefined,
          find: (findType: number) =>
            findType === TEST_FIND_MY_STRUCTURES ? [firstSpawn, extensionTarget] : [],
          name: 'W1N1',
        },
      },
      spawns: {
        Spawn1: firstSpawn,
      },
      time: 13,
    });
    vi.stubGlobal('ERR_NOT_IN_RANGE', -9);
    vi.stubGlobal('Memory', {});
    vi.stubGlobal('RESOURCE_ENERGY', 'energy');
    vi.stubGlobal('console', {
      log: () => undefined,
    });

    const mainModule = await import('../../src/main');

    mainModule.loop();

    expect(transferTargets).toEqual([extensionTarget]);
  });

  it('keeps a partial-energy working creep building through the runtime boundary', async () => {
    const buildTargets: unknown[] = [];
    const constructionSiteTarget = {
      id: 'site-1',
      pos: {
        roomName: 'W1N1',
      },
      structureType: TEST_STRUCTURE_EXTENSION,
    };
    const controllerTarget = {
      id: 'controller-1',
      level: 2,
      my: true,
      pos: {
        x: 20,
        y: 20,
      },
      ticksToDowngrade: 9000,
    };
    const firstSpawn = {
      id: 'spawn-1',
      name: 'Spawn1',
      pos: {
        roomName: 'W1N1',
      },
      spawnCreep: () => 0,
      spawning: {},
      structureType: TEST_STRUCTURE_SPAWN,
      store: {
        getCapacity: () => 300,
        getUsedCapacity: () => 300,
      },
    };
    const roomTerrain = {
      get: () => 0,
    };
    const workerCreep = {
      build: (target: unknown) => {
        buildTargets.push(target);
        return 0;
      },
      harvest: () => 0,
      moveTo: () => undefined,
      memory: {
        working: true,
      },
      name: 'Worker1',
      room: {
        name: 'W1N1',
      },
      store: {
        getFreeCapacity: () => 5,
        getUsedCapacity: () => 45,
      },
      transfer: () => 0,
      upgradeController: () => 0,
    };
    const idleWorkerCreep = {
      build: () => 0,
      harvest: () => 0,
      moveTo: () => undefined,
      room: {
        name: 'W1N1',
      },
      store: {
        getFreeCapacity: () => 50,
        getUsedCapacity: () => 0,
      },
      transfer: () => 0,
      upgradeController: () => 0,
    };

    vi.stubGlobal('Game', {
      creeps: {
        Worker1: workerCreep,
        Worker2: {
          ...idleWorkerCreep,
          name: 'Worker2',
        },
        Worker3: {
          ...idleWorkerCreep,
          name: 'Worker3',
        },
      },
      cpu: createTestCpu(0.66),
      getObjectById: (objectId: string) => (objectId === 'site-1' ? constructionSiteTarget : null),
      notify: () => undefined,
      rooms: {
        W1N1: {
          controller: controllerTarget,
          find: (findType: number) => {
            if (findType === TEST_FIND_STRUCTURES || findType === TEST_FIND_MY_STRUCTURES) {
              return [firstSpawn];
            }

            if (
              findType === TEST_FIND_CONSTRUCTION_SITES ||
              findType === TEST_FIND_MY_CONSTRUCTION_SITES
            ) {
              return [constructionSiteTarget];
            }

            return [];
          },
          getTerrain: () => roomTerrain,
          name: 'W1N1',
        },
      },
      spawns: {
        Spawn1: firstSpawn,
      },
      time: 14,
    });
    vi.stubGlobal('ERR_NOT_IN_RANGE', -9);
    vi.stubGlobal('Memory', {});
    vi.stubGlobal('RESOURCE_ENERGY', 'energy');
    vi.stubGlobal('console', {
      log: () => undefined,
    });

    const mainModule = await import('../../src/main');

    mainModule.loop();

    expect(buildTargets).toEqual([constructionSiteTarget]);
    expect(workerCreep.memory).toEqual({
      working: true,
    });
  });

  it('captures structure hits and repairs a critical road through the runtime boundary', async () => {
    const repairTargets: unknown[] = [];
    const moveTargets: unknown[] = [];
    const controllerTarget = {
      id: 'controller-1',
      level: 2,
      my: true,
      pos: {
        x: 20,
        y: 20,
      },
      ticksToDowngrade: 9000,
    };
    const roadTarget = {
      hits: 499,
      hitsMax: 5000,
      id: 'road-1',
      pos: {
        roomName: 'W1N1',
        x: 11,
        y: 10,
      },
      structureType: TEST_STRUCTURE_ROAD,
    };
    const firstSpawn = {
      hits: 5000,
      hitsMax: 5000,
      id: 'spawn-1',
      name: 'Spawn1',
      pos: {
        roomName: 'W1N1',
        x: 10,
        y: 10,
      },
      spawnCreep: () => 0,
      spawning: {},
      structureType: TEST_STRUCTURE_SPAWN,
      store: {
        getCapacity: () => 300,
        getUsedCapacity: () => 300,
      },
    };
    const roomTerrain = {
      get: () => 0,
    };
    const workerCreep = {
      build: () => 0,
      harvest: () => 0,
      moveTo: (target: unknown) => moveTargets.push(target),
      name: 'Worker1',
      repair: (target: unknown) => {
        repairTargets.push(target);
        return -9;
      },
      room: {
        name: 'W1N1',
      },
      store: {
        getFreeCapacity: () => 0,
        getUsedCapacity: () => 50,
      },
      transfer: () => 0,
      upgradeController: () => 0,
    };

    vi.stubGlobal('Game', {
      creeps: {
        Worker1: workerCreep,
      },
      cpu: createTestCpu(0.62),
      getObjectById: (objectId: string) => {
        if (objectId === 'road-1') {
          return roadTarget;
        }

        if (objectId === 'controller-1') {
          return controllerTarget;
        }

        return null;
      },
      notify: () => undefined,
      rooms: {
        W1N1: {
          controller: controllerTarget,
          createConstructionSite: () => 0,
          find: (findType: number) => {
            if (findType === TEST_FIND_STRUCTURES) {
              return [firstSpawn, roadTarget];
            }

            if (findType === TEST_FIND_MY_STRUCTURES) {
              return [firstSpawn];
            }

            return [];
          },
          getTerrain: () => roomTerrain,
          name: 'W1N1',
        },
      },
      spawns: {
        Spawn1: firstSpawn,
      },
      time: 21,
    });
    vi.stubGlobal('ERR_NOT_IN_RANGE', -9);
    vi.stubGlobal('Memory', {});
    vi.stubGlobal('RESOURCE_ENERGY', 'energy');
    vi.stubGlobal('console', {
      log: () => undefined,
    });

    const mainModule = await import('../../src/main');

    mainModule.loop();

    expect(repairTargets).toEqual([roadTarget]);
    expect(moveTargets).toEqual([roadTarget]);
  });

  it('does not capture walls or ramparts as P2 repair targets', async () => {
    const repairTargets: unknown[] = [];
    const upgradeTargets: unknown[] = [];
    const controllerTarget = {
      id: 'controller-1',
      level: 2,
      my: true,
      pos: {
        x: 20,
        y: 20,
      },
      ticksToDowngrade: 9000,
    };
    const wallTarget = {
      hits: 1,
      hitsMax: 300000000,
      id: 'wall-1',
      pos: {
        roomName: 'W1N1',
        x: 11,
        y: 10,
      },
      structureType: TEST_STRUCTURE_WALL,
    };
    const rampartTarget = {
      hits: 1,
      hitsMax: 300000000,
      id: 'rampart-1',
      pos: {
        roomName: 'W1N1',
        x: 12,
        y: 10,
      },
      structureType: TEST_STRUCTURE_RAMPART,
    };
    const firstSpawn = {
      hits: 5000,
      hitsMax: 5000,
      id: 'spawn-1',
      name: 'Spawn1',
      pos: {
        roomName: 'W1N1',
        x: 10,
        y: 10,
      },
      spawnCreep: () => 0,
      spawning: {},
      structureType: TEST_STRUCTURE_SPAWN,
      store: {
        getCapacity: () => 300,
        getUsedCapacity: () => 300,
      },
    };
    const roomTerrain = {
      get: () => 0,
    };
    const workerCreep = {
      build: () => 0,
      harvest: () => 0,
      moveTo: () => undefined,
      name: 'Worker1',
      repair: (target: unknown) => {
        repairTargets.push(target);
        return 0;
      },
      room: {
        name: 'W1N1',
      },
      store: {
        getFreeCapacity: () => 0,
        getUsedCapacity: () => 50,
      },
      transfer: () => 0,
      upgradeController: (target: unknown) => {
        upgradeTargets.push(target);
        return 0;
      },
    };

    vi.stubGlobal('Game', {
      creeps: {
        Worker1: workerCreep,
      },
      cpu: createTestCpu(0.62),
      getObjectById: (objectId: string) => (objectId === 'controller-1' ? controllerTarget : null),
      notify: () => undefined,
      rooms: {
        W1N1: {
          controller: controllerTarget,
          createConstructionSite: () => 0,
          find: (findType: number) => {
            if (findType === TEST_FIND_STRUCTURES) {
              return [firstSpawn, wallTarget, rampartTarget];
            }

            if (findType === TEST_FIND_MY_STRUCTURES) {
              return [firstSpawn];
            }

            return [];
          },
          getTerrain: () => roomTerrain,
          name: 'W1N1',
        },
      },
      spawns: {
        Spawn1: firstSpawn,
      },
      time: 22,
    });
    vi.stubGlobal('ERR_NOT_IN_RANGE', -9);
    vi.stubGlobal('Memory', {});
    vi.stubGlobal('RESOURCE_ENERGY', 'energy');
    vi.stubGlobal('console', {
      log: () => undefined,
    });

    const mainModule = await import('../../src/main');

    mainModule.loop();

    expect(repairTargets).toEqual([]);
    expect(upgradeTargets).toEqual([controllerTarget]);
  });

  it('defers construction through the runtime boundary until the worker population is stable', async () => {
    const buildTargets: unknown[] = [];
    const upgradeTargets: unknown[] = [];
    const constructionSiteTarget = {
      id: 'site-1',
      pos: {
        roomName: 'W1N1',
        x: 9,
        y: 9,
      },
      progress: 0,
      progressTotal: 3000,
      structureType: TEST_STRUCTURE_EXTENSION,
    };
    const controllerTarget = {
      id: 'controller-1',
      level: 2,
      my: true,
      pos: {
        x: 20,
        y: 20,
      },
      ticksToDowngrade: 9000,
    };
    const firstSpawn = {
      id: 'spawn-1',
      name: 'Spawn1',
      pos: {
        roomName: 'W1N1',
        x: 10,
        y: 10,
      },
      spawnCreep: () => 0,
      spawning: {},
      structureType: TEST_STRUCTURE_SPAWN,
      store: {
        getCapacity: () => 300,
        getUsedCapacity: () => 300,
      },
    };
    const roomTerrain = {
      get: () => 0,
    };
    const workerCreep = {
      build: (target: unknown) => {
        buildTargets.push(target);
        return 0;
      },
      harvest: () => 0,
      moveTo: () => undefined,
      name: 'Worker1',
      room: {
        name: 'W1N1',
      },
      store: {
        getFreeCapacity: () => 0,
        getUsedCapacity: () => 50,
      },
      transfer: () => 0,
      upgradeController: (target: unknown) => {
        upgradeTargets.push(target);
        return 0;
      },
    };

    vi.stubGlobal('Game', {
      creeps: {
        Worker1: workerCreep,
      },
      cpu: createTestCpu(0.64),
      getObjectById: (objectId: string) => {
        if (objectId === 'controller-1') {
          return controllerTarget;
        }

        if (objectId === 'site-1') {
          return constructionSiteTarget;
        }

        return null;
      },
      notify: () => undefined,
      rooms: {
        W1N1: {
          controller: controllerTarget,
          createConstructionSite: () => 0,
          find: (findType: number) => {
            if (findType === TEST_FIND_STRUCTURES || findType === TEST_FIND_MY_STRUCTURES) {
              return [firstSpawn];
            }

            if (
              findType === TEST_FIND_CONSTRUCTION_SITES ||
              findType === TEST_FIND_MY_CONSTRUCTION_SITES
            ) {
              return [constructionSiteTarget];
            }

            return [];
          },
          getTerrain: () => roomTerrain,
          name: 'W1N1',
        },
      },
      spawns: {
        Spawn1: firstSpawn,
      },
      time: 17,
    });
    vi.stubGlobal('ERR_NOT_IN_RANGE', -9);
    vi.stubGlobal('Memory', {});
    vi.stubGlobal('RESOURCE_ENERGY', 'energy');
    vi.stubGlobal('console', {
      log: () => undefined,
    });

    const mainModule = await import('../../src/main');

    mainModule.loop();

    expect(upgradeTargets).toEqual([controllerTarget]);
    expect(buildTargets).toEqual([]);
  });

  it('captures the controller downgrade timer and upgrades before building when warning', async () => {
    const buildTargets: unknown[] = [];
    const constructionSiteRequests: unknown[] = [];
    const upgradeTargets: unknown[] = [];
    const constructionSiteTarget = {
      id: 'site-1',
      pos: {
        roomName: 'W1N1',
        x: 9,
        y: 9,
      },
      structureType: TEST_STRUCTURE_EXTENSION,
    };
    const controllerTarget = {
      id: 'controller-1',
      level: 2,
      my: true,
      pos: {
        x: 20,
        y: 20,
      },
      ticksToDowngrade: 7999,
    };
    const firstSpawn = {
      id: 'spawn-1',
      name: 'Spawn1',
      pos: {
        roomName: 'W1N1',
        x: 10,
        y: 10,
      },
      spawnCreep: () => 0,
      spawning: {},
      structureType: TEST_STRUCTURE_SPAWN,
      store: {
        getCapacity: () => 300,
        getUsedCapacity: () => 300,
      },
    };
    const roomTerrain = {
      get: () => 0,
    };
    const workerCreep = {
      build: (target: unknown) => {
        buildTargets.push(target);
        return 0;
      },
      harvest: () => 0,
      moveTo: () => undefined,
      name: 'Worker1',
      room: {
        name: 'W1N1',
      },
      store: {
        getFreeCapacity: () => 0,
        getUsedCapacity: () => 50,
      },
      transfer: () => 0,
      upgradeController: (target: unknown) => {
        upgradeTargets.push(target);
        return 0;
      },
    };

    vi.stubGlobal('Game', {
      creeps: {
        Worker1: workerCreep,
      },
      cpu: createTestCpu(0.67),
      getObjectById: (objectId: string) => {
        if (objectId === 'controller-1') {
          return controllerTarget;
        }

        if (objectId === 'site-1') {
          return constructionSiteTarget;
        }

        return null;
      },
      notify: () => undefined,
      rooms: {
        W1N1: {
          controller: controllerTarget,
          createConstructionSite: (...request: unknown[]) => constructionSiteRequests.push(request),
          find: (findType: number) => {
            if (findType === TEST_FIND_STRUCTURES || findType === TEST_FIND_MY_STRUCTURES) {
              return [firstSpawn];
            }

            if (
              findType === TEST_FIND_CONSTRUCTION_SITES ||
              findType === TEST_FIND_MY_CONSTRUCTION_SITES
            ) {
              return [constructionSiteTarget];
            }

            return [];
          },
          getTerrain: () => roomTerrain,
          name: 'W1N1',
        },
      },
      spawns: {
        Spawn1: firstSpawn,
      },
      time: 15,
    });
    vi.stubGlobal('ERR_NOT_IN_RANGE', -9);
    vi.stubGlobal('Memory', {});
    vi.stubGlobal('RESOURCE_ENERGY', 'energy');
    vi.stubGlobal('console', {
      log: () => undefined,
    });

    const mainModule = await import('../../src/main');

    mainModule.loop();

    expect(upgradeTargets).toEqual([controllerTarget]);
    expect(buildTargets).toEqual([]);
  });

  it('captures a hostile core threat and activates safe mode through the runtime boundary', async () => {
    const safeModeRequests: string[] = [];
    const controllerTarget = {
      activateSafeMode: () => {
        safeModeRequests.push('controller-1');
        return 0;
      },
      id: 'controller-1',
      level: 2,
      my: true,
      pos: {
        roomName: 'W1N1',
        x: 20,
        y: 20,
      },
      safeModeAvailable: 1,
      ticksToDowngrade: 9000,
    };
    const spawnStructure = {
      hits: 5000,
      hitsMax: 5000,
      id: 'spawn-1',
      pos: {
        roomName: 'W1N1',
        x: 10,
        y: 10,
      },
      structureType: TEST_STRUCTURE_SPAWN,
      store: {
        getCapacity: () => 300,
        getUsedCapacity: () => 300,
      },
    };
    const hostileCreep = {
      body: [
        {
          hits: 100,
          type: TEST_ATTACK,
        },
      ],
      hits: 100,
      id: 'hostile-1',
      owner: {
        username: 'Invader',
      },
      pos: {
        roomName: 'W1N1',
        x: 12,
        y: 10,
      },
    };

    vi.stubGlobal('Game', {
      creeps: {},
      cpu: createTestCpu(0.63),
      getObjectById: (objectId: string) => (objectId === 'controller-1' ? controllerTarget : null),
      notify: () => undefined,
      rooms: {
        W1N1: {
          controller: controllerTarget,
          find: (findType: number) => {
            if (findType === TEST_FIND_HOSTILE_CREEPS) {
              return [hostileCreep];
            }

            if (findType === TEST_FIND_MY_STRUCTURES || findType === TEST_FIND_STRUCTURES) {
              return [spawnStructure];
            }

            return [];
          },
          name: 'W1N1',
        },
      },
      spawns: {},
      time: 23,
    });
    vi.stubGlobal('ERR_NOT_IN_RANGE', -9);
    vi.stubGlobal('Memory', {});
    vi.stubGlobal('RESOURCE_ENERGY', 'energy');
    vi.stubGlobal('console', {
      log: () => undefined,
    });

    const mainModule = await import('../../src/main');

    mainModule.loop();

    expect(safeModeRequests).toEqual(['controller-1']);
  });

  it('keeps construction running when a harmless hostile scout is near core structures', async () => {
    const buildTargets: unknown[] = [];
    const safeModeRequests: string[] = [];
    const constructionSiteTarget = {
      id: 'site-1',
      pos: {
        roomName: 'W1N1',
        x: 9,
        y: 9,
      },
      progress: 0,
      progressTotal: 3000,
      structureType: TEST_STRUCTURE_EXTENSION,
    };
    const controllerTarget = {
      activateSafeMode: () => {
        safeModeRequests.push('controller-1');
        return 0;
      },
      id: 'controller-1',
      level: 2,
      my: true,
      pos: {
        roomName: 'W1N1',
        x: 20,
        y: 20,
      },
      safeModeAvailable: 1,
      ticksToDowngrade: 9000,
    };
    const spawnStructure = {
      hits: 5000,
      hitsMax: 5000,
      id: 'spawn-1',
      name: 'Spawn1',
      pos: {
        roomName: 'W1N1',
        x: 10,
        y: 10,
      },
      spawnCreep: () => 0,
      spawning: {},
      structureType: TEST_STRUCTURE_SPAWN,
      store: {
        getCapacity: () => 300,
        getUsedCapacity: () => 300,
      },
    };
    const hostileScout = {
      body: [
        {
          hits: 100,
          type: TEST_MOVE,
        },
      ],
      hits: 100,
      id: 'hostile-scout',
      owner: {
        username: 'Scout',
      },
      pos: {
        roomName: 'W1N1',
        x: 12,
        y: 10,
      },
    };
    const workerCreep = {
      build: (target: unknown) => {
        buildTargets.push(target);
        return 0;
      },
      harvest: () => 0,
      moveTo: () => undefined,
      name: 'Worker1',
      room: {
        name: 'W1N1',
      },
      store: {
        getFreeCapacity: () => 0,
        getUsedCapacity: () => 50,
      },
      transfer: () => 0,
      upgradeController: () => 0,
    };
    const emptyWorkerCreep = {
      build: () => 0,
      harvest: () => 0,
      moveTo: () => undefined,
      room: {
        name: 'W1N1',
      },
      store: {
        getFreeCapacity: () => 50,
        getUsedCapacity: () => 0,
      },
      transfer: () => 0,
      upgradeController: () => 0,
    };

    vi.stubGlobal('Game', {
      creeps: {
        Worker1: workerCreep,
        Worker2: {
          ...emptyWorkerCreep,
          name: 'Worker2',
        },
        Worker3: {
          ...emptyWorkerCreep,
          name: 'Worker3',
        },
      },
      cpu: createTestCpu(0.63),
      getObjectById: (objectId: string) => {
        if (objectId === 'controller-1') {
          return controllerTarget;
        }

        if (objectId === 'site-1') {
          return constructionSiteTarget;
        }

        return null;
      },
      notify: () => undefined,
      rooms: {
        W1N1: {
          controller: controllerTarget,
          createConstructionSite: () => 0,
          find: (findType: number) => {
            if (findType === TEST_FIND_HOSTILE_CREEPS) {
              return [hostileScout];
            }

            if (findType === TEST_FIND_MY_STRUCTURES || findType === TEST_FIND_STRUCTURES) {
              return [spawnStructure];
            }

            if (
              findType === TEST_FIND_CONSTRUCTION_SITES ||
              findType === TEST_FIND_MY_CONSTRUCTION_SITES
            ) {
              return [constructionSiteTarget];
            }

            return [];
          },
          getTerrain: () => ({
            get: () => 0,
          }),
          name: 'W1N1',
        },
      },
      spawns: {
        Spawn1: spawnStructure,
      },
      time: 24,
    });
    vi.stubGlobal('ERR_NOT_IN_RANGE', -9);
    vi.stubGlobal('Memory', {});
    vi.stubGlobal('RESOURCE_ENERGY', 'energy');
    vi.stubGlobal('console', {
      log: () => undefined,
    });

    const mainModule = await import('../../src/main');

    mainModule.loop();

    expect(safeModeRequests).toEqual([]);
    expect(buildTargets).toEqual([constructionSiteTarget]);
  });

  it('pauses construction work without activating safe mode when a dangerous hostile is away from core structures', async () => {
    const buildTargets: unknown[] = [];
    const upgradeTargets: unknown[] = [];
    const safeModeRequests: string[] = [];
    const constructionSiteTarget = {
      id: 'site-1',
      pos: {
        roomName: 'W1N1',
        x: 9,
        y: 9,
      },
      progress: 0,
      progressTotal: 3000,
      structureType: TEST_STRUCTURE_EXTENSION,
    };
    const controllerTarget = {
      activateSafeMode: () => {
        safeModeRequests.push('controller-1');
        return 0;
      },
      id: 'controller-1',
      level: 2,
      my: true,
      pos: {
        roomName: 'W1N1',
        x: 20,
        y: 20,
      },
      safeModeAvailable: 1,
      ticksToDowngrade: 9000,
    };
    const spawnStructure = {
      hits: 5000,
      hitsMax: 5000,
      id: 'spawn-1',
      name: 'Spawn1',
      pos: {
        roomName: 'W1N1',
        x: 10,
        y: 10,
      },
      spawnCreep: () => 0,
      spawning: {},
      structureType: TEST_STRUCTURE_SPAWN,
      store: {
        getCapacity: () => 300,
        getUsedCapacity: () => 300,
      },
    };
    const hostileCreep = {
      body: [
        {
          hits: 100,
          type: TEST_ATTACK,
        },
      ],
      hits: 100,
      id: 'hostile-1',
      owner: {
        username: 'Invader',
      },
      pos: {
        roomName: 'W1N1',
        x: 30,
        y: 30,
      },
    };
    const workerCreep = {
      build: (target: unknown) => {
        buildTargets.push(target);
        return 0;
      },
      harvest: () => 0,
      moveTo: () => undefined,
      name: 'Worker1',
      room: {
        name: 'W1N1',
      },
      store: {
        getFreeCapacity: () => 0,
        getUsedCapacity: () => 50,
      },
      transfer: () => 0,
      upgradeController: (target: unknown) => {
        upgradeTargets.push(target);
        return 0;
      },
    };
    const emptyWorkerCreep = {
      build: () => 0,
      harvest: () => 0,
      moveTo: () => undefined,
      room: {
        name: 'W1N1',
      },
      store: {
        getFreeCapacity: () => 50,
        getUsedCapacity: () => 0,
      },
      transfer: () => 0,
      upgradeController: () => 0,
    };

    vi.stubGlobal('Game', {
      creeps: {
        Worker1: workerCreep,
        Worker2: {
          ...emptyWorkerCreep,
          name: 'Worker2',
        },
        Worker3: {
          ...emptyWorkerCreep,
          name: 'Worker3',
        },
      },
      cpu: createTestCpu(0.63),
      getObjectById: (objectId: string) => {
        if (objectId === 'controller-1') {
          return controllerTarget;
        }

        if (objectId === 'site-1') {
          return constructionSiteTarget;
        }

        return null;
      },
      notify: () => undefined,
      rooms: {
        W1N1: {
          controller: controllerTarget,
          createConstructionSite: () => 0,
          find: (findType: number) => {
            if (findType === TEST_FIND_HOSTILE_CREEPS) {
              return [hostileCreep];
            }

            if (findType === TEST_FIND_MY_STRUCTURES || findType === TEST_FIND_STRUCTURES) {
              return [spawnStructure];
            }

            if (
              findType === TEST_FIND_CONSTRUCTION_SITES ||
              findType === TEST_FIND_MY_CONSTRUCTION_SITES
            ) {
              return [constructionSiteTarget];
            }

            return [];
          },
          getTerrain: () => ({
            get: () => 0,
          }),
          name: 'W1N1',
        },
      },
      spawns: {
        Spawn1: spawnStructure,
      },
      time: 24,
    });
    vi.stubGlobal('ERR_NOT_IN_RANGE', -9);
    vi.stubGlobal('Memory', {});
    vi.stubGlobal('RESOURCE_ENERGY', 'energy');
    vi.stubGlobal('console', {
      log: () => undefined,
    });

    const mainModule = await import('../../src/main');

    mainModule.loop();

    expect(safeModeRequests).toEqual([]);
    expect(buildTargets).toEqual([]);
    expect(upgradeTargets).toEqual([controllerTarget]);
  });

  it('reports a non-critical construction action failure and continues the tick', async () => {
    const consoleLines: string[] = [];
    const constructionAttempts: unknown[] = [];
    const notifyRequests: unknown[] = [];
    const spawnRequests: unknown[] = [];
    const controllerTarget = {
      id: 'controller-1',
      level: 2,
      my: true,
      pos: {
        roomName: 'W1N1',
        x: 20,
        y: 20,
      },
      ticksToDowngrade: 9000,
    };
    const firstSpawn = {
      hits: 5000,
      hitsMax: 5000,
      id: 'spawn-1',
      name: 'Spawn1',
      pos: {
        roomName: 'W1N1',
        x: 10,
        y: 10,
      },
      spawnCreep: (...spawnArguments: unknown[]) => spawnRequests.push(spawnArguments),
      spawning: null,
      structureType: TEST_STRUCTURE_SPAWN,
      store: {
        getCapacity: () => 300,
        getUsedCapacity: () => 300,
      },
    };

    vi.stubGlobal('Game', {
      creeps: {},
      cpu: createTestCpu(0.88),
      getObjectById: () => null,
      notify: (...notifyArguments: unknown[]) => notifyRequests.push(notifyArguments),
      rooms: {
        W1N1: {
          controller: controllerTarget,
          createConstructionSite: (...request: unknown[]) => {
            constructionAttempts.push(request);
            throw new Error('construction failed');
          },
          find: (findType: number) => {
            if (findType === TEST_FIND_STRUCTURES || findType === TEST_FIND_MY_STRUCTURES) {
              return [firstSpawn];
            }

            return [];
          },
          getTerrain: () => ({
            get: () => 0,
          }),
          name: 'W1N1',
        },
      },
      spawns: {
        Spawn1: firstSpawn,
      },
      time: 25,
    });
    vi.stubGlobal('ERR_NOT_IN_RANGE', -9);
    vi.stubGlobal('Memory', {});
    vi.stubGlobal('RESOURCE_ENERGY', 'energy');
    vi.stubGlobal('console', {
      log: (message: string) => consoleLines.push(message),
    });

    const mainModule = await import('../../src/main');

    mainModule.loop();

    expect(constructionAttempts).not.toEqual([]);
    expect(spawnRequests).toEqual([
      [['work', 'carry', 'carry', 'move', 'move'], 'Spawn1-worker-25'],
    ]);
    expect(findConsoleOpsEvent(consoleLines, 'runtime_action_failure')).toMatchObject({
      kind: 'runtime_action_failure',
      metrics: {
        criticality: 'non-critical',
        error: 'construction failed',
        operation: 'construction',
      },
      severity: 'actionable',
    });
    expect(findNotifyOpsEvent(notifyRequests, 'runtime_action_failure')).toBeUndefined();
    expect(findConsoleOpsEvent(consoleLines, 'runtime_heartbeat')).toMatchObject({
      kind: 'runtime_heartbeat',
      metrics: {
        bucket: 5000,
        cpu: 0.88,
      },
      tick: 25,
    });
  });

  it('reports a critical spawn action failure before surfacing the error', async () => {
    const notifyRequests: unknown[] = [];
    const firstSpawn = {
      name: 'Spawn1',
      pos: {
        roomName: 'W1N1',
      },
      spawnCreep: () => {
        throw new Error('spawn failed');
      },
      spawning: null,
      store: {
        getCapacity: () => 300,
        getUsedCapacity: () => 300,
      },
    };

    vi.stubGlobal('Game', {
      creeps: {},
      cpu: createTestCpu(0.89),
      getObjectById: () => null,
      notify: (...notifyArguments: unknown[]) => notifyRequests.push(notifyArguments),
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
      time: 26,
    });
    vi.stubGlobal('ERR_NOT_IN_RANGE', -9);
    vi.stubGlobal('Memory', {});
    vi.stubGlobal('RESOURCE_ENERGY', 'energy');
    vi.stubGlobal('console', {
      log: () => undefined,
    });

    const mainModule = await import('../../src/main');

    expect(() => mainModule.loop()).toThrow('spawn failed');
    expect(findNotifyOpsEvent(notifyRequests, 'runtime_action_failure')).toMatchObject({
      kind: 'runtime_action_failure',
      metrics: {
        criticality: 'critical',
        error: 'spawn failed',
        operation: 'spawn',
      },
      severity: 'critical',
    });
  });
});
