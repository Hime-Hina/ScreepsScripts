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
    4: 20,
  },
  storage: {
    1: 0,
    2: 0,
    3: 0,
    4: 1,
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
    storage: {
      ...TEST_CONTROLLER_STRUCTURE_LIMITS.storage,
      ...(controllerStructureLimits?.storage ?? {}),
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
        x: 10,
        y: 8,
      },
    ]);
  });

  it('does not plan extensions before RCL2', () => {
    expect(planConstruction(rcl1ConstructionWorld)).toEqual([]);
  });

  it('preserves the last adjacent refill tile when placing near-spawn extensions', () => {
    expect(
      planConstruction({
        controllerStructureLimits: {
          extension: {
            2: 2,
          },
        },
        ownedRooms: [createNearSpawnLastAccessRoom(2)],
      }),
    ).toEqual([
      {
        roomName: 'W1N1',
        structureType: 'extension',
        type: 'createConstructionSite',
        x: 8,
        y: 9,
      },
    ]);
  });

  it('preserves refill access across multiple extension sites planned in one tick', () => {
    expect(
      planConstruction({
        controllerStructureLimits: {
          extension: {
            2: 3,
          },
        },
        ownedRooms: [createNearSpawnTwoAccessRoom()],
      }),
    ).toEqual([
      {
        roomName: 'W1N1',
        structureType: 'extension',
        type: 'createConstructionSite',
        x: 12,
        y: 8,
      },
      {
        roomName: 'W1N1',
        structureType: 'extension',
        type: 'createConstructionSite',
        x: 8,
        y: 9,
      },
    ]);
  });

  it('preserves the last adjacent refill tile when placing the first tower', () => {
    const towerDecisions = planConstruction({
      controllerStructureLimits: {
        extension: {
          3: 1,
        },
      },
      ownedRooms: [createNearSpawnLastAccessRoom(3)],
    });

    expect(towerDecisions).toHaveLength(1);
    expect(towerDecisions[0]).toMatchObject({
      roomName: 'W1N1',
      structureType: 'tower',
      type: 'createConstructionSite',
    });
    expect(towerDecisions[0]).not.toMatchObject({ x: 9, y: 8 });
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

  it('does not prepare road search when road backlog suppresses low-priority roads', () => {
    const accessLimitedContainer = createAccessLimitedStructure('container', 3, 10, 6);

    expect(
      planConstruction({
        controllerStructureLimits: {
          extension: {
            2: 0,
          },
        },
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
              accessLimitedContainer.structure,
            ],
            terrain: [],
          },
        ],
      }),
    ).toEqual([]);
    expect(accessLimitedContainer.getAccessCount()).toBeLessThanOrEqual(6);
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

  it('does not plan storage before RCL4', () => {
    const decisions = planConstruction({
      controllerStructureLimits: {
        extension: {
          3: 0,
        },
      },
      ownedRooms: [
        {
          blockedPositions: [],
          constructionSites: [],
          controllerLevel: 3,
          controllerPosition: { x: 14, y: 10 },
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
              x: 9,
              y: 9,
            },
          ],
          terrain: createPlainTerrainRectangle(8, 8, 14, 12),
        },
      ],
    });

    expect(decisions.some((decision) => decision.structureType === 'storage')).toBe(false);
  });

  it('plans an accessible RCL4 storage site before low-priority logistics roads', () => {
    expect(
      planConstruction({
        controllerStructureLimits: {
          extension: {
            4: 10,
          },
        },
        ownedRooms: [
          {
            blockedPositions: [],
            constructionSites: [],
            controllerLevel: 4,
            controllerPosition: { x: 14, y: 10 },
            roomName: 'W1N1',
            sources: [
              {
                id: 'source-1',
                x: 16,
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
                structureType: 'tower',
                x: 9,
                y: 9,
              },
              ...createExtensionStructuresAroundSpawn10(),
            ],
            terrain: createPlainTerrainRectangle(8, 8, 16, 12),
          },
        ],
      }),
    ).toEqual([
      {
        roomName: 'W1N1',
        structureType: 'storage',
        type: 'createConstructionSite',
        x: 13,
        y: 10,
      },
    ]);
  });

  it('does not place RCL4 storage where it reduces extension refill access to one tile', () => {
    const decisions = planConstruction({
      controllerStructureLimits: {
        extension: {
          4: 1,
        },
      },
      ownedRooms: [
        {
          blockedPositions: [
            { x: 10, y: 9 },
            { x: 10, y: 11 },
            { x: 11, y: 9 },
            { x: 11, y: 11 },
            { x: 12, y: 11 },
          ],
          constructionSites: [],
          controllerLevel: 4,
          controllerPosition: { x: 14, y: 10 },
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
              x: 11,
              y: 10,
            },
          ],
          terrain: createPlainTerrainRectangle(8, 8, 14, 12),
        },
      ],
    });

    expect(decisions).toHaveLength(1);
    expect(decisions[0]).toMatchObject({ structureType: 'storage' });
    expect(decisions[0]).not.toMatchObject({ x: 12, y: 10 });
  });

  it('caps RCL4 extension expansion to a small staged frontier', () => {
    const decisions = planConstruction({
      ownedRooms: [
        {
          blockedPositions: [],
          constructionSites: [],
          controllerLevel: 4,
          controllerPosition: { x: 14, y: 10 },
          roomName: 'W1N1',
          spawnPosition: { x: 10, y: 10 },
          structures: [
            {
              structureType: 'spawn',
              x: 10,
              y: 10,
            },
            {
              structureType: 'storage',
              x: 12,
              y: 10,
            },
            {
              structureType: 'tower',
              x: 9,
              y: 9,
            },
            ...createExtensionStructuresAroundSpawn10(),
          ],
          terrain: createPlainTerrainRectangle(4, 4, 16, 16),
        },
      ],
    });

    const extensionDecisions = decisions.filter(
      (decision) => decision.structureType === 'extension',
    );

    expect(extensionDecisions).toHaveLength(5);
    expect(
      decisions.every(
        (decision) => decision.structureType === 'extension' || decision.structureType === 'road',
      ),
    ).toBe(true);
  });

  it('interleaves RCL4 extension expansion with road access lanes', () => {
    const decisions = planConstruction({
      ownedRooms: [
        {
          blockedPositions: [],
          constructionSites: [],
          controllerLevel: 4,
          controllerPosition: { x: 14, y: 10 },
          roomName: 'W1N1',
          spawnPosition: { x: 10, y: 10 },
          structures: [
            {
              structureType: 'spawn',
              x: 10,
              y: 10,
            },
            {
              structureType: 'storage',
              x: 12,
              y: 10,
            },
            {
              structureType: 'tower',
              x: 12,
              y: 9,
            },
            ...createSaturatedRadiusTwoCoreStructures(),
          ],
          terrain: createPlainTerrainRectangle(4, 4, 16, 16),
        },
      ],
    });

    const extensionDecisions = decisions.filter(
      (decision) => decision.structureType === 'extension',
    );
    const roadDecisions = decisions.filter((decision) => decision.structureType === 'road');

    expect(extensionDecisions).toHaveLength(5);
    expect(roadDecisions.length).toBeGreaterThan(0);
    expect(
      extensionDecisions.every(
        (decision) => Math.max(Math.abs(decision.x - 10), Math.abs(decision.y - 10)) >= 4,
      ),
    ).toBe(true);
    expect(hasOrthogonallyAdjacentPositions(extensionDecisions)).toBe(false);
    expect(
      extensionDecisions.every((extensionDecision) =>
        isOrthogonallyAdjacentToAny(extensionDecision, roadDecisions),
      ),
    ).toBe(true);
    expect(decisions.slice(0, extensionDecisions.length)).toEqual(extensionDecisions);
  });

  it('does not add interleaved RCL4 roads above the construction backlog throttle', () => {
    const decisions = planConstruction({
      ownedRooms: [
        {
          blockedPositions: [],
          constructionSites: createConstructionSiteBacklog(),
          controllerLevel: 4,
          controllerPosition: { x: 14, y: 10 },
          roomName: 'W1N1',
          spawnPosition: { x: 10, y: 10 },
          structures: [
            {
              structureType: 'spawn',
              x: 10,
              y: 10,
            },
            {
              structureType: 'storage',
              x: 12,
              y: 10,
            },
            {
              structureType: 'tower',
              x: 12,
              y: 9,
            },
            ...createSaturatedRadiusTwoCoreStructures(),
          ],
          terrain: createPlainTerrainRectangle(4, 4, 16, 16),
        },
      ],
    });

    expect(decisions.some((decision) => decision.structureType === 'road')).toBe(false);
    expect(decisions.filter((decision) => decision.structureType === 'extension')).toHaveLength(5);
  });

  it('keeps high-controller extension planning from exhausting the radius-five layout', () => {
    const decisions = planConstruction({
      controllerStructureLimits: {
        extension: {
          8: 60,
        },
      },
      ownedRooms: [
        {
          blockedPositions: createSpawnRingPositions(10, 10, 3, 5),
          constructionSites: [],
          controllerLevel: 8,
          controllerPosition: { x: 14, y: 10 },
          roomName: 'W1N1',
          spawnPosition: { x: 10, y: 10 },
          structures: [
            {
              structureType: 'spawn',
              x: 10,
              y: 10,
            },
            {
              structureType: 'storage',
              x: 12,
              y: 10,
            },
          ],
          terrain: createPlainTerrainRectangle(2, 2, 18, 18),
        },
      ],
    });

    const extensionDecisions = decisions.filter(
      (decision) => decision.structureType === 'extension',
    );

    expect(extensionDecisions).toHaveLength(5);
    expect(
      extensionDecisions.every(
        (decision) => Math.max(Math.abs(decision.x - 10), Math.abs(decision.y - 10)) > 5,
      ),
    ).toBe(true);
  });
});

