import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { describe, expect, it } from 'vitest';

interface RoomCoordinate {
  readonly x: number;
  readonly y: number;
}

interface ScoutRoomObject {
  readonly type: string;
  readonly x: number;
  readonly y: number;
  readonly owner?: string | { readonly username: string };
  readonly user?: string;
  readonly reservation?: {
    readonly user?: string;
    readonly username?: string;
  };
  readonly mineralType?: string;
}

interface ScoutRoomSnapshot {
  readonly roomName: string;
  readonly status: string;
  readonly terrain: readonly number[];
  readonly objects: readonly ScoutRoomObject[];
  readonly neighborSnapshots: readonly NeighborRoomSnapshot[];
}

interface NeighborRoomSnapshot {
  readonly roomName: string;
  readonly status: string;
  readonly objects: readonly ScoutRoomObject[];
}

interface RoomCandidateEvaluation {
  readonly roomName: string;
  readonly status: string;
  readonly accepted: boolean;
  readonly sourceCount: number;
  readonly score: number | null;
  readonly rejectionReasons: readonly string[];
  readonly bestSpawn: {
    readonly position: RoomCoordinate;
    readonly sourceDistances: readonly number[];
    readonly controllerDistance: number;
  } | null;
  readonly terrain: {
    readonly swampPercent: number;
  };
  readonly risk: {
    readonly candidateHostileCreeps: number;
    readonly candidateSpawns: number;
    readonly candidateTowers: number;
    readonly neighborCreeps: number;
    readonly neighborOwnedRooms: number;
    readonly neighborReservedRooms: number;
    readonly neighborSpawns: number;
    readonly neighborTowers: number;
    readonly riskScore: number;
  };
}

interface RoomScoutModule {
  decodeTerrainString(terrainText: string): readonly number[];
  formatStartingRoomScoutReport(scoutReport: {
    readonly branch: string;
    readonly candidateEvaluations: readonly RoomCandidateEvaluation[];
    readonly roomCount: number;
    readonly shardName: string;
  }): string;
  getCardinalNeighborRoomNames(roomName: string): readonly string[];
  parseRoomScoutRequest(commandArguments: readonly string[]): {
    readonly roomNames: readonly string[];
    readonly shardName: string;
  };
  rankStartingRoomCandidates(
    roomSnapshots: readonly ScoutRoomSnapshot[],
  ): readonly RoomCandidateEvaluation[];
}

const loadRoomScoutModule = async (): Promise<RoomScoutModule> => {
  const loadedModule = (await import(
    pathToFileURL(resolve('scripts/screeps/room-scout.mjs')).href
  )) as unknown;

  if (!isRoomScoutModule(loadedModule)) {
    throw new Error('room-scout.mjs exports changed.');
  }

  return loadedModule;
};

const isRoomScoutModule = (candidateModule: unknown): candidateModule is RoomScoutModule =>
  typeof candidateModule === 'object' &&
  candidateModule !== null &&
  'decodeTerrainString' in candidateModule &&
  'formatStartingRoomScoutReport' in candidateModule &&
  'getCardinalNeighborRoomNames' in candidateModule &&
  'parseRoomScoutRequest' in candidateModule &&
  'rankStartingRoomCandidates' in candidateModule &&
  typeof candidateModule.decodeTerrainString === 'function' &&
  typeof candidateModule.formatStartingRoomScoutReport === 'function' &&
  typeof candidateModule.getCardinalNeighborRoomNames === 'function' &&
  typeof candidateModule.parseRoomScoutRequest === 'function' &&
  typeof candidateModule.rankStartingRoomCandidates === 'function';

