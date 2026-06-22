import { describe, expect, it } from 'vitest';

import {
  analyzeRefillAdjacency,
  analyzeRoadConnectivity,
  collectLayoutStampPlacementIssues,
  compareLayoutStampCandidateScores,
  reflectLayoutStamp,
  rotateLayoutStamp,
  scoreLayoutStampCandidate,
  transformLayoutStamp,
  translateLayoutStamp,
  validateLayoutStamp,
  type LayoutStamp,
  type LayoutStampCellType,
  type LayoutTerrainTile,
} from '../../../src/construction/layout-stamp';

const createTerrainPatch = ({
  maxX,
  maxY,
  minX,
  minY,
  walls = [],
}: {
  readonly maxX: number;
  readonly maxY: number;
  readonly minX: number;
  readonly minY: number;
  readonly walls?: readonly { readonly x: number; readonly y: number }[];
}): readonly LayoutTerrainTile[] => {
  const wallKeys = new Set(walls.map((wall) => `${wall.x}:${wall.y}`));
  const terrain: LayoutTerrainTile[] = [];

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      terrain.push({
        terrain: wallKeys.has(`${x}:${y}`) ? 'wall' : 'plain',
        x,
        y,
      });
    }
  }

  return terrain;
};

const diagonalRoadLatticeStamp: LayoutStamp = {
  name: 'diagonal-road-lattice',
  cells: [
    { type: 'core', x: -1, y: -1 },
    { type: 'road', x: 0, y: 0 },
    { type: 'road', x: 1, y: 1 },
    { type: 'road', x: 2, y: 2 },
    { type: 'road', x: 3, y: 3 },
    { type: 'extension', x: 1, y: 0 },
    { type: 'extension', x: 0, y: 1 },
    { type: 'extension', x: 2, y: 1 },
    { type: 'extension', x: 1, y: 2 },
    { type: 'extension', x: 3, y: 2 },
    { type: 'extension', x: 2, y: 3 },
    { type: 'reserved', x: 0, y: -1 },
    { type: 'reserved', x: -1, y: 0 },
    { type: 'exit', x: 4, y: 3 },
    { type: 'exit', x: 3, y: 4 },
  ],
};

const tieBreakCapacityStamp: LayoutStamp = {
  cells: [
    { type: 'core', x: -1, y: 0 },
    { type: 'road', x: 0, y: 0 },
    { type: 'road', x: 1, y: 0 },
    { type: 'exit', x: 2, y: 0 },
    { type: 'extension', x: 0, y: 1 },
    { type: 'extension', x: 2, y: 1 },
  ],
};

const tieBreakOpenDiagonalStamp: LayoutStamp = {
  cells: [
    { type: 'core', x: -1, y: 0 },
    { type: 'road', x: 0, y: 0 },
    { type: 'road', x: 1, y: 0 },
    { type: 'exit', x: 2, y: 0 },
    { type: 'extension', x: 0, y: 1 },
    { type: 'reserved', x: 2, y: 1 },
  ],
};

