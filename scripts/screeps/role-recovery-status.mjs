#!/usr/bin/env node

import { pathToFileURL } from 'node:url';

import { reportCommandFailure } from './command-failure.mjs';
import { readMainScreepsConfig, readMainScreepsConfigFrom } from './config.mjs';
import { hashModuleSet } from './module-set.mjs';
import {
  readLiveAccountIdentity,
  readRemoteModuleSet,
  readRoomObjects,
  readRoomStatus,
  readRoomTerrainText,
  readUserMemory,
} from './screeps-api.mjs';

const KNOWN_CREEP_ROLES = new Set(['worker', 'miner', 'hauler', 'builder', 'upgrader']);
const ROLE_OUTPUT_ORDER = ['builder', 'hauler', 'miner', 'upgrader', 'worker', 'unknown'];
const ROAD_CRITICAL_RATIO = 0.2;
const ROAD_DAMAGED_RATIO = 0.35;

export class RoleRecoveryStatusError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RoleRecoveryStatusError';
  }
}

export const checkRoleRecoveryStatus = async (commandArguments = process.argv.slice(2)) => {
  const statusRequest = parseRoleRecoveryStatusRequest(commandArguments);
  const screepsConfig = await readMainScreepsConfig();

  await printRoleRecoveryStatus(screepsConfig, statusRequest);
};

export const checkRoleRecoveryStatusFrom = async (workspacePath, commandArguments) => {
  const statusRequest = parseRoleRecoveryStatusRequest(commandArguments);
  const screepsConfig = await readMainScreepsConfigFrom(workspacePath);

  await printRoleRecoveryStatus(screepsConfig, statusRequest);
};

export const parseRoleRecoveryStatusRequest = (commandArguments) => {
  let shardName = null;
  let roomName = null;

  for (let argumentIndex = 0; argumentIndex < commandArguments.length; argumentIndex += 1) {
    const commandArgument = commandArguments[argumentIndex];

    if (commandArgument === '--') {
      continue;
    }

    if (commandArgument === '--shard') {
      shardName = readFollowingArgument(commandArguments, argumentIndex, '--shard');
      argumentIndex += 1;
      continue;
    }

    if (commandArgument === '--room') {
      roomName = readFollowingArgument(commandArguments, argumentIndex, '--room');
      argumentIndex += 1;
      continue;
    }

    throw new RoleRecoveryStatusError(`Unknown argument "${commandArgument}".`);
  }

  if (shardName === null) {
    throw new RoleRecoveryStatusError('Missing --shard <name>.');
  }

  if (roomName === null) {
    throw new RoleRecoveryStatusError('Missing --room <name>.');
  }

  return {
    roomName,
    shardName,
  };
};

const printRoleRecoveryStatus = async (screepsConfig, statusRequest) => {
  const accountIdentity = await readLiveAccountIdentity(screepsConfig);
  const roomStatus = await readRoomStatus(
    screepsConfig,
    statusRequest.shardName,
    statusRequest.roomName,
  );
  const roomObjects = await readRoomObjects(
    screepsConfig,
    statusRequest.shardName,
    statusRequest.roomName,
  );
  const roomTerrainText = await readRoomTerrainText(
    screepsConfig,
    statusRequest.shardName,
    statusRequest.roomName,
  );
  const creepMemory = normalizeCreepMemory(
    await readUserMemory(screepsConfig, statusRequest.shardName, 'creeps'),
  );
  const remoteModules = await readRemoteModuleSet(screepsConfig);
  const roleRecoverySummary = summarizeRoleRecoveryRoom(
    roomObjects,
    accountIdentity.accountId,
    creepMemory,
    roomTerrainText,
  );

  console.log(
    [
      '[status:role-recovery:screeps]',
      `branch=${screepsConfig.branch}`,
      `shard=${statusRequest.shardName}`,
      `room=${statusRequest.roomName}`,
      `status=${roomStatus}`,
      `moduleHash=${hashModuleSet(remoteModules)}`,
      `creeps=${roleRecoverySummary.creepCount}`,
      `roleCounts=${roleRecoverySummary.roleCounts}`,
      `spawningRole=${roleRecoverySummary.spawningRole}`,
      `constructionSites=${roleRecoverySummary.constructionSiteCount}`,
      `constructionProgress=${roleRecoverySummary.constructionProgress}`,
      `roadCritical=${roleRecoverySummary.roadCritical}`,
      `roadDamaged=${roleRecoverySummary.roadDamaged}`,
      `roadMinHits=${roleRecoverySummary.roadMinHits}`,
      `sourceContainers=${roleRecoverySummary.sourceContainers}`,
      `refillAccess=${roleRecoverySummary.refillAccess}`,
    ].join(' '),
  );
};