describe('Screeps room scout scoring', () => {
  it('ranks low-swamp two-source rooms before swamp-heavy rooms and rejects one-source rooms', async () => {
    const roomScoutModule = await loadRoomScoutModule();
    const lowSwampCandidate = createRoomSnapshot({
      controller: { x: 24, y: 26 },
      roomName: 'W13S27',
      sources: [
        { x: 12, y: 18 },
        { x: 18, y: 18 },
      ],
      swampTiles: [],
    });
    const swampHeavyCandidate = createRoomSnapshot({
      controller: { x: 24, y: 26 },
      roomName: 'W18S26',
      sources: [
        { x: 12, y: 18 },
        { x: 18, y: 18 },
      ],
      swampTiles: createSwampBlock({ bottomRight: { x: 38, y: 38 }, topLeft: { x: 8, y: 8 } }),
    });
    const oneSourceCandidate = createRoomSnapshot({
      controller: { x: 24, y: 26 },
      roomName: 'W19S26',
      sources: [{ x: 12, y: 18 }],
      swampTiles: [],
    });

    const rankedCandidates = roomScoutModule.rankStartingRoomCandidates([
      swampHeavyCandidate,
      oneSourceCandidate,
      lowSwampCandidate,
    ]);

    expect(rankedCandidates.map((candidateEvaluation) => candidateEvaluation.roomName)).toEqual([
      'W13S27',
      'W18S26',
      'W19S26',
    ]);
    expect(rankedCandidates[0]?.accepted).toBe(true);
    expect(rankedCandidates[0]?.status).toBe('normal');
    expect(rankedCandidates[0]?.sourceCount).toBe(2);
    expect(typeof rankedCandidates[0]?.bestSpawn?.position.x).toBe('number');
    expect(typeof rankedCandidates[0]?.bestSpawn?.position.y).toBe('number');
    expect(rankedCandidates[0]?.bestSpawn?.sourceDistances).toHaveLength(2);
    expect(rankedCandidates[0]?.bestSpawn?.sourceDistances.every(Number.isFinite)).toBe(true);
    expect(Number.isFinite(rankedCandidates[0]?.bestSpawn?.controllerDistance)).toBe(true);
    expect(rankedCandidates[0]?.terrain.swampPercent).toBe(0);
    expect(rankedCandidates[1]?.accepted).toBe(true);
    expect(rankedCandidates[1]?.terrain.swampPercent).toBeGreaterThan(30);
    expect(rankedCandidates[2]?.accepted).toBe(false);
    expect(rankedCandidates[2]?.sourceCount).toBe(1);
    expect(rankedCandidates[2]?.score).toBeNull();
    expect(rankedCandidates[2]?.rejectionReasons).toContain('room has fewer than two sources');
  });

  it('expands room areas and computes cardinal neighbors across world-axis boundaries', async () => {
    const roomScoutModule = await loadRoomScoutModule();

    expect(
      roomScoutModule.parseRoomScoutRequest([
        '--',
        '--shard',
        'shard3',
        '--area',
        'W1N0:E0S1',
        '--room',
        'W13S27',
      ]),
    ).toEqual({
      roomNames: ['W13S27', 'W1N0', 'W1S0', 'W1S1', 'W0N0', 'W0S0', 'W0S1', 'E0N0', 'E0S0', 'E0S1'],
      shardName: 'shard3',
    });
    expect(roomScoutModule.getCardinalNeighborRoomNames('W0S0')).toEqual([
      'W1S0',
      'W0N0',
      'W0S1',
      'E0S0',
    ]);
  });

  it('explains ownership, reservation, missing controller, and unreachable spawn rejection reasons', async () => {
    const roomScoutModule = await loadRoomScoutModule();
    const rejectedCandidates = roomScoutModule.rankStartingRoomCandidates([
      createRoomSnapshot({
        controller: { x: 24, y: 26 },
        controllerOwner: { username: 'Enemy' },
        controllerReservation: { username: 'EnemyReserve' },
        roomName: 'W1S1',
        sources: [{ x: 12, y: 18 }],
        status: 'closed',
        swampTiles: [],
      }),
      {
        neighborSnapshots: [],
        objects: [
          { type: 'source', x: 12, y: 18 },
          { type: 'source', x: 18, y: 18 },
        ],
        roomName: 'W1S2',
        status: 'normal',
        terrain: createTerrain([]),
      },
      createRoomSnapshot({
        controller: { x: 24, y: 26 },
        roomName: 'W1S3',
        sources: [
          { x: 12, y: 18 },
          { x: 18, y: 18 },
        ],
        swampTiles: [],
        terrain: Array.from({ length: 2500 }, () => 1),
      }),
    ]);

    expect(rejectedCandidates[0]?.rejectionReasons).toEqual(
      expect.arrayContaining([
        'room status is closed',
        'controller is owned by Enemy',
        'controller is reserved by EnemyReserve',
        'room has fewer than two sources',
      ]),
    );
    expect(rejectedCandidates[1]?.rejectionReasons).toContain('room has no controller');
    expect(rejectedCandidates[2]?.rejectionReasons).toContain(
      'no plain spawn tile can reach both sources and controller',
    );
  });

  it('formats risk warnings and rejected room summaries', async () => {
    const roomScoutModule = await loadRoomScoutModule();
    const rankedCandidates = roomScoutModule.rankStartingRoomCandidates([
      createRoomSnapshot({
        controller: { x: 24, y: 26 },
        extraObjects: [{ type: 'creep', x: 10, y: 10 }],
        mineral: null,
        neighborSnapshots: [
          {
            objects: [
              { owner: { username: 'Neighbor' }, type: 'controller', x: 25, y: 25 },
              { type: 'tower', x: 24, y: 24 },
              { type: 'spawn', x: 23, y: 24 },
              { type: 'creep', x: 22, y: 24 },
            ],
            roomName: 'W1S0',
            status: 'normal',
          },
          {
            objects: [
              {
                reservation: { user: '2' },
                type: 'controller',
                x: 25,
                y: 25,
              },
            ],
            roomName: 'W0S1',
            status: 'normal',
          },
        ],
        roomName: 'W1S1',
        sources: [
          { x: 12, y: 18 },
          { x: 18, y: 18 },
        ],
        swampTiles: [{ x: 15, y: 16 }],
      }),
      createRoomSnapshot({
        controller: { x: 24, y: 26 },
        roomName: 'W1S2',
        sources: [{ x: 12, y: 18 }],
        swampTiles: [],
      }),
    ]);
    const formattedReport = roomScoutModule.formatStartingRoomScoutReport({
      branch: 'main',
      candidateEvaluations: rankedCandidates,
      roomCount: rankedCandidates.length,
      shardName: 'shard3',
    });

    expect(formattedReport).toContain(
      'rank room status accepted sources score spawn sourceDistances controller open5x5 localSwamps7x7 swamp wall risk riskDetails mineral reasons',
    );
    expect(formattedReport).toContain('1 creeps currently in room');
    expect(formattedReport).toContain('candidateCreeps=1');
    expect(formattedReport).toContain('1 owned neighboring rooms');
    expect(formattedReport).toContain('1 reserved neighboring rooms');
    expect(formattedReport).toContain('1 neighboring creeps');
    expect(formattedReport).toContain('1 neighboring spawns');
    expect(formattedReport).toContain('1 neighboring towers');
    expect(formattedReport).toContain('neighborSpawns=1');
    expect(formattedReport).toContain('Rejected:');
    expect(formattedReport).toContain('- W1S2: room has fewer than two sources');
  });

  it('rejects malformed scout inputs at the command boundary', async () => {
    const roomScoutModule = await loadRoomScoutModule();

    expect(() => roomScoutModule.rankStartingRoomCandidates([])).toThrow(
      'At least one room snapshot is required.',
    );
    expect(() => roomScoutModule.decodeTerrainString('0')).toThrow(
      'Room terrain must be a 2500-character string.',
    );
    expect(() => roomScoutModule.decodeTerrainString('x'.repeat(2500))).toThrow(
      'Room terrain contains an invalid terrain mask.',
    );
    expect(() => roomScoutModule.parseRoomScoutRequest(['--bad'])).toThrow(
      'Unknown argument "--bad".',
    );
    expect(() => roomScoutModule.parseRoomScoutRequest(['--shard'])).toThrow(
      'Missing value after --shard.',
    );
    expect(() => roomScoutModule.parseRoomScoutRequest(['--shard', 'shard3'])).toThrow(
      'Provide at least one --room <name> or --area <corner>:<corner>.',
    );
    expect(() =>
      roomScoutModule.parseRoomScoutRequest(['--shard', 'shard3', '--area', 'W1S1']),
    ).toThrow('Room area must use <corner>:<corner>, for example W10S20:W19S29.');
    expect(() => roomScoutModule.getCardinalNeighborRoomNames('bad-room')).toThrow(
      'Invalid room name "bad-room".',
    );
  });
});

