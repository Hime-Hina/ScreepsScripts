import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { describe, expect, it } from 'vitest';

interface Coordinate {
  readonly x: number;
  readonly y: number;
}

interface RoomGeometryModule {
  createRoomGeometrySnapshot(input: {
    ownedUserId?: string;
    padding?: number;
    roomName: string;
    roomObjects: readonly Record<string, unknown>[];
    terrainText: string;
  }): {
    readonly anchors: {
      readonly controller: Coordinate | null;
      readonly mineral: Coordinate | null;
      readonly sources: readonly Coordinate[];
    };
    readonly asciiMap: string;
    readonly bounds: {
      readonly maxX: number;
      readonly maxY: number;
      readonly minX: number;
      readonly minY: number;
    };
    readonly constructionBacklog: {
      readonly progress: string;
      readonly remainingWork: number;
      readonly summary: string;
    };
    readonly counts: {
      readonly constructionSites: number;
      readonly containers: number;
      readonly extensionSites: number;
      readonly extensions: number;
      readonly roads: number;
      readonly roadSites: number;
    };
    readonly extensionRange: string;
    readonly refillAccess: {
      readonly lowCount: number;
      readonly min: number;
      readonly summary: string;
    };
    readonly roadConnectivity: {
      readonly componentCount: number;
      readonly largestComponentSize: number;
      readonly summary: string;
      readonly totalTiles: number;
    };
    readonly roomName: string;
  };
  formatRoomGeometryReport(
    metadata: Record<string, string>,
    roomGeometrySnapshot: ReturnType<RoomGeometryModule['createRoomGeometrySnapshot']>,
  ): string;
  normalizeRoomGeometryFixture(rawFixture: Record<string, unknown>): {
    readonly accountId?: string;
    readonly roomName: string;
    readonly roomObjects: readonly Record<string, unknown>[];
    readonly terrainText: string;
  };
}

const loadRoomGeometryModule = async (): Promise<RoomGeometryModule> => {
  const loadedModule = (await import(
    pathToFileURL(resolve('scripts/screeps/room-geometry-layout.mjs')).href
  )) as unknown;

  return loadedModule as RoomGeometryModule;
};

describe('room geometry layout helper', () => {
  it('normalizes fixture terrain rows and produces deterministic layout metrics', async () => {
    const roomGeometryModule = await loadRoomGeometryModule();
    const fixturePayload = {
      accountId: 'alice-user',
      roomName: 'W51N21',
      roomObjects: createFixtureRoomObjects(),
      terrainRows: createTerrainRows([[32, 22]]),
    };

    const normalizedFixture = roomGeometryModule.normalizeRoomGeometryFixture(fixturePayload);
    const ownedUserId = normalizedFixture.accountId;

    if (ownedUserId === undefined) {
      throw new Error('Fixture account id should be preserved.');
    }

    const roomGeometrySnapshot = roomGeometryModule.createRoomGeometrySnapshot({
      ownedUserId,
      padding: 1,
      roomName: normalizedFixture.roomName,
      roomObjects: normalizedFixture.roomObjects,
      terrainText: normalizedFixture.terrainText,
    });

    expect(roomGeometrySnapshot.roomName).toBe('W51N21');
    expect(roomGeometrySnapshot.anchors).toEqual({
      controller: { x: 26, y: 7 },
      mineral: { x: 24, y: 39 },
      sources: [
        { x: 30, y: 6 },
        { x: 20, y: 42 },
      ],
    });
    expect(roomGeometrySnapshot.bounds).toEqual({
      maxX: 38,
      maxY: 24,
      minX: 32,
      minY: 19,
    });
    expect(roomGeometrySnapshot.counts).toEqual({
      constructionSites: 3,
      containers: 1,
      extensionSites: 2,
      extensions: 1,
      roads: 3,
      roadSites: 1,
    });
    expect(roomGeometrySnapshot.constructionBacklog.progress).toBe('2095/6300');
    expect(roomGeometrySnapshot.constructionBacklog.remainingWork).toBe(4205);
    expect(roomGeometrySnapshot.extensionRange).toBe('2:2,3:1');
    expect(roomGeometrySnapshot.refillAccess.summary).toBe('min=7 low=0/4 worst=extension@35,20:7');
    expect(roomGeometrySnapshot.roadConnectivity.summary).toBe('components=1 largest=4/4');
    expect(roomGeometrySnapshot.asciiMap).toContain('20  ...ee..');
    expect(roomGeometrySnapshot.asciiMap).toContain('21  .CRRRr.');
    expect(roomGeometrySnapshot.asciiMap).toContain('22  #.S.W..');
  });

  it('formats a report with ASCII coordinates, anchors, and backlog metrics', async () => {
    const roomGeometryModule = await loadRoomGeometryModule();
    const roomGeometrySnapshot = roomGeometryModule.createRoomGeometrySnapshot({
      ownedUserId: 'alice-user',
      padding: 1,
      roomName: 'W51N21',
      roomObjects: createFixtureRoomObjects(),
      terrainText: createTerrainRows([[32, 22]]).join(''),
    });

    const reportText = roomGeometryModule.formatRoomGeometryReport(
      {
        branch: 'main',
        moduleHash: 'abc123',
        shardName: 'shard1',
        sourceLabel: 'fixture:test',
        status: 'fixture',
      },
      roomGeometrySnapshot,
    );

    expect(reportText).toContain(
      '[room-geometry-layout:screeps] source=fixture:test branch=main shard=shard1 room=W51N21 status=fixture moduleHash=abc123 bounds=32,19..38,24',
    );
    expect(reportText).toContain('anchors: controller=26,7 sources=30,6|20,42 mineral=24,39');
    expect(reportText).toContain(
      'metrics: extensions=1 extensionSites=2 roads=3 roadSites=1 containers=1 constructionSites=3 constructionBacklog=sites=3 progress=2095/6300 remaining=4205 byType=extension:2,road:1 refillAccess=min=7 low=0/4 worst=extension@35,20:7 roadConnectivity=components=1 largest=4/4 extensionRange=2:2,3:1 capacityImpact=50->150',
    );
    expect(reportText).toContain('    3333333');
    expect(reportText).toContain('    2345678');
  });
});

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