const summarizeRoleRecoveryRoom = (roomObjects, ownedUserId, creepMemory, terrainText) => {
  const ownedSpawn = selectOwnedSpawn(roomObjects, ownedUserId);
  const ownedCreeps = roomObjects.filter(
    (roomObject) =>
      readStringField(roomObject, 'type') === 'creep' &&
      objectBelongsToUser(roomObject, ownedUserId),
  );
  const roleCounts = countCreepRoles(ownedCreeps, creepMemory);
  const constructionSites = roomObjects.filter(
    (roomObject) =>
      readStringField(roomObject, 'type') === 'constructionSite' &&
      objectBelongsToUser(roomObject, ownedUserId),
  );
  const roads = roomObjects.filter((roomObject) => readStringField(roomObject, 'type') === 'road');

  return {
    constructionProgress: formatConstructionProgress(constructionSites),
    constructionSiteCount: constructionSites.length,
    creepCount: ownedCreeps.length,
    roadCritical: formatRoadRatioCount(roads, ROAD_CRITICAL_RATIO),
    roadDamaged: formatRoadRatioCount(roads, ROAD_DAMAGED_RATIO),
    roadMinHits: formatRoadMinHits(roads),
    refillAccess: formatRefillAccess(roomObjects, ownedUserId, terrainText),
    roleCounts: formatRoleCounts(roleCounts),
    sourceContainers: formatSourceContainerEnergy(roomObjects),
    spawningRole: readSpawnedCreepRole(ownedSpawn, creepMemory),
  };
};

const normalizeCreepMemory = (memoryValue) => (isPlainObject(memoryValue) ? memoryValue : {});

const countCreepRoles = (ownedCreeps, creepMemory) => {
  const roleCounts = new Map();

  for (const creepObject of ownedCreeps) {
    const creepName = readStringField(creepObject, 'name');
    const creepRole =
      readCreepRole(creepMemory, creepName) ?? parseCreepRoleFromName(creepName) ?? 'unknown';

    roleCounts.set(creepRole, (roleCounts.get(creepRole) ?? 0) + 1);
  }

  return roleCounts;
};

const readSpawnedCreepRole = (spawnObject, creepMemory) => {
  const spawningName = readSpawningCreepName(spawnObject);

  if (spawningName === '') {
    return '-';
  }

  return (
    readCreepRole(creepMemory, spawningName) ?? parseCreepRoleFromName(spawningName) ?? 'unknown'
  );
};

const readSpawningCreepName = (spawnObject) => {
  if (!isPlainObject(spawnObject) || !isPlainObject(spawnObject.spawning)) {
    return '';
  }

  return readStringField(spawnObject.spawning, 'name');
};

const readCreepRole = (creepMemory, creepName) => {
  if (!isPlainObject(creepMemory) || !isPlainObject(creepMemory[creepName])) {
    return undefined;
  }

  const roleValue = creepMemory[creepName].role;

  return typeof roleValue === 'string' && KNOWN_CREEP_ROLES.has(roleValue) ? roleValue : undefined;
};

const parseCreepRoleFromName = (creepName) => {
  const roleMatch = creepName.match(/-(worker|miner|hauler|builder|upgrader)-/u);

  return roleMatch?.[1];
};

const formatRoleCounts = (roleCounts) => {
  const roleSegments = ROLE_OUTPUT_ORDER.flatMap((roleName) => {
    const roleCount = roleCounts.get(roleName) ?? 0;

    return roleCount > 0 ? [`${roleName}:${roleCount}`] : [];
  });

  return roleSegments.length === 0 ? '-' : roleSegments.join(',');
};

const formatRoadRatioCount = (roads, hitsRatio) => {
  const matchingRoadCount = roads.filter((road) => isBelowHitsRatio(road, hitsRatio)).length;

  return `${matchingRoadCount}/${roads.length}`;
};

const isBelowHitsRatio = (roomObject, hitsRatio) => {
  const hits = readNumberField(roomObject, 'hits');
  const hitsMax = readNumberField(roomObject, 'hitsMax');

  return hits !== null && hitsMax !== null && hitsMax > 0 && hits / hitsMax < hitsRatio;
};

