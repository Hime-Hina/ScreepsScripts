import { afterEach, describe, expect, it, vi } from 'vitest';

describe('Screeps main loop', () => {
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
        },
      },
      spawns: {
        Spawn1: firstSpawn,
      },
      time: 7,
    });
    vi.stubGlobal('FIND_MY_CREEPS', 101);
    vi.stubGlobal('FIND_SOURCES', 105);
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
          find: () => [sourceTarget],
          name: 'W1N1',
        },
      },
      spawns: {
        Spawn1: firstSpawn,
      },
      time: 8,
    });
    vi.stubGlobal('ERR_NOT_IN_RANGE', -9);
    vi.stubGlobal('FIND_SOURCES', 105);
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
          find: () => [firstSource, secondSource],
          name: 'W1N1',
        },
      },
      spawns: {
        Spawn1: firstSpawn,
      },
      time: 11,
    });
    vi.stubGlobal('ERR_NOT_IN_RANGE', -9);
    vi.stubGlobal('FIND_SOURCES', 105);
    vi.stubGlobal('Memory', {});
    vi.stubGlobal('RESOURCE_ENERGY', 'energy');
    vi.stubGlobal('console', {
      log: () => undefined,
    });

    const mainModule = await import('../../src/main');

    mainModule.loop();

    expect(harvestedSources).toEqual([firstSource, secondSource]);
  });

  it('moves a worker toward the spawn before controller upgrading', async () => {
    const transferTargets: unknown[] = [];
    const moveTargets: unknown[] = [];
    const firstSpawn = {
      name: 'Spawn1',
      pos: {
        roomName: 'W1N1',
      },
      spawnCreep: () => 0,
      spawning: {},
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
      getObjectById: () => null,
      rooms: {
        W1N1: {
          controller: {
            id: 'controller-1',
          },
          find: () => [],
          name: 'W1N1',
        },
      },
      spawns: {
        Spawn1: firstSpawn,
      },
      time: 9,
    });
    vi.stubGlobal('ERR_NOT_IN_RANGE', -9);
    vi.stubGlobal('FIND_SOURCES', 105);
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
        getUsedCapacity: () => 300,
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
          find: () => [],
          name: 'W1N1',
        },
      },
      spawns: {
        Spawn1: firstSpawn,
      },
      time: 10,
    });
    vi.stubGlobal('ERR_NOT_IN_RANGE', -9);
    vi.stubGlobal('FIND_SOURCES', 105);
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
});