const hasOrthogonallyAdjacentPositions = (
  positions: readonly { readonly x: number; readonly y: number }[],
): boolean =>
  positions.some((leftPosition, leftIndex) =>
    positions
      .slice(leftIndex + 1)
      .some((rightPosition) => isOrthogonallyAdjacent(leftPosition, rightPosition)),
  );

const isOrthogonallyAdjacentToAny = (
  position: { readonly x: number; readonly y: number },
  targetPositions: readonly { readonly x: number; readonly y: number }[],
): boolean =>
  targetPositions.some((targetPosition) => isOrthogonallyAdjacent(position, targetPosition));

const isOrthogonallyAdjacent = (
  leftPosition: { readonly x: number; readonly y: number },
  rightPosition: { readonly x: number; readonly y: number },
): boolean =>
  Math.abs(leftPosition.x - rightPosition.x) + Math.abs(leftPosition.y - rightPosition.y) === 1;

const createConstructionSiteBacklog = () =>
  Array.from({ length: 10 }, (_, index) => ({
    structureType: 'road',
    x: 20 + index,
    y: 20,
  }));

const createSpawnRingPositions = (
  spawnX: number,
  spawnY: number,
  minRange: number,
  maxRange: number,
): readonly { readonly x: number; readonly y: number }[] =>
  createPlainTerrainRectangle(
    spawnX - maxRange,
    spawnY - maxRange,
    spawnX + maxRange,
    spawnY + maxRange,
  )
    .map(({ x, y }) => ({ x, y }))
    .filter((position) => {
      const range = Math.max(Math.abs(position.x - spawnX), Math.abs(position.y - spawnY));

      return range >= minRange && range <= maxRange;
    });