const formatRoadMinHits = (roads) => {
  const roadWithMinHitsRatio = roads
    .filter(
      (road) => readNumberField(road, 'hits') !== null && readNumberField(road, 'hitsMax') !== null,
    )
    .sort((leftRoad, rightRoad) => readHitsRatio(leftRoad) - readHitsRatio(rightRoad))[0];

  if (roadWithMinHitsRatio === undefined) {
    return '-';
  }

  return `${readNumberField(roadWithMinHitsRatio, 'hits')}/${readNumberField(
    roadWithMinHitsRatio,
    'hitsMax',
  )}`;
};

const readHitsRatio = (roomObject) => {
  const hits = readNumberField(roomObject, 'hits') ?? 0;
  const hitsMax = readNumberField(roomObject, 'hitsMax') ?? 1;

  return hitsMax > 0 ? hits / hitsMax : Number.POSITIVE_INFINITY;
};

const formatConstructionProgress = (constructionSites) => {
  const progress = constructionSites.reduce(
    (totalProgress, constructionSite) =>
      totalProgress + (readNumberField(constructionSite, 'progress') ?? 0),
    0,
  );
  const progressTotal = constructionSites.reduce(
    (totalProgress, constructionSite) =>
      totalProgress + (readNumberField(constructionSite, 'progressTotal') ?? 0),
    0,
  );

  return `${progress}/${progressTotal}`;
};

const formatRefillAccess = (roomObjects, ownedUserId, terrainText) => {
  const refillTargets = roomObjects
    .filter(
      (roomObject) =>
        isRefillAccessTarget(roomObject) && objectBelongsToUser(roomObject, ownedUserId),
    )
    .map((roomObject) => ({
      accessCount: countAccessibleAdjacentPositions(roomObject, roomObjects, terrainText),
      label: formatRefillTargetLabel(roomObject),
    }))
    .sort((leftTarget, rightTarget) =>
      leftTarget.accessCount === rightTarget.accessCount
        ? leftTarget.label.localeCompare(rightTarget.label)
        : leftTarget.accessCount - rightTarget.accessCount,
    );

  if (refillTargets.length === 0) {
    return '-';
  }

  const lowAccessTargets = refillTargets.filter((target) => target.accessCount <= 1);
  const worstTarget = refillTargets[0];

  return `min=${worstTarget.accessCount} low=${lowAccessTargets.length}/${refillTargets.length} worst=${worstTarget.label}:${worstTarget.accessCount}`;
};

const countAccessibleAdjacentPositions = (targetObject, roomObjects, terrainText) => {
  const targetX = readNumberField(targetObject, 'x');
  const targetY = readNumberField(targetObject, 'y');

  if (targetX === null || targetY === null) {
    return 0;
  }

  const accessBlockedPositionKeys = collectAccessBlockedPositionKeys(roomObjects);
  let accessCount = 0;

  for (let y = targetY - 1; y <= targetY + 1; y += 1) {
    for (let x = targetX - 1; x <= targetX + 1; x += 1) {
      if ((x === targetX && y === targetY) || x <= 0 || x >= 49 || y <= 0 || y >= 49) {
        continue;
      }

      if (!isWallTerrain(x, y, terrainText) && !accessBlockedPositionKeys.has(`${x},${y}`)) {
        accessCount += 1;
      }
    }
  }

  return accessCount;
};

const collectAccessBlockedPositionKeys = (roomObjects) =>
  new Set(
    roomObjects
      .filter((roomObject) => !isWalkableAccessObject(roomObject))
      .flatMap((roomObject) => {
        const x = readNumberField(roomObject, 'x');
        const y = readNumberField(roomObject, 'y');

        return x === null || y === null ? [] : [`${x},${y}`];
      }),
  );

const isRefillAccessTarget = (roomObject) =>
  ['spawn', 'extension', 'tower', 'storage'].includes(readStructureType(roomObject));

const isWalkableAccessObject = (roomObject) =>
  [
    'container',
    'creep',
    'energy',
    'resource',
    'road',
    'rampart',
    'ruin',
    'source',
    'tombstone',
  ].includes(readStructureType(roomObject));

const readStructureType = (roomObject) =>
  readStringField(roomObject, 'type') === 'constructionSite'
    ? readStringField(roomObject, 'structureType')
    : readStringField(roomObject, 'type');