const createRoomSnapshot = (candidateShape: {
  readonly controller: RoomCoordinate;
  readonly controllerOwner?: string | { readonly username: string };
  readonly controllerReservation?: { readonly user?: string; readonly username?: string };
  readonly extraObjects?: readonly ScoutRoomObject[];
  readonly mineral?: { readonly mineralType: string } | null;
  readonly neighborSnapshots?: readonly NeighborRoomSnapshot[];
  readonly roomName: string;
  readonly sources: readonly RoomCoordinate[];
  readonly status?: string;
  readonly swampTiles: readonly RoomCoordinate[];
  readonly terrain?: readonly number[];
}): ScoutRoomSnapshot => ({
  neighborSnapshots: candidateShape.neighborSnapshots ?? [],
  objects: [
    ...candidateShape.sources.map((sourcePosition) => ({
      type: 'source',
      x: sourcePosition.x,
      y: sourcePosition.y,
    })),
    {
      ...(candidateShape.controllerOwner === undefined
        ? {}
        : { owner: candidateShape.controllerOwner }),
      ...(candidateShape.controllerReservation === undefined
        ? {}
        : { reservation: candidateShape.controllerReservation }),
      type: 'controller',
      x: candidateShape.controller.x,
      y: candidateShape.controller.y,
    },
    ...(candidateShape.mineral === null
      ? []
      : [
          {
            mineralType: candidateShape.mineral?.mineralType ?? 'K',
            type: 'mineral',
            x: 30,
            y: 30,
          },
        ]),
    ...(candidateShape.extraObjects ?? []),
  ],
  roomName: candidateShape.roomName,
  status: candidateShape.status ?? 'normal',
  terrain: candidateShape.terrain ?? createTerrain(candidateShape.swampTiles),
});

const createTerrain = (swampTiles: readonly RoomCoordinate[]) => {
  const terrainTiles = Array.from({ length: 2500 }, () => 0);

  for (const swampTile of swampTiles) {
    terrainTiles[swampTile.y * 50 + swampTile.x] = 2;
  }

  return terrainTiles;
};

const createSwampBlock = (swampBlock: {
  readonly bottomRight: RoomCoordinate;
  readonly topLeft: RoomCoordinate;
}) => {
  const swampTiles: RoomCoordinate[] = [];

  for (let y = swampBlock.topLeft.y; y <= swampBlock.bottomRight.y; y += 1) {
    for (let x = swampBlock.topLeft.x; x <= swampBlock.bottomRight.x; x += 1) {
      swampTiles.push({ x, y });
    }
  }

  return swampTiles;
};