const createExtensionStructuresAroundSpawn10 = () =>
  [
    { x: 9, y: 9 },
    { x: 10, y: 9 },
    { x: 11, y: 9 },
    { x: 9, y: 10 },
    { x: 11, y: 10 },
    { x: 9, y: 11 },
    { x: 10, y: 11 },
    { x: 11, y: 11 },
    { x: 8, y: 9 },
    { x: 8, y: 10 },
  ].map((position) => ({
    structureType: 'extension',
    ...position,
  }));

const createSaturatedRadiusTwoCoreStructures = () => {
  const rangeTwoPositions = createPlainTerrainRectangle(8, 8, 12, 12)
    .filter((position) => position.x !== 10 || position.y !== 10)
    .filter((position) => position.x !== 12 || position.y !== 9)
    .filter((position) => position.x !== 12 || position.y !== 10)
    .map(({ x, y }) => ({ x, y }));

  return rangeTwoPositions.map((position, index) => ({
    structureType: index < 15 ? 'extension' : 'road',
    ...position,
  }));
};

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

const createNearSpawnLastAccessRoom = (controllerLevel: number) => ({
  blockedPositions: [
    { x: 8, y: 8 },
    { x: 10, y: 8 },
    { x: 11, y: 8 },
  ],
  constructionSites: [],
  controllerLevel,
  controllerPosition: { x: 10, y: 14 },
  roomName: 'W1N1',
  spawnPosition: { x: 10, y: 10 },
  structures: [
    { structureType: 'spawn', x: 10, y: 10 },
    { structureType: 'extension', x: 10, y: 9 },
    { structureType: 'constructedWall', x: 9, y: 9 },
    { structureType: 'constructedWall', x: 11, y: 9 },
    { structureType: 'constructedWall', x: 9, y: 10 },
    { structureType: 'constructedWall', x: 11, y: 10 },
    { structureType: 'constructedWall', x: 9, y: 11 },
    { structureType: 'constructedWall', x: 10, y: 11 },
    { structureType: 'constructedWall', x: 11, y: 11 },
  ],
  terrain: createPlainTerrainRectangle(8, 8, 12, 12),
});

