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
  },
} as const;

const planConstruction = (
  constructionWorld: Omit<ConstructionWorldSnapshot, 'controllerStructureLimits'> &
    Partial<Pick<ConstructionWorldSnapshot, 'controllerStructureLimits'>>,
) =>
  planRoomConstruction({
    controllerStructureLimits: TEST_CONTROLLER_STRUCTURE_LIMITS,
    ...constructionWorld,
  });

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
      blockedPositions: [],
      constructionSites: [],
      controllerLevel: 1,
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
};
