export type LayoutStampCellType = 'road' | 'extension' | 'core' | 'reserved' | 'exit' | 'optional';
export type LayoutStampReflection = 'none' | 'x' | 'y' | 'xy';
export type LayoutStampRotation = 0 | 90 | 180 | 270;
export type LayoutStampTerrain = 'plain' | 'swamp' | 'wall';

export interface LayoutStampPosition {
  readonly x: number;
  readonly y: number;
}

export interface LayoutStampCell extends LayoutStampPosition {
  readonly id?: string;
  readonly type: LayoutStampCellType;
}

export interface LayoutStamp {
  readonly cells: readonly LayoutStampCell[];
  readonly name?: string;
}

export interface LayoutStampTransform {
  readonly offset?: LayoutStampPosition;
  readonly reflection?: LayoutStampReflection;
  readonly rotation?: LayoutStampRotation;
}

export interface LayoutTerrainTile extends LayoutStampPosition {
  readonly terrain: string;
}

export interface LayoutPlacedStructure extends LayoutStampPosition {
  readonly demolitionCost?: number;
  readonly structureType: string;
  readonly useful?: boolean;
}

export interface LayoutStampPlacementContext {
  readonly blockedPositions?: readonly LayoutStampPosition[];
  readonly existingStructures?: readonly LayoutPlacedStructure[];
  readonly minimumRefillAccess?: number;
  readonly terrain?: readonly LayoutTerrainTile[];
}

export type LayoutStampIssueKind =
  | 'blocked-collision'
  | 'duplicate-cell'
  | 'invalid-cell-type'
  | 'invalid-coordinate'
  | 'invalid-terrain'
  | 'structure-conflict'
  | 'terrain-collision';

export interface LayoutStampIssue {
  readonly cellType?: string;
  readonly kind: LayoutStampIssueKind;
  readonly message: string;
  readonly position?: LayoutStampPosition;
  readonly structureType?: string;
  readonly terrain?: string;
}

export interface LayoutRoadConnectivityAnalysis {
  readonly connectedRoadCount: number;
  readonly deadEndCount: number;
  readonly disconnectedRoadPositions: readonly LayoutStampPosition[];
  readonly isConnected: boolean;
  readonly issues: readonly LayoutStampIssue[];
  readonly roadCount: number;
}

export interface LayoutRefillAdjacencyTarget {
  readonly accessibleAdjacentCount: number;
  readonly adjacentRoadCount: number;
  readonly meetsMinimumAccess: boolean;
  readonly position: LayoutStampPosition;
  readonly type: 'core' | 'extension';
}

export interface LayoutRefillAdjacencyAnalysis {
  readonly allTargetsAdjacentToRoad: boolean;
  readonly allTargetsMeetMinimumAccess: boolean;
  readonly issues: readonly LayoutStampIssue[];
  readonly minimumAccess: number;
  readonly targets: readonly LayoutRefillAdjacencyTarget[];
}

export interface LayoutStampScoreComponent {
  readonly contribution: number;
  readonly detail: string;
  readonly key:
    | 'blockedCollisions'
    | 'extensionCapacity'
    | 'extensionClumps'
    | 'migrationCost'
    | 'openDiagonals'
    | 'refillAccess'
    | 'roadConnectivity'
    | 'roadDeadEnds'
    | 'structureCompatibility'
    | 'structureConflicts'
    | 'terrainCollisions';
  readonly value: number;
}

export interface LayoutStampCandidateScore {
  readonly components: readonly LayoutStampScoreComponent[];
  readonly connectivity: LayoutRoadConnectivityAnalysis;
  readonly metrics: Readonly<{
    readonly blockedCollisionCount: number;
    readonly demolitionCost: number;
    readonly extensionCapacity: number;
    readonly openDiagonalCount: number;
    readonly orthogonalExtensionClumpCount: number;
    readonly refillAccessShortfallCount: number;
    readonly reusableStructureCount: number;
    readonly structureConflictCount: number;
    readonly terrainCollisionCount: number;
  }>;
  readonly placementIssues: readonly LayoutStampIssue[];
  readonly refillAdjacency: LayoutRefillAdjacencyAnalysis;
  readonly score: number;
  readonly sortKey: readonly number[];
}

