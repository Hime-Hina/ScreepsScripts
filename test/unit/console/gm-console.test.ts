import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  applyGmFlagDirectives,
  installGmConsoleTools,
  recordGmExecutedWorkerIntent,
  recordGmPlannedWorkerIntent,
  recordGmWorkerIntentError,
  runGmConsoleWatches,
  selectGmRuntimeStrategyDecision,
  type GmConsoleApi,
} from '../../../src/console/gm-console';
import type { WorkerActionDecision } from '../../../src/creeps/worker-decision';

const TEST_FIND_CONSTRUCTION_SITES = 111;
const TEST_FIND_DROPPED_RESOURCES = 106;
const TEST_FIND_HOSTILE_CREEPS = 103;
const TEST_FIND_RUINS = 123;
const TEST_FIND_TOMBSTONES = 118;
const TEST_RESOURCE_ENERGY = 'energy';

const readGm = (): GmConsoleApi => (globalThis as unknown as { gm: GmConsoleApi }).gm;

const resetGmGlobals = (): void => {
  delete (globalThis as unknown as Record<string, unknown>)['gm'];
  delete (globalThis as unknown as Record<string, unknown>)['__gm'];
};

describe('gm console tools', () => {
  beforeEach(() => {
    resetGmGlobals();
    vi.stubGlobal('FIND_CONSTRUCTION_SITES', TEST_FIND_CONSTRUCTION_SITES);
    vi.stubGlobal('FIND_DROPPED_RESOURCES', TEST_FIND_DROPPED_RESOURCES);
    vi.stubGlobal('FIND_HOSTILE_CREEPS', TEST_FIND_HOSTILE_CREEPS);
    vi.stubGlobal('FIND_RUINS', TEST_FIND_RUINS);
    vi.stubGlobal('FIND_TOMBSTONES', TEST_FIND_TOMBSTONES);
    vi.stubGlobal('RESOURCE_ENERGY', TEST_RESOURCE_ENERGY);
    vi.stubGlobal('OK', 0);
    vi.stubGlobal('ERR_NOT_IN_RANGE', -9);
  });

  afterEach(() => {
    resetGmGlobals();
    vi.unstubAllGlobals();
  });

  it('installs pretty-print commands and autocomplete constants without mutating the room', () => {
    const consoleLines: string[] = [];
    const { createConstructionSite, moveTo, worker } = stubGame({ consoleLines });
    const game = (globalThis as unknown as { Game: MutableScreepsGame }).Game;

    Object.defineProperty(game.creeps, '__proto__', {
      configurable: true,
      enumerable: true,
      value: { ...worker, name: '__proto__' },
      writable: true,
    });

    installGmConsoleTools();

    const gm = readGm();

    expect(gm.r['W51N21']).toBe('W51N21');
    expect(gm.rooms['W51N21']).toBe('W51N21');
    expect(gm.c['Worker71783702']).toBe('Worker71783702');
    expect(gm.c['__proto__']).toBe('__proto__');
    expect(Object.getPrototypeOf(gm.c)).toBeNull();
    expect(gm.creeps['Worker71783702']).toBe('Worker71783702');
    expect(gm.f['gm_room']).toBe('gm:room');
    expect(gm.flagNames['gm_room']).toBe('gm:room');
    expect(gm.s['Spawn1']).toBe('Spawn1');
    expect(gm.spawns['Spawn1']).toBe('Spawn1');

    expect(gm.help()).toContain('\nCommands\n');

    const roomOutput = gm.room();

    expect(roomOutput).toContain('[gm:room] W51N21 @ shard1 tick 71,783,790');
    expect(roomOutput).toContain('\nController\n');
    expect(roomOutput).toContain('\nEnergy\n');
    expect(roomOutput).toContain('\nRuntime\n');
    expect(roomOutput).not.toContain(' rcl=');
    expect(consoleLines).toEqual([]);
    expect(createConstructionSite).not.toHaveBeenCalled();
    expect(moveTo).not.toHaveBeenCalled();
  });

  it('sets, displays, expires, and clears bounded runtime strategy directives', () => {
    const consoleLines: string[] = [];
    stubGame({ consoleLines });
    installGmConsoleTools();

    const gm = readGm();

    expect(gm.strategy()).toContain('Active: none');
    expect(gm.setStrategy('pauseConstruction', { roomName: 'W51N21', ticks: 20 })).toContain(
      '[gm:setStrategy] pauseConstruction',
    );

    const activeOutput = gm.strategy();

    expect(activeOutput).toContain('\nStrategy\n');
    expect(activeOutput).toContain('Mode: pauseConstruction');
    expect(activeOutput).toContain('Scope: W51N21');
    expect(activeOutput).toContain('Expires: 71783810');
    expect(activeOutput).toContain('TTL: 20');

    (globalThis as unknown as { Game: { time: number } }).Game.time += 21;
    expect(gm.strategy()).toContain('Active: none');

    expect(gm.setStrategy('pauseConstruction', { ticks: 0 })).toContain('[gm:setStrategy] error');
    expect(gm.setStrategy('invalid', { ticks: 10 })).toContain('[gm:setStrategy] error');
    expect(gm.setStrategy('pauseConstruction', { ticks: 10 })).toContain('Expires: 71783821');
    expect(gm.clearStrategy()).toContain('[gm:clearStrategy]');
    expect(gm.strategy()).toContain('Active: none');
  });

  it('selects bounded runtime strategy only when safety gates allow it', () => {
    const consoleLines: string[] = [];
    stubGame({ consoleLines });
    installGmConsoleTools();

    const gm = readGm();
    expect(gm.setStrategy('pauseConstruction', { roomName: 'W51N21', ticks: 20 })).toContain(
      '[gm:setStrategy] pauseConstruction',
    );

    expect(
      selectGmRuntimeStrategyDecision({
        defenseStates: [{ roomName: 'W51N21', type: 'roomSafe' }],
        gameTime: 71783790,
        rooms: [
          {
            roomName: 'W51N21',
            ticksToDowngrade: 9000,
            workerCreepCount: 4,
          },
        ],
        tickBudgetType: 'fullTickBudget',
      }),
    ).toEqual({
      mode: 'pauseConstruction',
      roomName: 'W51N21',
      type: 'active',
    });

    expect(
      selectGmRuntimeStrategyDecision({
        defenseStates: [{ roomName: 'W51N21', type: 'roomUnsafe' }],
        gameTime: 71783790,
        rooms: [
          {
            roomName: 'W51N21',
            ticksToDowngrade: 9000,
            workerCreepCount: 4,
          },
        ],
        tickBudgetType: 'fullTickBudget',
      }),
    ).toEqual({
      mode: 'pauseConstruction',
      reason: 'room W51N21 is unsafe',
      roomName: 'W51N21',
      type: 'ignored',
    });

    expect(
      selectGmRuntimeStrategyDecision({
        defenseStates: [{ roomName: 'W51N21', type: 'roomSafe' }],
        gameTime: 71783790,
        rooms: [
          {
            roomName: 'W51N21',
            ticksToDowngrade: 7999,
            workerCreepCount: 4,
          },
        ],
        tickBudgetType: 'fullTickBudget',
      }),
    ).toMatchObject({
      reason: 'controller downgrade warning in W51N21',
      type: 'ignored',
    });

    expect(
      selectGmRuntimeStrategyDecision({
        defenseStates: [{ roomName: 'W51N21', type: 'roomSafe' }],
        gameTime: 71783790,
        rooms: [
          {
            roomName: 'W51N21',
            ticksToDowngrade: 9000,
            workerCreepCount: 2,
          },
        ],
        tickBudgetType: 'fullTickBudget',
      }),
    ).toMatchObject({
      reason: 'worker count below survival floor in W51N21',
      type: 'ignored',
    });

    expect(
      selectGmRuntimeStrategyDecision({
        defenseStates: [{ roomName: 'W51N21', type: 'roomSafe' }],
        gameTime: 71783790,
        rooms: [
          {
            roomName: 'W51N21',
            ticksToDowngrade: 9000,
            workerCreepCount: 4,
          },
        ],
        tickBudgetType: 'survivalOnlyTickBudget',
      }),
    ).toMatchObject({
      reason: 'survival-only CPU budget is active',
      type: 'ignored',
    });
  });

  it('reports creep state and manual flag intent in pretty output', () => {
    const consoleLines: string[] = [];
    const { moveTo } = stubGame({ consoleLines });
    installGmConsoleTools();

    expect(applyGmFlagDirectives((message) => consoleLines.push(message))).toEqual([
      'Worker71783702',
    ]);
    expect(moveTo).toHaveBeenCalledTimes(1);

    const gm = readGm();
    const creepOutput = gm.creep(gm.c['Worker71783702']);
    const intentOutput = gm.intent(gm.c['Worker71783702']);

    expect(creepOutput).toContain('\nIntent\n');
    expect(creepOutput).toContain('Action: manualMoveToFlag');
    expect(intentOutput).toContain('Source: manual-flag');
    expect(intentOutput).toContain('Result: OK');
    expect(consoleLines).toEqual([]);
  });

  it('runs bounded room watches and returns pretty unsupported flag-watch errors', () => {
    const consoleLines: string[] = [];
    stubGame({ consoleLines });
    installGmConsoleTools();

    const gm = readGm();
    const unsupportedWatch = gm.watch(gm.f['gm_room'], { kind: 'flag' });

    expect(unsupportedWatch).toContain('[gm:watch] error');
    expect(unsupportedWatch).toContain('Flag watches are not supported in v1');

    expect(gm.watch(gm.r['W51N21'], { every: 5, ticks: 20 })).toContain('[gm:watch] started');
    runGmConsoleWatches((message) => consoleLines.push(message));

    expect(consoleLines).toHaveLength(1);
    expect(consoleLines[0]).toContain('[gm:watch #1] Room W51N21');
    expect(consoleLines[0]).toContain('\nDelta\n');
    expect(gm.watches()).toContain('#1: room W51N21');
    expect(gm.stop(1)).toContain('Stopped');
    expect(gm.watches()).toContain('Active: none');
  });

  it('suppresses unchanged creep watch output when changesOnly is enabled', () => {
    const consoleLines: string[] = [];
    stubGame({ consoleLines });
    installGmConsoleTools();

    const gm = readGm();

    expect(gm.watch(gm.c['Worker71783702'], { changesOnly: true })).toContain('[gm:watch] started');
    runGmConsoleWatches((message) => consoleLines.push(message));
    (globalThis as unknown as { Game: { time: number } }).Game.time += 1;
    runGmConsoleWatches((message) => consoleLines.push(message));

    expect(consoleLines).toHaveLength(1);
  });

  it('reports flags, command errors, defaults, and watch target validation as pretty output', () => {
    const consoleLines: string[] = [];
    const { worker } = stubGame({ consoleLines });
    const game = (globalThis as unknown as { Game: MutableScreepsGame }).Game;

    game.flags['gm:watch:Worker71783702'] = {
      name: 'gm:watch:Worker71783702',
      pos: { roomName: 'W51N21', x: 22, y: 15 },
    };
    game.flags['gm:unknown'] = {
      name: 'gm:unknown',
      pos: { roomName: 'W51N21', x: 23, y: 15 },
    };

    installGmConsoleTools();

    const gm = readGm();
    const flagOutput = gm.flags();

    expect(flagOutput).toContain('gm:room: default room W51N21');
    expect(flagOutput).toContain('gm:move:Worker71783702: manual move creep Worker71783702');
    expect(flagOutput).toContain('gm:watch:Worker71783702: watch creep Worker71783702');
    expect(flagOutput).toContain('gm:unknown: unrecognized gm flag; ignored');
    expect(gm.setRoom('missing')).toContain('[gm:setRoom] error');
    expect(gm.setRoom('W51N21')).toContain('\nDefault\n  Room: W51N21');
    expect(gm.room('missing')).toContain('[gm:error] error');
    expect(gm.creep('missing')).toContain('Creep "missing" is not visible');
    expect(gm.intent()).toContain('Status: none recorded');

    game.creeps['W51N21'] = { ...worker, name: 'W51N21' };
    expect(gm.creep()).toContain('Creep name required');
    expect(gm.watch('gm:room')).toContain('Flag watches are not supported in v1');
    expect(gm.watch('W51N21')).toContain('ambiguous');
    expect(gm.watch('missing')).toContain('not a visible room or creep');
    expect(gm.watch('missing', { kind: 'creep' })).toContain('not a visible room or creep');
    expect(gm.watch('W51N21', { kind: 'room', every: 1, ticks: 1 })).toContain('Every: 5');
    expect(gm.watch('Worker71783702', { kind: 'creep' })).toContain('Kind: creep');
    expect(gm.stop()).toContain('Watches: 2');

    game.flags = {};
    expect(gm.flags()).toContain('Recognized: none');
  });

  it('expires watches and reports deltas between changed room samples', () => {
    const consoleLines: string[] = [];
    const { constructionSite, controller, room } = stubGame({ consoleLines });
    const game = (globalThis as unknown as { Game: MutableScreepsGame }).Game;

    installGmConsoleTools();

    const gm = readGm();

    expect(gm.watch('W51N21', { every: 5, ticks: 5 })).toContain('[gm:watch] started');
    game.time += 5;
    runGmConsoleWatches((message) => consoleLines.push(message));
    expect(consoleLines).toEqual([]);
    expect(gm.watches()).toContain('Active: none');

    expect(gm.watch('W51N21', { every: 5, ticks: 20 })).toContain('[gm:watch] started');
    runGmConsoleWatches((message) => consoleLines.push(message));
    controller.progress += 10;
    room.energyAvailable += 25;
    constructionSite.progress += 50;
    game.time += 5;
    runGmConsoleWatches((message) => consoleLines.push(message));

    expect(consoleLines).toHaveLength(2);
    expect(consoleLines[1]).toContain('Controller progress: +10');
    expect(consoleLines[1]).toContain('Energy available: +25');
    expect(consoleLines[1]).toContain('Construction progress: +50');
  });

  it('records planner worker intents, action results, and action errors', () => {
    const consoleLines: string[] = [];
    stubGame({ consoleLines });
    installGmConsoleTools();

    const gm = readGm();
    const decisions: readonly [WorkerActionDecision, string, string][] = [
      [
        {
          constructionSiteId: 'site-1',
          creepName: 'Worker71783702',
          type: 'buildConstructionSite',
        },
        'constructionSite',
        'site-1',
      ],
      [
        {
          creepName: 'Worker71783702',
          sourceId: 'source-1',
          type: 'harvestSource',
        },
        'source',
        'source-1',
      ],
      [
        {
          creepName: 'Worker71783702',
          resourceId: 'resource-1',
          type: 'pickupEnergy',
        },
        'resource',
        'resource-1',
      ],
      [
        {
          creepName: 'Worker71783702',
          structureId: 'extension-1',
          type: 'refillEnergyStructure',
        },
        'energyStructure',
        'extension-1',
      ],
      [
        {
          creepName: 'Worker71783702',
          structureId: 'road-1',
          type: 'repairStructure',
        },
        'structure',
        'road-1',
      ],
      [
        {
          controllerId: 'controller-1',
          creepName: 'Worker71783702',
          type: 'upgradeController',
        },
        'controller',
        'controller-1',
      ],
      [
        {
          creepName: 'Worker71783702',
          structureId: 'tombstone-1',
          type: 'withdrawEnergy',
        },
        'energyWithdrawal',
        'tombstone-1',
      ],
    ];

    for (const [decision, targetKind, targetId] of decisions) {
      recordGmPlannedWorkerIntent(decision);
      const intentOutput = gm.intent('Worker71783702');

      expect(intentOutput).toContain(`Target: ${targetKind} ${targetId}`);
      expect(intentOutput).toContain('Result: planned');
    }

    recordGmExecutedWorkerIntent(
      decisions[0][0],
      {
        id: 'site-1',
        pos: { roomName: 'W51N21', x: 11, y: 10 },
      } as RoomObject & { readonly id: string },
      -9,
    );
    expect(gm.intent('Worker71783702')).toContain('Result: ERR_NOT_IN_RANGE');
    expect(gm.intent('Worker71783702')).toContain('@ W51N21(11,10)');

    recordGmWorkerIntentError(decisions[1][0], 'boom');
    expect(gm.intent('Worker71783702')).toContain('Result: ERROR boom');
  });

  it('reports manual move flag validation errors without executing duplicate or unsafe moves', () => {
    const consoleLines: string[] = [];
    const { moveTo, worker } = stubGame({ consoleLines });
    const game = (globalThis as unknown as { Game: MutableScreepsGame }).Game;

    game.flags['duplicate'] = {
      name: 'gm:move:Worker71783702',
      pos: { roomName: 'W51N21', x: 22, y: 15 },
    };
    game.flags['missing'] = {
      name: 'gm:move:Missing',
      pos: { roomName: 'W51N21', x: 23, y: 15 },
    };
    game.flags['spawning'] = {
      name: 'gm:move:SpawningWorker',
      pos: { roomName: 'W51N21', x: 24, y: 15 },
    };
    game.creeps['SpawningWorker'] = { ...worker, name: 'SpawningWorker', spawning: true };

    expect(applyGmFlagDirectives((message) => consoleLines.push(message))).toEqual([]);
    expect(consoleLines.join('\n')).toContain('Multiple gm:move flags for Worker71783702');
    expect(consoleLines.join('\n')).toContain('Creep "Missing" is not visible');
    expect(consoleLines.join('\n')).toContain('Creep "SpawningWorker" is spawning');
    expect(moveTo).not.toHaveBeenCalled();
  });
});