const createNearSpawnTwoAccessRoom = () => ({
  blockedPositions: [
    { x: 8, y: 8 },
    { x: 10, y: 8 },
  ],
  constructionSites: [],
  controllerLevel: 2,
  controllerPosition: { x: 10, y: 14 },
  roomName: 'W1N1',
  spawnPosition: { x: 10, y: 10 },
  structures: [
    { structureType: 'spawn', x: 10, y: 10 },
    { structureType: 'extension', x: 10, y: 9 },
    { structureType: 'constructedWall', x: 9, y: 9 },
    { structureType: 'constructedWall', x: 11, y: 9 },
    { structureType: 'constructedWall', x: 9, y: 10 },
    { structureType: 'constructedWall', x: 11, y: 10 },
    { structureType: 'constructedWall', x: 9, y: 11 },
    { structureType: 'constructedWall', x: 10, y: 11 },
    { structureType: 'constructedWall', x: 11, y: 11 },
  ],
  terrain: createPlainTerrainRectangle(8, 8, 12, 12),
});

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

const createAccessLimitedStructure = (
  structureType: string,
  x: number,
  y: number,
  maxAccessCount: number,
) => {
  let accessCount = 0;
  const readPositionCoordinate = (coordinate: number): number => {
    accessCount += 1;

    if (accessCount > maxAccessCount) {
      throw new Error('road search unexpectedly read the existing anchor position');
    }

    return coordinate;
  };

  return {
    getAccessCount: () => accessCount,
    structure: {
      get x() {
        return readPositionCoordinate(x);
      },
      get y() {
        return readPositionCoordinate(y);
      },
      structureType,
    },
  };
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