const DIAGONAL_OFFSETS = [
  { x: -1, y: -1 },
  { x: 0, y: -1 },
  { x: 1, y: -1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
  { x: -1, y: 1 },
  { x: 0, y: 1 },
  { x: 1, y: 1 },
] as const satisfies readonly LayoutStampPosition[];
const STAMP_CELL_TYPES = new Set<LayoutStampCellType>([
  'road',
  'extension',
  'core',
  'reserved',
  'exit',
  'optional',
]);
const TERRAIN_TYPES = new Set<LayoutStampTerrain>(['plain', 'swamp', 'wall']);
const WALKABLE_STAMP_CELL_TYPES = new Set<LayoutStampCellType>([
  'road',
  'reserved',
  'exit',
  'optional',
]);
const OPEN_DIAGONAL_STAMP_CELL_TYPES = new Set<LayoutStampCellType>(['reserved', 'exit']);
const ROAD_COMPATIBLE_STRUCTURE_TYPES = new Set(['road']);
const EXTENSION_COMPATIBLE_STRUCTURE_TYPES = new Set(['extension']);
const CORE_COMPATIBLE_STRUCTURE_TYPES = new Set([
  'spawn',
  'storage',
  'tower',
  'container',
  'link',
  'terminal',
  'lab',
  'factory',
  'observer',
  'powerSpawn',
  'nuker',
]);
const WALKABLE_STRUCTURE_TYPES = new Set(['road', 'rampart']);
const DEFAULT_MINIMUM_REFILL_ACCESS = 2;

const normalizeStamp = (
  stamp: LayoutStamp,
): {
  readonly cells: readonly LayoutStampCell[];
  readonly issues: readonly LayoutStampIssue[];
} => {
  const issues: LayoutStampIssue[] = [];
  const cells: LayoutStampCell[] = [];
  const positionKeys = new Set<string>();

  for (const cell of stamp.cells) {
    if (!isFiniteInteger(cell.x) || !isFiniteInteger(cell.y)) {
      issues.push({
        cellType: String(cell.type),
        kind: 'invalid-coordinate',
        message: `Cell coordinates must be finite integers: ${String(cell.x)}, ${String(cell.y)}`,
        position: createUnsafePosition(cell),
      });
      continue;
    }

    if (!isLayoutStampCellType(cell.type)) {
      issues.push({
        cellType: String(cell.type),
        kind: 'invalid-cell-type',
        message: `Unsupported stamp cell type: ${String(cell.type)}`,
        position: cell,
      });
      continue;
    }

    const positionKey = serializePosition(cell);

    if (positionKeys.has(positionKey)) {
      issues.push({
        cellType: cell.type,
        kind: 'duplicate-cell',
        message: `Duplicate stamp cell at ${positionKey}`,
        position: cell,
      });
      continue;
    }

    positionKeys.add(positionKey);
    cells.push(cell);
  }

  return {
    cells,
    issues,
  };
};

const createTerrainMap = (
  terrainTiles: readonly LayoutTerrainTile[],
): {
  readonly issues: readonly LayoutStampIssue[];
  readonly terrainByPositionKey: ReadonlyMap<string, LayoutStampTerrain>;
} => {
  const issues: LayoutStampIssue[] = [];
  const terrainByPositionKey = new Map<string, LayoutStampTerrain>();

  for (const terrainTile of terrainTiles) {
    if (!isFiniteInteger(terrainTile.x) || !isFiniteInteger(terrainTile.y)) {
      issues.push({
        kind: 'invalid-coordinate',
        message: `Terrain coordinates must be finite integers: ${String(terrainTile.x)}, ${String(terrainTile.y)}`,
        position: createUnsafePosition(terrainTile),
        terrain: String(terrainTile.terrain),
      });
      continue;
    }

    if (!isLayoutStampTerrain(terrainTile.terrain)) {
      issues.push({
        kind: 'invalid-terrain',
        message: `Unsupported terrain type: ${String(terrainTile.terrain)}`,
        position: terrainTile,
        terrain: String(terrainTile.terrain),
      });
      continue;
    }

    terrainByPositionKey.set(serializePosition(terrainTile), terrainTile.terrain);
  }

  return {
    issues,
    terrainByPositionKey,
  };
};

const collectValidPositionKeys = (
  positions: readonly LayoutStampPosition[],
): {
  readonly issues: readonly LayoutStampIssue[];
  readonly positionKeys: ReadonlySet<string>;
} => {
  const issues: LayoutStampIssue[] = [];
  const positionKeys = new Set<string>();

  for (const position of positions) {
    if (!isFiniteInteger(position.x) || !isFiniteInteger(position.y)) {
      issues.push({
        kind: 'invalid-coordinate',
        message: `Coordinates must be finite integers: ${String(position.x)}, ${String(position.y)}`,
        position: createUnsafePosition(position),
      });
      continue;
    }

    positionKeys.add(serializePosition(position));
  }

  return {
    issues,
    positionKeys,
  };
};

const collectStructureMap = (
  existingStructures: readonly LayoutPlacedStructure[],
): {
  readonly issues: readonly LayoutStampIssue[];
  readonly structuresByPositionKey: ReadonlyMap<string, readonly LayoutPlacedStructure[]>;
} => {
  const issues: LayoutStampIssue[] = [];
  const groupedStructures = new Map<string, LayoutPlacedStructure[]>();

  for (const structure of existingStructures) {
    if (!isFiniteInteger(structure.x) || !isFiniteInteger(structure.y)) {
      issues.push({
        kind: 'invalid-coordinate',
        message: `Structure coordinates must be finite integers: ${String(structure.x)}, ${String(structure.y)}`,
        position: createUnsafePosition(structure),
        structureType: structure.structureType,
      });
      continue;
    }

    const positionKey = serializePosition(structure);
    const bucket = groupedStructures.get(positionKey);

    if (bucket === undefined) {
      groupedStructures.set(positionKey, [structure]);
      continue;
    }

    bucket.push(structure);
  }

  return {
    issues,
    structuresByPositionKey: groupedStructures,
  };
};

const assertValidRotation: (rotation: number) => asserts rotation is LayoutStampRotation = (
  rotation,
) => {
  if (rotation === 0 || rotation === 90 || rotation === 180 || rotation === 270) {
    return;
  }

  throw new RangeError(`Unsupported stamp rotation: ${String(rotation)}`);
};

const assertValidReflection: (reflection: string) => asserts reflection is LayoutStampReflection = (
  reflection,
) => {
  if (reflection === 'none' || reflection === 'x' || reflection === 'y' || reflection === 'xy') {
    return;
  }

  throw new RangeError(`Unsupported stamp reflection: ${reflection}`);
};

export const validateLayoutStamp = (stamp: LayoutStamp): readonly LayoutStampIssue[] =>
  normalizeStamp(stamp).issues;

export const transformLayoutStamp = (
  stamp: LayoutStamp,
  transform: LayoutStampTransform,
): LayoutStamp => {
  const rotation: number = transform.rotation ?? 0;
  const reflection: string = transform.reflection ?? 'none';
  const offset = transform.offset ?? { x: 0, y: 0 };

  assertValidRotation(rotation);
  assertValidReflection(reflection);

  if (!isFiniteInteger(offset.x) || !isFiniteInteger(offset.y)) {
    throw new RangeError(
      `Stamp translation offset must use finite integer coordinates: ${String(offset.x)}, ${String(offset.y)}`,
    );
  }

  const { cells, issues } = normalizeStamp(stamp);

  if (issues.length > 0) {
    throw new TypeError(
      `Cannot transform invalid stamp: ${issues.map((issue) => issue.kind).join(', ')}`,
    );
  }

  const transformedCells = cells.map((cell) => {
    const reflectedX = reflection === 'y' || reflection === 'xy' ? -cell.x : cell.x;
    const reflectedY = reflection === 'x' || reflection === 'xy' ? -cell.y : cell.y;
    const rotatedPosition = rotatePosition({ x: reflectedX, y: reflectedY }, rotation);
    const transformedCell: LayoutStampCell = {
      type: cell.type,
      x: rotatedPosition.x + offset.x,
      y: rotatedPosition.y + offset.y,
    };

    return cell.id === undefined ? transformedCell : { ...transformedCell, id: cell.id };
  });

  if (stamp.name === undefined) {
    return { cells: transformedCells };
  }

  return {
    cells: transformedCells,
    name: stamp.name,
  };
};

export const rotateLayoutStamp = (stamp: LayoutStamp, rotation: LayoutStampRotation): LayoutStamp =>
  transformLayoutStamp(stamp, { rotation });

export const reflectLayoutStamp = (
  stamp: LayoutStamp,
  reflection: LayoutStampReflection,
): LayoutStamp => transformLayoutStamp(stamp, { reflection });

export const translateLayoutStamp = (
  stamp: LayoutStamp,
  offset: LayoutStampPosition,
): LayoutStamp => transformLayoutStamp(stamp, { offset });

export const collectLayoutStampPlacementIssues = (
  stamp: LayoutStamp,
  context: LayoutStampPlacementContext = {},
): readonly LayoutStampIssue[] => {
  const { cells, issues: stampIssues } = normalizeStamp(stamp);
  const { issues: terrainIssues, terrainByPositionKey } = createTerrainMap(context.terrain ?? []);
  const { issues: blockedPositionIssues, positionKeys: blockedPositionKeys } =
    collectValidPositionKeys(context.blockedPositions ?? []);
  const { issues: structureIssues, structuresByPositionKey } = collectStructureMap(
    context.existingStructures ?? [],
  );
  const issues = [...stampIssues, ...terrainIssues, ...blockedPositionIssues, ...structureIssues];

  for (const cell of cells) {
    const positionKey = serializePosition(cell);
    const terrain = terrainByPositionKey.get(positionKey) ?? 'plain';

    if (terrain === 'wall') {
      issues.push({
        cellType: cell.type,
        kind: 'terrain-collision',
        message: `Cell ${cell.type} collides with wall terrain at ${positionKey}`,
        position: cell,
        terrain,
      });
    }

    if (blockedPositionKeys.has(positionKey)) {
      issues.push({
        cellType: cell.type,
        kind: 'blocked-collision',
        message: `Cell ${cell.type} overlaps a blocked position at ${positionKey}`,
        position: cell,
      });
    }

    const overlappingStructures = structuresByPositionKey.get(positionKey) ?? [];

    for (const structure of overlappingStructures) {
      if (isCompatibleStructureForCell(cell.type, structure.structureType)) {
        continue;
      }

      issues.push({
        cellType: cell.type,
        kind: 'structure-conflict',
        message: `Cell ${cell.type} conflicts with ${structure.structureType} at ${positionKey}`,
        position: cell,
        structureType: structure.structureType,
      });
    }
  }

  return issues;
};

export const analyzeRoadConnectivity = (stamp: LayoutStamp): LayoutRoadConnectivityAnalysis => {
  const { cells, issues } = normalizeStamp(stamp);
  const roadCells = cells.filter((cell) => cell.type === 'road');

  if (roadCells.length <= 1) {
    return {
      connectedRoadCount: roadCells.length,
      deadEndCount: countRoadDeadEnds(roadCells, cells),
      disconnectedRoadPositions: [],
      isConnected: true,
      issues,
      roadCount: roadCells.length,
    };
  }

  const roadPositionKeys = new Set(roadCells.map((cell) => serializePosition(cell)));
  const connectedRoadPositionKeys = new Set<string>();
  const queue: LayoutStampCell[] = [roadCells[0]];

  while (queue.length > 0) {
    const currentCell = queue.shift();

    if (currentCell === undefined) {
      break;
    }

    const currentPositionKey = serializePosition(currentCell);

    if (connectedRoadPositionKeys.has(currentPositionKey)) {
      continue;
    }

    connectedRoadPositionKeys.add(currentPositionKey);

    for (const roadCell of roadCells) {
      const roadPositionKey = serializePosition(roadCell);

      if (connectedRoadPositionKeys.has(roadPositionKey) || !isAdjacent8(currentCell, roadCell)) {
        continue;
      }

      queue.push(roadCell);
    }
  }

  return {
    connectedRoadCount: connectedRoadPositionKeys.size,
    deadEndCount: countRoadDeadEnds(roadCells, cells),
    disconnectedRoadPositions: roadCells
      .filter((cell) => !connectedRoadPositionKeys.has(serializePosition(cell)))
      .map((cell) => ({ x: cell.x, y: cell.y })),
    isConnected: connectedRoadPositionKeys.size === roadPositionKeys.size,
    issues,
    roadCount: roadCells.length,
  };
};

export const analyzeRefillAdjacency = (
  stamp: LayoutStamp,
  context: LayoutStampPlacementContext = {},
): LayoutRefillAdjacencyAnalysis => {
  const { cells, issues: stampIssues } = normalizeStamp(stamp);
  const { issues: terrainIssues, terrainByPositionKey } = createTerrainMap(context.terrain ?? []);
  const { issues: blockedPositionIssues, positionKeys: blockedPositionKeys } =
    collectValidPositionKeys(context.blockedPositions ?? []);
  const { issues: structureIssues, structuresByPositionKey } = collectStructureMap(
    context.existingStructures ?? [],
  );
  const issues = [...stampIssues, ...terrainIssues, ...blockedPositionIssues, ...structureIssues];
  const minimumAccess = context.minimumRefillAccess ?? DEFAULT_MINIMUM_REFILL_ACCESS;
  const roadPositionKeys = new Set(
    cells.filter((cell) => cell.type === 'road').map((cell) => serializePosition(cell)),
  );
  const blockedStampCellPositionKeys = new Set(
    cells
      .filter((cell) => !WALKABLE_STAMP_CELL_TYPES.has(cell.type))
      .map((cell) => serializePosition(cell)),
  );
  const targetCells = cells.filter(
    (cell): cell is LayoutStampCell & { readonly type: 'core' | 'extension' } =>
      cell.type === 'core' || cell.type === 'extension',
  );
  const targets = targetCells.map((targetCell) => {
    const adjacentPositions = DIAGONAL_OFFSETS.map((offset) => ({
      x: targetCell.x + offset.x,
      y: targetCell.y + offset.y,
    }));
    const accessibleAdjacentCount = adjacentPositions.filter((adjacentPosition) => {
      const positionKey = serializePosition(adjacentPosition);
      const terrain = terrainByPositionKey.get(positionKey) ?? 'plain';
      const overlappingStructures = structuresByPositionKey.get(positionKey) ?? [];
      const blockedByStructure = overlappingStructures.some(
        (structure) => !WALKABLE_STRUCTURE_TYPES.has(structure.structureType),
      );

      return (
        terrain !== 'wall' &&
        !blockedPositionKeys.has(positionKey) &&
        !blockedStampCellPositionKeys.has(positionKey) &&
        !blockedByStructure
      );
    }).length;
    const adjacentRoadCount = adjacentPositions.filter((adjacentPosition) =>
      roadPositionKeys.has(serializePosition(adjacentPosition)),
    ).length;

    return {
      accessibleAdjacentCount,
      adjacentRoadCount,
      meetsMinimumAccess: accessibleAdjacentCount >= minimumAccess,
      position: {
        x: targetCell.x,
        y: targetCell.y,
      },
      type: targetCell.type,
    };
  });

  return {
    allTargetsAdjacentToRoad: targets.every((target) => target.adjacentRoadCount > 0),
    allTargetsMeetMinimumAccess: targets.every((target) => target.meetsMinimumAccess),
    issues,
    minimumAccess,
    targets,
  };
};

export const scoreLayoutStampCandidate = (
  stamp: LayoutStamp,
  context: LayoutStampPlacementContext = {},
): LayoutStampCandidateScore => {
  const placementIssues = collectLayoutStampPlacementIssues(stamp, context);
  const connectivity = analyzeRoadConnectivity(stamp);
  const refillAdjacency = analyzeRefillAdjacency(stamp, context);
  const { cells } = normalizeStamp(stamp);
  const extensionCapacity = cells.filter((cell) => cell.type === 'extension').length;
  const openDiagonalCount = cells.filter((cell) =>
    OPEN_DIAGONAL_STAMP_CELL_TYPES.has(cell.type),
  ).length;
  const orthogonalExtensionClumpCount = countOrthogonalExtensionClumps(cells);
  const reusableStructureCount = countReusableStructures(cells, context.existingStructures ?? []);
  const demolitionCost = countDemolitionCost(cells, context.existingStructures ?? []);
  const terrainCollisionCount = countIssues(placementIssues, 'terrain-collision');
  const blockedCollisionCount = countIssues(placementIssues, 'blocked-collision');
  const structureConflictCount = countIssues(placementIssues, 'structure-conflict');
  const refillAccessShortfallCount = refillAdjacency.targets.filter(
    (target) => !target.meetsMinimumAccess,
  ).length;
  const roadConnectivityValue = connectivity.isConnected
    ? connectivity.roadCount
    : connectivity.connectedRoadCount - connectivity.disconnectedRoadPositions.length;
  const components: LayoutStampScoreComponent[] = [
    {
      contribution: roadConnectivityValue,
      detail: connectivity.isConnected
        ? `Connected road skeleton across ${connectivity.roadCount} road cells`
        : `${connectivity.disconnectedRoadPositions.length} road cells are disconnected`,
      key: 'roadConnectivity',
      value: roadConnectivityValue,
    },
    {
      contribution: extensionCapacity,
      detail: `${extensionCapacity} extension pockets available`,
      key: 'extensionCapacity',
      value: extensionCapacity,
    },
    {
      contribution: openDiagonalCount,
      detail: `${openDiagonalCount} reserved exits or open diagonals`,
      key: 'openDiagonals',
      value: openDiagonalCount,
    },
    {
      contribution: reusableStructureCount,
      detail: `${reusableStructureCount} existing structures align with the stamp`,
      key: 'structureCompatibility',
      value: reusableStructureCount,
    },
    {
      contribution: -terrainCollisionCount * 2,
      detail: `${terrainCollisionCount} terrain collisions`,
      key: 'terrainCollisions',
      value: terrainCollisionCount,
    },
    {
      contribution: -blockedCollisionCount * 2,
      detail: `${blockedCollisionCount} blocked-position collisions`,
      key: 'blockedCollisions',
      value: blockedCollisionCount,
    },
    {
      contribution: -structureConflictCount * 2,
      detail: `${structureConflictCount} incompatible existing structures overlap the stamp`,
      key: 'structureConflicts',
      value: structureConflictCount,
    },
    {
      contribution: -connectivity.deadEndCount,
      detail: `${connectivity.deadEndCount} unjustified road dead ends`,
      key: 'roadDeadEnds',
      value: connectivity.deadEndCount,
    },
    {
      contribution: -orthogonalExtensionClumpCount,
      detail: `${orthogonalExtensionClumpCount} orthogonal extension clumps`,
      key: 'extensionClumps',
      value: orthogonalExtensionClumpCount,
    },
    {
      contribution: -refillAccessShortfallCount * 2,
      detail: `${refillAccessShortfallCount} refill targets fall below ${refillAdjacency.minimumAccess} access tiles`,
      key: 'refillAccess',
      value: refillAccessShortfallCount,
    },
    {
      contribution: -demolitionCost,
      detail: `${demolitionCost} estimated demolition cost from conflicting useful structures`,
      key: 'migrationCost',
      value: demolitionCost,
    },
  ];
  const score = components.reduce(
    (totalScore, component) => totalScore + component.contribution,
    0,
  );
  const sortKey = [
    score,
    placementIssues.length === 0 ? 1 : 0,
    connectivity.isConnected ? 1 : 0,
    extensionCapacity,
    refillAdjacency.allTargetsMeetMinimumAccess ? 1 : 0,
    openDiagonalCount,
    reusableStructureCount,
    -connectivity.deadEndCount,
    -orthogonalExtensionClumpCount,
    -demolitionCost,
  ] as const;

  return {
    components,
    connectivity,
    metrics: {
      blockedCollisionCount,
      demolitionCost,
      extensionCapacity,
      openDiagonalCount,
      orthogonalExtensionClumpCount,
      refillAccessShortfallCount,
      reusableStructureCount,
      structureConflictCount,
      terrainCollisionCount,
    },
    placementIssues,
    refillAdjacency,
    score,
    sortKey,
  };
};

export const compareLayoutStampCandidateScores = (
  leftScore: LayoutStampCandidateScore,
  rightScore: LayoutStampCandidateScore,
): number => {
  const maxLength = Math.max(leftScore.sortKey.length, rightScore.sortKey.length);

  for (let index = 0; index < maxLength; index += 1) {
    const leftValue = leftScore.sortKey[index] ?? 0;
    const rightValue = rightScore.sortKey[index] ?? 0;

    if (leftValue === rightValue) {
      continue;
    }

    return rightValue - leftValue;
  }

  return 0;
};

const rotatePosition = (
  position: LayoutStampPosition,
  rotation: LayoutStampRotation,
): LayoutStampPosition => {
  switch (rotation) {
    case 0:
      return position;
    case 90:
      return { x: -position.y, y: position.x };
    case 180:
      return { x: -position.x, y: -position.y };
    case 270:
      return { x: position.y, y: -position.x };
  }
};

const countRoadDeadEnds = (
  roadCells: readonly LayoutStampCell[],
  allCells: readonly LayoutStampCell[],
): number => {
  const serviceCells = allCells.filter(
    (cell) => cell.type === 'core' || cell.type === 'extension' || cell.type === 'exit',
  );

  return roadCells.filter((roadCell) => {
    const adjacentRoadCount = roadCells.filter((candidateRoadCell) =>
      isAdjacent8(roadCell, candidateRoadCell),
    ).length;

    if (adjacentRoadCount > 1) {
      return false;
    }

    return !serviceCells.some((serviceCell) => isAdjacent8(roadCell, serviceCell));
  }).length;
};

const countOrthogonalExtensionClumps = (cells: readonly LayoutStampCell[]): number => {
  const extensionCells = cells.filter((cell) => cell.type === 'extension');
  let clumpCount = 0;

  for (let index = 0; index < extensionCells.length; index += 1) {
    const leftCell = extensionCells[index];

    for (let rightIndex = index + 1; rightIndex < extensionCells.length; rightIndex += 1) {
      const rightCell = extensionCells[rightIndex];

      if (isAdjacent4(leftCell, rightCell)) {
        clumpCount += 1;
      }
    }
  }

  return clumpCount;
};

const countReusableStructures = (
  cells: readonly LayoutStampCell[],
  existingStructures: readonly LayoutPlacedStructure[],
): number => {
  const reusableStructureCount = new Set<string>();

  for (const cell of cells) {
    if (!isFiniteInteger(cell.x) || !isFiniteInteger(cell.y)) {
      continue;
    }

    for (const structure of existingStructures) {
      if (!isSamePosition(cell, structure)) {
        continue;
      }

      if (!isCompatibleStructureForCell(cell.type, structure.structureType)) {
        continue;
      }

      reusableStructureCount.add(`${serializePosition(cell)}:${structure.structureType}`);
    }
  }

  return reusableStructureCount.size;
};

const countDemolitionCost = (
  cells: readonly LayoutStampCell[],
  existingStructures: readonly LayoutPlacedStructure[],
): number => {
  let demolitionCost = 0;

  for (const cell of cells) {
    if (!isFiniteInteger(cell.x) || !isFiniteInteger(cell.y)) {
      continue;
    }

    for (const structure of existingStructures) {
      if (
        !isSamePosition(cell, structure) ||
        isCompatibleStructureForCell(cell.type, structure.structureType)
      ) {
        continue;
      }

      demolitionCost += structure.demolitionCost ?? (structure.useful === false ? 0 : 1);
    }
  }

  return demolitionCost;
};

const countIssues = (issues: readonly LayoutStampIssue[], kind: LayoutStampIssueKind): number =>
  issues.filter((issue) => issue.kind === kind).length;

const isCompatibleStructureForCell = (
  cellType: LayoutStampCellType,
  structureType: string,
): boolean => {
  switch (cellType) {
    case 'road':
      return ROAD_COMPATIBLE_STRUCTURE_TYPES.has(structureType);
    case 'extension':
      return EXTENSION_COMPATIBLE_STRUCTURE_TYPES.has(structureType);
    case 'core':
      return CORE_COMPATIBLE_STRUCTURE_TYPES.has(structureType);
    case 'reserved':
    case 'exit':
    case 'optional':
      return false;
  }
};

const isLayoutStampCellType = (value: string): value is LayoutStampCellType =>
  STAMP_CELL_TYPES.has(value as LayoutStampCellType);

const isLayoutStampTerrain = (value: string): value is LayoutStampTerrain =>
  TERRAIN_TYPES.has(value as LayoutStampTerrain);

const isFiniteInteger = (value: number): boolean =>
  Number.isFinite(value) && Number.isInteger(value);

const isAdjacent8 = (
  leftPosition: LayoutStampPosition,
  rightPosition: LayoutStampPosition,
): boolean =>
  !(leftPosition.x === rightPosition.x && leftPosition.y === rightPosition.y) &&
  Math.max(
    Math.abs(leftPosition.x - rightPosition.x),
    Math.abs(leftPosition.y - rightPosition.y),
  ) === 1;

const isAdjacent4 = (
  leftPosition: LayoutStampPosition,
  rightPosition: LayoutStampPosition,
): boolean =>
  Math.abs(leftPosition.x - rightPosition.x) + Math.abs(leftPosition.y - rightPosition.y) === 1;

const isSamePosition = (
  leftPosition: LayoutStampPosition,
  rightPosition: LayoutStampPosition,
): boolean => leftPosition.x === rightPosition.x && leftPosition.y === rightPosition.y;

const createUnsafePosition = (
  position: Pick<LayoutStampPosition, 'x' | 'y'>,
): LayoutStampPosition => ({
  x: position.x,
  y: position.y,
});

const serializePosition = (position: LayoutStampPosition): string => `${position.x}:${position.y}`;