describe('layout stamp primitives', () => {
  it('rotates, reflects, and translates stamps with deterministic coordinates', () => {
    const baseStamp: LayoutStamp = {
      cells: [
        { type: 'core', x: 0, y: 0 },
        { type: 'road', x: 1, y: 0 },
        { type: 'extension', x: 1, y: 1 },
        { type: 'reserved', x: 0, y: 1 },
      ],
    };

    expect(rotateLayoutStamp(baseStamp, 90)).toEqual({
      cells: [
        { type: 'core', x: 0, y: 0 },
        { type: 'road', x: 0, y: 1 },
        { type: 'extension', x: -1, y: 1 },
        { type: 'reserved', x: -1, y: 0 },
      ],
      name: undefined,
    });
    expect(reflectLayoutStamp(baseStamp, 'y')).toEqual({
      cells: [
        { type: 'core', x: 0, y: 0 },
        { type: 'road', x: -1, y: 0 },
        { type: 'extension', x: -1, y: 1 },
        { type: 'reserved', x: 0, y: 1 },
      ],
      name: undefined,
    });
    expect(translateLayoutStamp(baseStamp, { x: 10, y: 20 })).toEqual({
      cells: [
        { type: 'core', x: 10, y: 20 },
        { type: 'road', x: 11, y: 20 },
        { type: 'extension', x: 11, y: 21 },
        { type: 'reserved', x: 10, y: 21 },
      ],
      name: undefined,
    });
    expect(
      transformLayoutStamp(baseStamp, {
        offset: { x: 10, y: 20 },
        reflection: 'y',
        rotation: 90,
      }),
    ).toEqual({
      cells: [
        { type: 'core', x: 10, y: 20 },
        { type: 'road', x: 10, y: 19 },
        { type: 'extension', x: 9, y: 19 },
        { type: 'reserved', x: 9, y: 20 },
      ],
      name: undefined,
    });
  });

  it('validates invalid coordinates and cell types before placement checks', () => {
    const invalidStamp: LayoutStamp = {
      cells: [
        { type: 'road', x: Number.NaN, y: 0 },
        { type: 'portal' as unknown as LayoutStampCellType, x: 1, y: 1 },
        { type: 'road', x: 2, y: 2 },
        { type: 'extension', x: 2, y: 2 },
      ],
    };

    expect(validateLayoutStamp(invalidStamp).map((issue) => issue.kind)).toEqual([
      'invalid-coordinate',
      'invalid-cell-type',
      'duplicate-cell',
    ]);
  });

  it('detects terrain, blocked, structure, and invalid terrain placement conflicts', () => {
    const issues = collectLayoutStampPlacementIssues(
      {
        cells: [
          { type: 'road', x: 0, y: 0 },
          { type: 'extension', x: 1, y: 1 },
          { type: 'reserved', x: 2, y: 2 },
        ],
      },
      {
        blockedPositions: [{ x: 0, y: 0 }],
        existingStructures: [{ structureType: 'tower', x: 2, y: 2 }],
        terrain: [
          ...createTerrainPatch({ maxX: 2, maxY: 2, minX: 0, minY: 0, walls: [{ x: 1, y: 1 }] }),
          { terrain: 'lava', x: 3, y: 3 },
        ],
      },
    );

    expect(issues.map((issue) => issue.kind)).toEqual([
      'invalid-terrain',
      'blocked-collision',
      'terrain-collision',
      'structure-conflict',
    ]);
  });

  it('treats diagonal road lattices as connected and flags detached road islands', () => {
    expect(analyzeRoadConnectivity(diagonalRoadLatticeStamp)).toEqual({
      connectedRoadCount: 4,
      deadEndCount: 0,
      disconnectedRoadPositions: [],
      isConnected: true,
      issues: [],
      roadCount: 4,
    });

    expect(
      analyzeRoadConnectivity({
        cells: [...diagonalRoadLatticeStamp.cells, { type: 'road', x: 8, y: 8 }],
      }),
    ).toEqual({
      connectedRoadCount: 4,
      deadEndCount: 1,
      disconnectedRoadPositions: [{ x: 8, y: 8 }],
      isConnected: false,
      issues: [],
      roadCount: 5,
    });
  });

  it('measures refill adjacency on the diagonal lattice and catches shortfalls', () => {
    const openAnalysis = analyzeRefillAdjacency(diagonalRoadLatticeStamp, {
      minimumRefillAccess: 2,
      terrain: createTerrainPatch({ maxX: 5, maxY: 5, minX: -2, minY: -2 }),
    });

    expect(openAnalysis.allTargetsAdjacentToRoad).toBe(true);
    expect(openAnalysis.allTargetsMeetMinimumAccess).toBe(true);
    expect(openAnalysis.targets.every((target) => target.accessibleAdjacentCount >= 2)).toBe(true);

    expect(
      analyzeRefillAdjacency(
        {
          cells: [
            { type: 'road', x: 0, y: 0 },
            { type: 'extension', x: 1, y: 1 },
          ],
        },
        {
          minimumRefillAccess: 2,
          terrain: createTerrainPatch({
            maxX: 2,
            maxY: 2,
            minX: 0,
            minY: 0,
            walls: [
              { x: 0, y: 1 },
              { x: 0, y: 2 },
              { x: 1, y: 0 },
              { x: 1, y: 2 },
              { x: 2, y: 0 },
              { x: 2, y: 1 },
              { x: 2, y: 2 },
            ],
          }),
        },
      ),
    ).toEqual({
      allTargetsAdjacentToRoad: true,
      allTargetsMeetMinimumAccess: false,
      issues: [],
      minimumAccess: 2,
      targets: [
        {
          accessibleAdjacentCount: 1,
          adjacentRoadCount: 1,
          meetsMinimumAccess: false,
          position: { x: 1, y: 1 },
          type: 'extension',
        },
      ],
    });
  });

  it('explains scores and uses extension capacity as a tie-break ahead of extra open diagonals', () => {
    const terrain = createTerrainPatch({ maxX: 3, maxY: 2, minX: -2, minY: -1 });
    const capacityScore = scoreLayoutStampCandidate(tieBreakCapacityStamp, { terrain });
    const openDiagonalScore = scoreLayoutStampCandidate(tieBreakOpenDiagonalStamp, { terrain });

    expect(capacityScore.score).toBe(openDiagonalScore.score);
    expect(compareLayoutStampCandidateScores(capacityScore, openDiagonalScore)).toBeLessThan(0);
    expect(capacityScore.metrics.extensionCapacity).toBe(2);
    expect(openDiagonalScore.metrics.openDiagonalCount).toBe(2);
    expect(capacityScore.components).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          detail: '2 extension pockets available',
          key: 'extensionCapacity',
          value: 2,
        }),
        expect.objectContaining({
          key: 'openDiagonals',
        }),
      ]),
    );
  });
});