interface MutableScreepsGame {
  readonly cpu: { readonly bucket: number; readonly getUsed: () => number };
  creeps: Record<string, Record<string, unknown>>;
  flags: Record<
    string,
    {
      readonly name: string;
      readonly pos: { readonly roomName: string; readonly x: number; readonly y: number };
    }
  >;
  readonly rooms: Record<string, Record<string, unknown>>;
  readonly shard: { readonly name: string };
  readonly spawns: Record<string, Record<string, unknown>>;
  time: number;
}

const stubGame = ({ consoleLines }: { readonly consoleLines: string[] }) => {
  const createConstructionSite = vi.fn();
  const moveTo = vi.fn(() => 0);
  const controller = {
    id: 'controller-1',
    level: 3,
    my: true,
    progress: 64000,
    progressTotal: 135000,
    ticksToDowngrade: 19956,
  };
  const spawn = {
    name: 'Spawn1',
    pos: { roomName: 'W51N21', x: 10, y: 10 },
    spawning: null,
    store: {
      getCapacity: () => 650,
      getUsedCapacity: () => 542,
    },
  };
  const constructionSite = {
    id: 'site-1',
    pos: { roomName: 'W51N21', x: 11, y: 10 },
    progress: 100,
    progressTotal: 3000,
    structureType: 'extension',
  };
  const room = {
    controller,
    createConstructionSite,
    energyAvailable: 542,
    energyCapacityAvailable: 650,
    find: (findConstant: number) => {
      switch (findConstant) {
        case TEST_FIND_CONSTRUCTION_SITES:
          return [constructionSite];
        case TEST_FIND_DROPPED_RESOURCES:
        case TEST_FIND_HOSTILE_CREEPS:
        case TEST_FIND_RUINS:
        case TEST_FIND_TOMBSTONES:
          return [];
        default:
          return [];
      }
    },
    name: 'W51N21',
  };
  const worker = {
    body: [
      { hits: 100, type: 'work' },
      { hits: 100, type: 'carry' },
      { hits: 100, type: 'move' },
    ],
    memory: {
      role: 'worker',
    },
    moveTo,
    name: 'Worker71783702',
    pos: { roomName: 'W51N21', x: 20, y: 15 },
    room,
    spawning: false,
    store: {
      getFreeCapacity: () => 25,
      getUsedCapacity: () => 25,
    },
    ticksToLive: 1220,
  };
  const gmRoomFlag = {
    name: 'gm:room',
    pos: { roomName: 'W51N21', x: 25, y: 25 },
  };
  const gmMoveFlag = {
    name: 'gm:move:Worker71783702',
    pos: { roomName: 'W51N21', x: 21, y: 15 },
  };

  vi.stubGlobal('Game', {
    cpu: {
      bucket: 10000,
      getUsed: () => 0.08,
    },
    creeps: {
      Worker71783702: worker,
    },
    flags: {
      'gm:move:Worker71783702': gmMoveFlag,
      'gm:room': gmRoomFlag,
    },
    rooms: {
      W51N21: room,
    },
    shard: {
      name: 'shard1',
    },
    spawns: {
      Spawn1: spawn,
    },
    time: 71783790,
  });
  vi.stubGlobal('console', {
    log: (message: string) => consoleLines.push(message),
  });

  return { constructionSite, controller, createConstructionSite, moveTo, room, worker };
};