const formatRefillTargetLabel = (roomObject) =>
  `${readStructureType(roomObject)}@${readNumberField(roomObject, 'x')},${readNumberField(
    roomObject,
    'y',
  )}`;

const isWallTerrain = (x, y, terrainText) => terrainText[y * 50 + x] === '1';

const formatSourceContainerEnergy = (roomObjects) => {
  const sourceObjects = roomObjects.filter(
    (roomObject) => readStringField(roomObject, 'type') === 'source',
  );
  const sourceContainers = roomObjects
    .filter(
      (roomObject) =>
        readStringField(roomObject, 'type') === 'container' &&
        sourceObjects.some((sourceObject) => measureRange(roomObject, sourceObject) <= 1),
    )
    .sort((leftContainer, rightContainer) =>
      readNumberField(leftContainer, 'x') === readNumberField(rightContainer, 'x')
        ? (readNumberField(leftContainer, 'y') ?? 0) - (readNumberField(rightContainer, 'y') ?? 0)
        : (readNumberField(leftContainer, 'x') ?? 0) - (readNumberField(rightContainer, 'x') ?? 0),
    );

  if (sourceContainers.length === 0) {
    return '-';
  }

  return sourceContainers.map(formatContainerEnergy).join('|');
};

const formatContainerEnergy = (containerObject) =>
  `${readNumberField(containerObject, 'x')},${readNumberField(containerObject, 'y')}:${readEnergyAmount(
    containerObject,
  )}/${readEnergyCapacity(containerObject)}`;

const measureRange = (leftRoomObject, rightRoomObject) =>
  Math.max(
    Math.abs(
      (readNumberField(leftRoomObject, 'x') ?? 0) - (readNumberField(rightRoomObject, 'x') ?? 0),
    ),
    Math.abs(
      (readNumberField(leftRoomObject, 'y') ?? 0) - (readNumberField(rightRoomObject, 'y') ?? 0),
    ),
  );

const selectOwnedSpawn = (roomObjects, ownedUserId) =>
  roomObjects
    .filter(
      (roomObject) =>
        readStringField(roomObject, 'type') === 'spawn' &&
        objectBelongsToUser(roomObject, ownedUserId),
    )
    .sort((leftSpawn, rightSpawn) =>
      readStringField(leftSpawn, 'name').localeCompare(readStringField(rightSpawn, 'name')),
    )[0] ?? null;

const objectBelongsToUser = (roomObject, userId) => {
  if (userId === '') {
    return true;
  }

  return readStringField(roomObject, 'user') === userId;
};

const readEnergyAmount = (roomObject) =>
  readNumberField(roomObject, 'energy') ??
  readNestedNumberField(roomObject, 'store', 'energy') ??
  '-';

const readEnergyCapacity = (roomObject) =>
  readNumberField(roomObject, 'energyCapacity') ??
  readNumberField(roomObject, 'storeCapacity') ??
  readNestedNumberField(roomObject, 'storeCapacityResource', 'energy') ??
  readNestedNumberField(roomObject, 'store', 'energyCapacity') ??
  '-';

const readNestedNumberField = (roomObject, outerFieldName, innerFieldName) => {
  if (!isPlainObject(roomObject)) {
    return null;
  }

  return readNumberField(roomObject[outerFieldName], innerFieldName);
};

const readNumberField = (roomObject, fieldName) => {
  if (!isPlainObject(roomObject)) {
    return null;
  }

  const fieldValue = roomObject[fieldName];

  return typeof fieldValue === 'number' && Number.isFinite(fieldValue) ? fieldValue : null;
};

const readStringField = (roomObject, fieldName) => {
  if (!isPlainObject(roomObject)) {
    return '';
  }

  const fieldValue = roomObject[fieldName];

  return typeof fieldValue === 'string' ? fieldValue : '';
};

const readFollowingArgument = (commandArguments, argumentIndex, argumentName) => {
  const argumentText = commandArguments[argumentIndex + 1];

  if (argumentText === undefined || argumentText.startsWith('--')) {
    throw new RoleRecoveryStatusError(`Missing value after ${argumentName}.`);
  }

  return argumentText;
};

const isPlainObject = (candidateValue) =>
  typeof candidateValue === 'object' && candidateValue !== null && !Array.isArray(candidateValue);

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await checkRoleRecoveryStatus();
  } catch (caughtError) {
    reportCommandFailure('status:role-recovery:screeps', caughtError);
  }
}
