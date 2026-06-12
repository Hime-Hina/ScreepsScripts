import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const TEST_FIND_CONSTRUCTION_SITES = 107;
const TEST_FIND_DROPPED_RESOURCES = 106;
const TEST_FIND_MY_CONSTRUCTION_SITES = 108;
const TEST_FIND_MY_STRUCTURES = 109;
const TEST_FIND_MINERALS = 110;
const TEST_FIND_RUINS = 123;
const TEST_FIND_SOURCES = 105;
const TEST_FIND_STRUCTURES = 111;
const TEST_FIND_TOMBSTONES = 118;
const TEST_STRUCTURE_CONTAINER = 'container';
const TEST_STRUCTURE_EXTENSION = 'extension';
const TEST_STRUCTURE_RAMPART = 'rampart';
const TEST_STRUCTURE_ROAD = 'road';
const TEST_STRUCTURE_SPAWN = 'spawn';
const TEST_STRUCTURE_WALL = 'constructedWall';
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

describe('Screeps main loop', () => {
  beforeEach(() => {
    vi.stubGlobal('BODYPART_COST', TEST_BODY_PART_COST);
    vi.stubGlobal('CONSTRUCTION_COST', TEST_CONSTRUCTION_COST);
    vi.stubGlobal('CONTROLLER_STRUCTURES', TEST_CONTROLLER_STRUCTURES);
    vi.stubGlobal('FIND_CONSTRUCTION_SITES', TEST_FIND_CONSTRUCTION_SITES);
    vi.stubGlobal('FIND_DROPPED_RESOURCES', TEST_FIND_DROPPED_RESOURCES);
    vi.stubGlobal('FIND_MY_CONSTRUCTION_SITES', TEST_FIND_MY_CONSTRUCTION_SITES);
    vi.stubGlobal('FIND_MY_STRUCTURES', TEST_FIND_MY_STRUCTURES);
    vi.stubGlobal('FIND_MINERALS', TEST_FIND_MINERALS);
    vi.stubGlobal('FIND_RUINS', TEST_FIND_RUINS);
    vi.stubGlobal('FIND_SOURCES', TEST_FIND_SOURCES);
    vi.stubGlobal('FIND_STRUCTURES', TEST_FIND_STRUCTURES);
    vi.stubGlobal('FIND_TOMBSTONES', TEST_FIND_TOMBSTONES);
    vi.stubGlobal('STRUCTURE_EXTENSION', TEST_STRUCTURE_EXTENSION);
    vi.stubGlobal('STRUCTURE_CONTAINER', TEST_STRUCTURE_CONTAINER);
    vi.stubGlobal('STRUCTURE_RAMPART', TEST_STRUCTURE_RAMPART);
    vi.stubGlobal('STRUCTURE_ROAD', TEST_STRUCTURE_ROAD);
    vi.stubGlobal('STRUCTURE_SPAWN', TEST_STRUCTURE_SPAWN);
    vi.stubGlobal('STRUCTURE_WALL', TEST_STRUCTURE_WALL);
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
      cpu: {
        getUsed: () => 0.5,
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
    expect(spawnRequests).toEqual([
      [['work', 'carry', 'carry', 'move', 'move'], 'Spawn1-worker-7'],
    ]);
    expect(screepsMemory).toEqual({
      screepsScripts: {
        schemaVersion: 1,
      },
    });
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
      cpu: {
        getUsed: () => 0.55,
      },
      getObjectById: () => null,
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
      cpu: {
        getUsed: () => 0.7,
      },
      getObjectById: (objectId: string) => (objectId === 'source-1' ? sourceTarget : null),
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
    expect(consoleLines).toEqual(['[tick 8] cpu=0.70']);
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
      cpu: {
        getUsed: () => 0.75,
      },
      getObjectById: (objectId: string) => {
        if (objectId === 'source-a') {
          return firstSource;
        }

        if (objectId === 'source-b') {
          return secondSource;
        }

        return null;
      },
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
      cpu: {
        getUsed: () => 0.71,
      },
      getObjectById: (objectId: string) =>
        objectId === 'dropped-energy-1' ? droppedEnergyTarget : sourceTarget,
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
      cpu: {
        getUsed: () => 0.72,
      },
      getObjectById: (objectId: string) =>
        objectId === 'tombstone-1' ? tombstoneTarget : sourceTarget,
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
      cpu: {
        getUsed: () => 0.73,
      },
      getObjectById: (objectId: string) =>
        objectId === testCase.targetId ? storedEnergyTarget : sourceTarget,
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
      cpu: {
        getUsed: () => 0.8,
      },
      getObjectById: (objectId: string) => (objectId === 'spawn-1' ? firstSpawn : null),
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
      cpu: {
        getUsed: () => 0.9,
      },
      getObjectById: (objectId: string) => (objectId === 'controller-1' ? controllerTarget : null),
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
      cpu: {
        getUsed: () => 0.6,
      },
      getObjectById: () => null,
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
      cpu: {
        getUsed: () => 0.65,
      },
      getObjectById: (objectId: string) => (objectId === 'extension-1' ? extensionTarget : null),
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

  it('builds a construction site through the runtime boundary', async () => {
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
      cpu: {
        getUsed: () => 0.66,
      },
      getObjectById: (objectId: string) => (objectId === 'site-1' ? constructionSiteTarget : null),
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
      cpu: {
        getUsed: () => 0.62,
      },
      getObjectById: (objectId: string) => {
        if (objectId === 'road-1') {
          return roadTarget;
        }

        if (objectId === 'controller-1') {
          return controllerTarget;
        }

        return null;
      },
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
      cpu: {
        getUsed: () => 0.62,
      },
      getObjectById: (objectId: string) => (objectId === 'controller-1' ? controllerTarget : null),
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
      cpu: {
        getUsed: () => 0.64,
      },
      getObjectById: (objectId: string) => {
        if (objectId === 'controller-1') {
          return controllerTarget;
        }

        if (objectId === 'site-1') {
          return constructionSiteTarget;
        }

        return null;
      },
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
      cpu: {
        getUsed: () => 0.67,
      },
      getObjectById: (objectId: string) => {
        if (objectId === 'controller-1') {
          return controllerTarget;
        }

        if (objectId === 'site-1') {
          return constructionSiteTarget;
        }

        return null;
      },
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
});
