import { describe, expect, it } from 'vitest';

import {
  planRoomConstruction,
  type ConstructionTerrainSnapshot,
  type ConstructionWorldSnapshot,
} from '../../../src/construction/construction-planner';

const TEST_CONTROLLER_STRUCTURE_LIMITS = {
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
} as const;

const planConstruction = (
  constructionWorld: Omit<ConstructionWorldSnapshot, 'controllerStructureLimits'> & {
    readonly controllerStructureLimits?: Partial<
      ConstructionWorldSnapshot['controllerStructureLimits']
    >;
  },
) => {
  const { controllerStructureLimits, ...constructionWorldWithoutLimits } = constructionWorld;
  const mergedControllerStructureLimits: ConstructionWorldSnapshot['controllerStructureLimits'] = {
    extension: {
      ...TEST_CONTROLLER_STRUCTURE_LIMITS.extension,
      ...(controllerStructureLimits?.extension ?? {}),
    },
    tower: {
      ...TEST_CONTROLLER_STRUCTURE_LIMITS.tower,
      ...(controllerStructureLimits?.tower ?? {}),
    },
  };

  return planRoomConstruction({
    controllerStructureLimits: mergedControllerStructureLimits,
    ...constructionWorldWithoutLimits,
  });
};

describe('room construction planner', () => {
  it('plans five RCL2 extension construction sites when none exist', () => {
    expect(
      planConstruction({
        ownedRooms: [
          {
            blockedPositions: [],
            constructionSites: [],
            controllerLevel: 2,
            roomName: 'W1N1',
            spawnPosition: { x: 10, y: 10 },
            structures: [
              {
                structureType: 'spawn',
                x: 10,
                y: 10,
              },
            ],
            terrain: openTerrainAroundSpawn10,
          },
        ],
      }),
    ).toEqual([
      {
        roomName: 'W1N1',
        structureType: 'extension',
        type: 'createConstructionSite',
        x: 9,
        y: 9,
      },
      {
        roomName: 'W1N1',
        structureType: 'extension',
        type: 'createConstructionSite',
        x: 10,
        y: 9,
      },
      {
        roomName: 'W1N1',
        structureType: 'extension',
        type: 'createConstructionSite',
        x: 11,
        y: 9,
      },
      {
        roomName: 'W1N1',
        structureType: 'extension',
        type: 'createConstructionSite',
        x: 9,
        y: 10,
      },
      {
        roomName: 'W1N1',
        structureType: 'extension',
        type: 'createConstructionSite',
        x: 11,
        y: 10,
      },
    ]);
  });

  it('uses captured controller structure limits for extension site count', () => {
    expect(
      planConstruction({
        controllerStructureLimits: {
          extension: {
            2: 2,
          },
        },
        ownedRooms: [
          {
            blockedPositions: [],
            constructionSites: [],
            controllerLevel: 2,
            roomName: 'W1N1',
            spawnPosition: { x: 10, y: 10 },
            structures: [
              {
                structureType: 'spawn',
                x: 10,
                y: 10,
              },
            ],
            terrain: openTerrainAroundSpawn10,
          },
        ],
      }),
    ).toEqual([
      {
        roomName: 'W1N1',
        structureType: 'extension',
        type: 'createConstructionSite',
        x: 9,
        y: 9,
      },
      {
        roomName: 'W1N1',
        structureType: 'extension',
        type: 'createConstructionSite',
        x: 10,
        y: 9,
      },
    ]);
  });

  it('counts existing extension structures and extension construction sites toward the RCL2 limit', () => {
    expect(
      planConstruction({
        ownedRooms: [
          {
            blockedPositions: [],
            constructionSites: [
              {
                structureType: 'extension',
                x: 10,
                y: 9,
              },
            ],
            controllerLevel: 2,
            roomName: 'W1N1',
            spawnPosition: { x: 10, y: 10 },
            structures: [
              {
                structureType: 'spawn',
                x: 10,
                y: 10,
              },
              {
                structureType: 'extension',
                x: 9,
                y: 9,
              },
            ],
            terrain: openTerrainAroundSpawn10,
          },
        ],
      }),
    ).toEqual([
      {
        roomName: 'W1N1',
        structureType: 'extension',
        type: 'createConstructionSite',
        x: 11,
        y: 9,
      },
      {
        roomName: 'W1N1',
        structureType: 'extension',
        type: 'createConstructionSite',
        x: 9,
        y: 10,
      },
      {
        roomName: 'W1N1',
        structureType: 'extension',
        type: 'createConstructionSite',
        x: 11,
        y: 10,
      },
    ]);
  });

  it('skips wall, source, controller, spawn, structure, and construction site positions', () => {
    expect(
      planConstruction({
        ownedRooms: [
          {
            blockedPositions: [
              { x: 10, y: 9 },
              { x: 11, y: 9 },
            ],
            constructionSites: [
              {
                structureType: 'road',
                x: 11,
                y: 10,
              },
            ],
            controllerLevel: 2,
            roomName: 'W1N1',
            spawnPosition: { x: 10, y: 10 },
            structures: [
              {
                structureType: 'spawn',
                x: 10,
                y: 10,
              },
              {
                structureType: 'road',
                x: 9,
                y: 10,
              },
            ],
            terrain: [
              { terrain: 'wall', x: 9, y: 9 },
              ...openTerrainAroundSpawn10.filter(
                (terrainTile) => terrainTile.x !== 9 || terrainTile.y !== 9,
              ),
            ],
          },
        ],
      }),
    ).toEqual([
      {
        roomName: 'W1N1',
        structureType: 'extension',
        type: 'createConstructionSite',
        x: 9,
        y: 11,
      },
      {
        roomName: 'W1N1',
        structureType: 'extension',
        type: 'createConstructionSite',
        x: 10,
        y: 11,
      },
      {
        roomName: 'W1N1',
        structureType: 'extension',
        type: 'createConstructionSite',
        x: 11,
        y: 11,
      },
      {
        roomName: 'W1N1',
        structureType: 'extension',
        type: 'createConstructionSite',
        x: 8,
        y: 8,
      },
      {
        roomName: 'W1N1',
        structureType: 'extension',
        type: 'createConstructionSite',
        x: 9,
        y: 8,
      },
    ]);
  });

  it('does not plan extensions before RCL2', () => {
    expect(planConstruction(rcl1ConstructionWorld)).toEqual([]);
  });

  it('uses captured RCL3 extension limits before planning the first tower', () => {
    expect(
      planConstruction({
        controllerStructureLimits: {
          extension: {
            3: 6,
          },
        },
        ownedRooms: [
          {
            blockedPositions: [],
            constructionSites: [],
            controllerLevel: 3,
            controllerPosition: { x: 10, y: 14 },
            roomName: 'W1N1',
            spawnPosition: { x: 10, y: 10 },
            structures: [
              {
                structureType: 'spawn',
                x: 10,
                y: 10,
              },
              {
                structureType: 'extension',
                x: 9,
                y: 9,
              },
              {
                structureType: 'extension',
                x: 10,
                y: 9,
              },
              {
                structureType: 'extension',
                x: 11,
                y: 9,
              },
              {
                structureType: 'extension',
                x: 9,
                y: 10,
              },
              {
                structureType: 'extension',
                x: 11,
                y: 10,
              },
            ],
            terrain: openTerrainAroundSpawn10,
          },
        ],
      }),
    ).toEqual([
      {
        roomName: 'W1N1',
        structureType: 'extension',
        type: 'createConstructionSite',
        x: 9,
        y: 11,
      },
    ]);
  });

  it('plans one RCL3 tower near the spawn-controller core when extensions are built', () => {
    expect(
      planConstruction({
        controllerStructureLimits: {
          extension: {
            3: 5,
          },
        },
        ownedRooms: [
          {
            blockedPositions: [],
            constructionSites: [],
            controllerLevel: 3,
            controllerPosition: { x: 10, y: 14 },
            roomName: 'W1N1',
            spawnPosition: { x: 10, y: 10 },
            structures: [
              {
                structureType: 'spawn',
                x: 10,
                y: 10,
              },
              {
                structureType: 'extension',
                x: 9,
                y: 9,
              },
              {
                structureType: 'extension',
                x: 10,
                y: 9,
              },
              {
                structureType: 'extension',
                x: 11,
                y: 9,
              },
              {
                structureType: 'extension',
                x: 9,
                y: 10,
              },
              {
                structureType: 'extension',
                x: 11,
                y: 10,
              },
            ],
            terrain: openTerrainAroundSpawn10,
          },
        ],
      }),
    ).toEqual([
      {
        roomName: 'W1N1',
        structureType: 'tower',
        type: 'createConstructionSite',
        x: 10,
        y: 11,
      },
    ]);
  });

  it('counts existing tower structures and construction sites toward the RCL3 tower limit', () => {
    expect(
      planConstruction({
        controllerStructureLimits: {
          extension: {
            3: 5,
          },
        },
        ownedRooms: [
          {
            blockedPositions: [],
            constructionSites: [],
            controllerLevel: 3,
            controllerPosition: { x: 10, y: 14 },
            roomName: 'W1N1',
            spawnPosition: { x: 10, y: 10 },
            structures: [
              {
                structureType: 'spawn',
                x: 10,
                y: 10,
              },
              {
                structureType: 'tower',
                x: 10,
                y: 11,
              },
              {
                structureType: 'extension',
                x: 9,
                y: 9,
              },
              {
                structureType: 'extension',
                x: 10,
                y: 9,
              },
              {
                structureType: 'extension',
                x: 11,
                y: 9,
              },
              {
                structureType: 'extension',
                x: 9,
                y: 10,
              },
              {
                structureType: 'extension',
                x: 11,
                y: 10,
              },
            ],
            terrain: openTerrainAroundSpawn10,
          },
          {
            blockedPositions: [],
            constructionSites: [
              {
                structureType: 'tower',
                x: 10,
                y: 11,
              },
            ],
            controllerLevel: 3,
            controllerPosition: { x: 10, y: 14 },
            roomName: 'W2N2',
            spawnPosition: { x: 10, y: 10 },
            structures: [
              {
                structureType: 'spawn',
                x: 10,
                y: 10,
              },
              {
                structureType: 'extension',
                x: 9,
                y: 9,
              },
              {
                structureType: 'extension',
                x: 10,
                y: 9,
              },
              {
                structureType: 'extension',
                x: 11,
                y: 9,
              },
              {
                structureType: 'extension',
                x: 9,
                y: 10,
              },
              {
                structureType: 'extension',
                x: 11,
                y: 10,
              },
            ],
            terrain: openTerrainAroundSpawn10,
          },
        ],
      }),
    ).toEqual([]);
  });

  it('plans source and controller containers with minimal roads once extension buildout is satisfied', () => {
    expect(
      planConstruction({
        controllerStructureLimits: {
          extension: {
            2: 0,
          },
        },
        ownedRooms: [
          {
            blockedPositions: [
              { x: 6, y: 10 },
              { x: 10, y: 14 },
            ],
            constructionSites: [],
            controllerLevel: 2,
            controllerPosition: { x: 10, y: 14 },
            roomName: 'W1N1',
            sources: [
              {
                id: 'source-1',
                x: 6,
                y: 10,
              },
            ],
            spawnPosition: { x: 10, y: 10 },
            structures: [
              {
                structureType: 'spawn',
                x: 10,
                y: 10,
              },
            ],
            terrain: createPlainTerrainRectangle(5, 9, 11, 14),
          },
        ],
      }),
    ).toEqual([
      {
        roomName: 'W1N1',
        structureType: 'container',
        type: 'createConstructionSite',
        x: 7,
        y: 10,
      },
      {
        roomName: 'W1N1',
        structureType: 'container',
        type: 'createConstructionSite',
        x: 10,
        y: 13,
      },
      {
        roomName: 'W1N1',
        structureType: 'road',
        type: 'createConstructionSite',
        x: 8,
        y: 10,
      },
      {
        roomName: 'W1N1',
        structureType: 'road',
        type: 'createConstructionSite',
        x: 9,
        y: 10,
      },
    ]);
  });

  it('caps long logistics road plans after high-priority container anchors', () => {
    expect(
      planConstruction({
        controllerStructureLimits: {
          extension: {
            2: 0,
          },
        },
        ownedRooms: [
          {
            blockedPositions: [
              { x: 2, y: 10 },
              { x: 10, y: 18 },
            ],
            constructionSites: [],
            controllerLevel: 2,
            controllerPosition: { x: 10, y: 18 },
            roomName: 'W1N1',
            sources: [
              {
                id: 'source-1',
                x: 2,
                y: 10,
              },
            ],
            spawnPosition: { x: 10, y: 10 },
            structures: [
              {
                structureType: 'spawn',
                x: 10,
                y: 10,
              },
            ],
            terrain: createPlainTerrainRectangle(2, 9, 10, 18),
          },
        ],
      }),
    ).toEqual([
      {
        roomName: 'W1N1',
        structureType: 'container',
        type: 'createConstructionSite',
        x: 3,
        y: 10,
      },
      {
        roomName: 'W1N1',
        structureType: 'container',
        type: 'createConstructionSite',
        x: 10,
        y: 17,
      },
      {
        roomName: 'W1N1',
        structureType: 'road',
        type: 'createConstructionSite',
        x: 4,
        y: 10,
      },
      {
        roomName: 'W1N1',
        structureType: 'road',
        type: 'createConstructionSite',
        x: 5,
        y: 10,
      },
    ]);
  });

  it('continues a source route frontier after existing source-side road sites', () => {
    expect(
      planConstruction({
        controllerStructureLimits: {
          extension: {
            2: 0,
          },
        },
        ownedRooms: [
          {
            blockedPositions: [{ x: 2, y: 10 }],
            constructionSites: [{ structureType: 'road', x: 4, y: 10 }],
            controllerLevel: 2,
            roomName: 'W1N1',
            sources: [
              {
                id: 'source-1',
                x: 2,
                y: 10,
              },
            ],
            spawnPosition: { x: 10, y: 10 },
            structures: [
              {
                structureType: 'container',
                x: 3,
                y: 10,
              },
              {
                structureType: 'spawn',
                x: 10,
                y: 10,
              },
            ],
            terrain: createPlainTerrainRectangle(2, 9, 10, 10),
          },
        ],
      }),
    ).toEqual([
      {
        roomName: 'W1N1',
        structureType: 'road',
        type: 'createConstructionSite',
        x: 5,
        y: 10,
      },
      {
        roomName: 'W1N1',
        structureType: 'road',
        type: 'createConstructionSite',
        x: 6,
        y: 10,
      },
    ]);
  });

  it('suppresses low-priority roads when the room already has a large active site backlog', () => {
    expect(
      planConstruction({
        controllerStructureLimits: {
          extension: {
            2: 0,
          },
        },
        ownedRooms: [
          {
            blockedPositions: [
              { x: 2, y: 10 },
              { x: 10, y: 18 },
            ],
            constructionSites: [
              { structureType: 'road', x: 20, y: 20 },
              { structureType: 'road', x: 21, y: 20 },
              { structureType: 'road', x: 22, y: 20 },
              { structureType: 'road', x: 23, y: 20 },
              { structureType: 'road', x: 24, y: 20 },
              { structureType: 'road', x: 25, y: 20 },
              { structureType: 'road', x: 26, y: 20 },
              { structureType: 'road', x: 27, y: 20 },
              { structureType: 'road', x: 28, y: 20 },
              { structureType: 'road', x: 29, y: 20 },
            ],
            controllerLevel: 2,
            controllerPosition: { x: 10, y: 18 },
            roomName: 'W1N1',
            sources: [
              {
                id: 'source-1',
                x: 2,
                y: 10,
              },
            ],
            spawnPosition: { x: 10, y: 10 },
            structures: [
              {
                structureType: 'spawn',
                x: 10,
                y: 10,
              },
            ],
            terrain: createPlainTerrainRectangle(2, 9, 10, 20),
          },
        ],
      }),
    ).toEqual([
      {
        roomName: 'W1N1',
        structureType: 'container',
        type: 'createConstructionSite',
        x: 3,
        y: 10,
      },
      {
        roomName: 'W1N1',
        structureType: 'container',
        type: 'createConstructionSite',
        x: 10,
        y: 17,
      },
    ]);
  });

  it('still plans missing extensions when active road backlog is above the road throttle', () => {
    expect(
      planConstruction({
        ownedRooms: [
          {
            blockedPositions: [],
            constructionSites: [
              { structureType: 'road', x: 20, y: 20 },
              { structureType: 'road', x: 21, y: 20 },
              { structureType: 'road', x: 22, y: 20 },
              { structureType: 'road', x: 23, y: 20 },
              { structureType: 'road', x: 24, y: 20 },
              { structureType: 'road', x: 25, y: 20 },
              { structureType: 'road', x: 26, y: 20 },
              { structureType: 'road', x: 27, y: 20 },
              { structureType: 'road', x: 28, y: 20 },
              { structureType: 'road', x: 29, y: 20 },
            ],
            controllerLevel: 2,
            roomName: 'W1N1',
            spawnPosition: { x: 10, y: 10 },
            structures: [
              {
                structureType: 'spawn',
                x: 10,
                y: 10,
              },
            ],
            terrain: openTerrainAroundSpawn10,
          },
        ],
      }),
    ).toEqual([
      {
        roomName: 'W1N1',
        structureType: 'extension',
        type: 'createConstructionSite',
        x: 9,
        y: 9,
      },
      {
        roomName: 'W1N1',
        structureType: 'extension',
        type: 'createConstructionSite',
        x: 10,
        y: 9,
      },
      {
        roomName: 'W1N1',
        structureType: 'extension',
        type: 'createConstructionSite',
        x: 11,
        y: 9,
      },
      {
        roomName: 'W1N1',
        structureType: 'extension',
        type: 'createConstructionSite',
        x: 9,
        y: 10,
      },
      {
        roomName: 'W1N1',
        structureType: 'extension',
        type: 'createConstructionSite',
        x: 11,
        y: 10,
      },
    ]);
  });

  it('skips blocked adjacent tiles when choosing a source container candidate', () => {
    expect(
      planConstruction({
        controllerStructureLimits: {
          extension: {
            2: 0,
          },
        },
        ownedRooms: [
          {
            blockedPositions: [{ x: 12, y: 10 }],
            constructionSites: [
              {
                structureType: 'road',
                x: 11,
                y: 10,
              },
            ],
            controllerLevel: 2,
            roomName: 'W1N1',
            sources: [
              {
                id: 'source-1',
                x: 12,
                y: 10,
              },
            ],
            spawnPosition: { x: 10, y: 10 },
            structures: [
              {
                structureType: 'spawn',
                x: 10,
                y: 10,
              },
            ],
            terrain: [
              { terrain: 'wall', x: 11, y: 9 },
              ...createPlainTerrainRectangle(11, 9, 13, 11).filter(
                (terrainTile) => terrainTile.x !== 11 || terrainTile.y !== 9,
              ),
            ],
          },
        ],
      }),
    ).toEqual([
      {
        roomName: 'W1N1',
        structureType: 'container',
        type: 'createConstructionSite',
        x: 11,
        y: 11,
      },
    ]);
  });

  it('uses an existing source-adjacent container as the road anchor', () => {
    expect(
      planConstruction({
        controllerStructureLimits: {
          extension: {
            2: 0,
          },
        },
        ownedRooms: [
          {
            blockedPositions: [{ x: 6, y: 10 }],
            constructionSites: [],
            controllerLevel: 2,
            roomName: 'W1N1',
            sources: [
              {
                id: 'source-1',
                x: 6,
                y: 10,
              },
            ],
            spawnPosition: { x: 10, y: 10 },
            structures: [
              {
                structureType: 'spawn',
                x: 10,
                y: 10,
              },
              {
                structureType: 'container',
                x: 7,
                y: 10,
              },
            ],
            terrain: createPlainTerrainRectangle(6, 9, 10, 10),
          },
        ],
      }),
    ).toEqual([
      {
        roomName: 'W1N1',
        structureType: 'road',
        type: 'createConstructionSite',
        x: 8,
        y: 10,
      },
      {
        roomName: 'W1N1',
        structureType: 'road',
        type: 'createConstructionSite',
        x: 9,
        y: 10,
      },
    ]);
  });
});

