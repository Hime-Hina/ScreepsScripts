import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { afterEach, describe, expect, it, vi } from 'vitest';

interface FetchRecord {
  readonly init: RequestInit | undefined;
  readonly url: string;
}

interface RoomGeometryFetchPayloads {
  readonly authMe: Record<string, unknown>;
  readonly remoteModules: Record<string, unknown>;
  readonly roomObjects: Record<string, unknown>;
  readonly roomStatus: Record<string, unknown>;
  readonly roomTerrain: Record<string, unknown>;
}

interface ConsoleLogSpy {
  readonly mock: {
    readonly calls: readonly unknown[][];
  };
}

interface RoomGeometrySimulatorModule {
  checkRoomGeometryLayoutSimulatorFrom(
    workspacePath: string,
    commandArguments: readonly string[],
  ): Promise<void>;
  parseRoomGeometryLayoutRequest(commandArguments: readonly string[]): {
    readonly fixturePath: string | null;
    readonly padding: number;
    readonly roomName: string | null;
    readonly shardName: string | null;
  };
}

const SCREEPS_CONFIG_TEXT = JSON.stringify({
  main: {
    branch: 'main',
    protocol: 'https',
    server: 'screeps.com',
    token: 'secret-token',
  },
});

const loadRoomGeometrySimulatorModule = async (): Promise<RoomGeometrySimulatorModule> => {
  const loadedModule = (await import(
    pathToFileURL(resolve('scripts/screeps/room-geometry-layout-simulator.mjs')).href
  )) as unknown;

  return loadedModule as RoomGeometrySimulatorModule;
};

describe('room geometry layout simulator command', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('parses fixture and live request arguments at the command boundary', async () => {
    const roomGeometrySimulatorModule = await loadRoomGeometrySimulatorModule();

    expect(
      roomGeometrySimulatorModule.parseRoomGeometryLayoutRequest([
        '--fixture',
        'fixture.json',
        '--padding',
        '1',
      ]),
    ).toEqual({
      fixturePath: 'fixture.json',
      padding: 1,
      roomName: null,
      shardName: null,
    });
    expect(
      roomGeometrySimulatorModule.parseRoomGeometryLayoutRequest([
        '--',
        '--shard',
        'shard1',
        '--room',
        'W51N21',
      ]),
    ).toEqual({
      fixturePath: null,
      padding: 2,
      roomName: 'W51N21',
      shardName: 'shard1',
    });
    expect(() =>
      roomGeometrySimulatorModule.parseRoomGeometryLayoutRequest(['--room', 'W51N21']),
    ).toThrow('Missing --shard <name>.');
    expect(() =>
      roomGeometrySimulatorModule.parseRoomGeometryLayoutRequest(['--padding', 'NaN']),
    ).toThrow('--padding must be a non-negative integer.');
    expect(() => roomGeometrySimulatorModule.parseRoomGeometryLayoutRequest(['--invalid'])).toThrow(
      'Unknown argument "--invalid".',
    );
  });

  it('renders a fixture-driven ASCII layout without requiring live credentials', async () => {
    const workspacePath = await createRoomGeometryWorkspace();
    const fixturePath = join(workspacePath, 'room-geometry-fixture.json');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await writeFile(
      fixturePath,
      JSON.stringify({
        accountId: 'alice-user',
        roomName: 'W51N21',
        roomObjects: createFixtureRoomObjects(),
        terrainRows: createTerrainRows([[32, 22]]),
      }),
    );

    try {
      const roomGeometrySimulatorModule = await loadRoomGeometrySimulatorModule();

      await roomGeometrySimulatorModule.checkRoomGeometryLayoutSimulatorFrom(workspacePath, [
        '--fixture',
        fixturePath,
        '--padding',
        '1',
      ]);

      expect(joinedLogLines(logSpy)).toContain(
        '[room-geometry-layout:screeps] source=fixture:room-geometry-fixture.json branch=- shard=- room=W51N21 status=fixture moduleHash=- bounds=32,19..38,24',
      );
      expect(joinedLogLines(logSpy)).toContain(
        'metrics: extensions=1 extensionSites=2 roads=3 roadSites=1 containers=1 constructionSites=3 constructionBacklog=sites=3 progress=2095/6300 remaining=4205 byType=extension:2,road:1',
      );
      expect(joinedLogLines(logSpy)).toContain('20  ...ee..');
      expect(joinedLogLines(logSpy)).not.toContain('secret-token');
    } finally {
      await rm(workspacePath, { force: true, recursive: true });
    }
  });

  it('renders a live read-only room geometry report from API data', async () => {
    const workspacePath = await createRoomGeometryWorkspace();
    const fetchRecords = stubRoomGeometryFetch({
      authMe: {
        _id: 'alice-user',
        ok: 1,
        username: 'Alice',
      },
      remoteModules: {
        modules: {
          main: 'remote-main-source',
        },
        ok: 1,
      },
      roomObjects: {
        objects: createFixtureRoomObjects(),
        ok: 1,
      },
      roomStatus: {
        ok: 1,
        room: { status: 'normal' },
      },
      roomTerrain: {
        ok: 1,
        terrain: createTerrainRows([[32, 22]]).join(''),
      },
    });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    try {
      const roomGeometrySimulatorModule = await loadRoomGeometrySimulatorModule();

      await roomGeometrySimulatorModule.checkRoomGeometryLayoutSimulatorFrom(workspacePath, [
        '--shard',
        'shard1',
        '--room',
        'W51N21',
        '--padding',
        '1',
      ]);

      expect(fetchRecords.map((fetchRecord) => fetchRecord.url)).toEqual([
        'https://screeps.com/api/auth/me',
        'https://screeps.com/api/game/room-status?room=W51N21&shard=shard1',
        'https://screeps.com/api/game/room-terrain?room=W51N21&shard=shard1',
        'https://screeps.com/api/game/room-objects?room=W51N21&shard=shard1',
        'https://screeps.com/api/user/code?branch=main',
      ]);
      expect(fetchRecords.map((fetchRecord) => fetchRecord.init?.headers)).toEqual([
        { 'X-Token': 'secret-token' },
        { 'X-Token': 'secret-token' },
        { 'X-Token': 'secret-token' },
        { 'X-Token': 'secret-token' },
        { 'X-Token': 'secret-token' },
      ]);
      expect(joinedLogLines(logSpy)).toContain(
        '[room-geometry-layout:screeps] source=live branch=main shard=shard1 room=W51N21 status=normal',
      );
      expect(joinedLogLines(logSpy)).toContain(
        'refillAccess=min=7 low=0/4 worst=extension@35,20:7',
      );
      expect(joinedLogLines(logSpy)).toContain('roadConnectivity=components=1 largest=4/4');
      expect(joinedLogLines(logSpy)).not.toContain('secret-token');
      expect(joinedLogLines(logSpy)).not.toContain('remote-main-source');
    } finally {
      await rm(workspacePath, { force: true, recursive: true });
    }
  });
});