const openTerrainAroundSpawn10: readonly ConstructionTerrainSnapshot[] = [
  { terrain: 'plain', x: 9, y: 9 },
  { terrain: 'plain', x: 10, y: 9 },
  { terrain: 'plain', x: 11, y: 9 },
  { terrain: 'plain', x: 9, y: 10 },
  { terrain: 'plain', x: 11, y: 10 },
  { terrain: 'plain', x: 9, y: 11 },
  { terrain: 'plain', x: 10, y: 11 },
  { terrain: 'plain', x: 11, y: 11 },
  { terrain: 'plain', x: 8, y: 8 },
  { terrain: 'plain', x: 9, y: 8 },
  { terrain: 'plain', x: 10, y: 8 },
  { terrain: 'plain', x: 11, y: 8 },
  { terrain: 'plain', x: 12, y: 8 },
  { terrain: 'plain', x: 8, y: 9 },
  { terrain: 'plain', x: 12, y: 9 },
  { terrain: 'plain', x: 8, y: 10 },
  { terrain: 'plain', x: 12, y: 10 },
  { terrain: 'plain', x: 8, y: 11 },
  { terrain: 'plain', x: 12, y: 11 },
  { terrain: 'plain', x: 8, y: 12 },
  { terrain: 'plain', x: 9, y: 12 },
  { terrain: 'plain', x: 10, y: 12 },
  { terrain: 'plain', x: 11, y: 12 },
  { terrain: 'plain', x: 12, y: 12 },
];

const rcl1ConstructionWorld: Omit<ConstructionWorldSnapshot, 'controllerStructureLimits'> = {
  ownedRooms: [
    {
      blockedPositions: [
        { x: 12, y: 10 },
        { x: 13, y: 10 },
      ],
      constructionSites: [],
      controllerLevel: 1,
      controllerPosition: { x: 13, y: 10 },
      roomName: 'W1N1',
      sources: [
        {
          id: 'source-1',
          x: 12,
          y: 10,
        },
      ],
      spawnPosition: { x: 10, y: 10 },
      structures: [
        {
          structureType: 'spawn',
          x: 10,
          y: 10,
        },
      ],
      terrain: openTerrainAroundSpawn10,
    },
  ],
};

const createPlainTerrainRectangle = (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): readonly ConstructionTerrainSnapshot[] => {
  const terrainSnapshots: ConstructionTerrainSnapshot[] = [];

  for (let y = startY; y <= endY; y += 1) {
    for (let x = startX; x <= endX; x += 1) {
      terrainSnapshots.push({
        terrain: 'plain',
        x,
        y,
      });
    }
  }

  return terrainSnapshots;
};