const createRoomGeometryWorkspace = async () => {
  const workspacePath = await mkdtemp(join(tmpdir(), 'screeps-room-geometry-layout-'));

  await mkdir(join(workspacePath, 'dist'), { recursive: true });
  await writeFile(join(workspacePath, 'screeps.json'), SCREEPS_CONFIG_TEXT);

  return workspacePath;
};

const stubRoomGeometryFetch = (apiPayloadsByRoute: RoomGeometryFetchPayloads) => {
  const fetchRecords: FetchRecord[] = [];

  vi.stubGlobal('fetch', (requestInput: string | URL, requestInit?: RequestInit) => {
    const requestUrl = new URL(requestInput.toString());
    fetchRecords.push({
      init: requestInit,
      url: requestInput.toString(),
    });

    const apiPayload = selectRoomGeometryApiPayload(apiPayloadsByRoute, requestUrl.pathname);

    return Promise.resolve(
      new Response(JSON.stringify(apiPayload), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }),
    );
  });

  return fetchRecords;
};

const selectRoomGeometryApiPayload = (
  apiPayloadsByRoute: RoomGeometryFetchPayloads,
  apiPath: string,
) => {
  if (apiPath === '/api/auth/me') {
    return apiPayloadsByRoute.authMe;
  }

  if (apiPath === '/api/game/room-status') {
    return apiPayloadsByRoute.roomStatus;
  }

  if (apiPath === '/api/game/room-terrain') {
    return apiPayloadsByRoute.roomTerrain;
  }

  if (apiPath === '/api/game/room-objects') {
    return apiPayloadsByRoute.roomObjects;
  }

  if (apiPath === '/api/user/code') {
    return apiPayloadsByRoute.remoteModules;
  }

  throw new Error(`Unexpected live API path ${apiPath}.`);
};

const createFixtureRoomObjects = () => [
  { type: 'controller', user: 'alice-user', x: 26, y: 7 },
  { type: 'source', x: 30, y: 6 },
  { type: 'source', x: 20, y: 42 },
  { density: 2, mineralType: 'O', type: 'mineral', x: 24, y: 39 },
  { name: 'Spawn1', type: 'spawn', user: 'alice-user', x: 34, y: 22 },
  { type: 'extension', user: 'alice-user', x: 37, y: 23 },
  {
    progress: 1200,
    progressTotal: 3000,
    structureType: 'extension',
    type: 'constructionSite',
    user: 'alice-user',
    x: 35,
    y: 20,
  },
  {
    progress: 845,
    progressTotal: 3000,
    structureType: 'extension',
    type: 'constructionSite',
    user: 'alice-user',
    x: 36,
    y: 20,
  },
  { hits: 5000, hitsMax: 5000, type: 'road', x: 34, y: 21 },
  { hits: 5000, hitsMax: 5000, type: 'road', x: 35, y: 21 },
  { hits: 5000, hitsMax: 5000, type: 'road', x: 36, y: 21 },
  {
    progress: 50,
    progressTotal: 300,
    structureType: 'road',
    type: 'constructionSite',
    user: 'alice-user',
    x: 37,
    y: 21,
  },
  {
    store: { energy: 1500 },
    storeCapacityResource: { energy: 2000 },
    type: 'container',
    user: 'alice-user',
    x: 33,
    y: 21,
  },
  { type: 'constructedWall', x: 36, y: 22 },
];

const createTerrainRows = (wallCoordinates: readonly (readonly [number, number])[]) => {
  const wallPositionKeys = new Set(
    wallCoordinates.map(([xCoordinate, yCoordinate]) => `${xCoordinate},${yCoordinate}`),
  );

  return Array.from({ length: 50 }, (_, yCoordinate) =>
    Array.from({ length: 50 }, (_, xCoordinate) =>
      wallPositionKeys.has(`${xCoordinate},${yCoordinate}`) ? '#' : '.',
    ).join(''),
  );
};

const joinedLogLines = (logSpy: ConsoleLogSpy) =>
  logSpy.mock.calls.map((logCall) => logCall.map(String).join(' ')).join('\n');
