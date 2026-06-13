#!/usr/bin/env node

import { pathToFileURL } from 'node:url';

import { reportCommandFailure } from './command-failure.mjs';
import { readMainScreepsConfig, readMainScreepsConfigFrom } from './config.mjs';
import { hashModuleSet } from './module-set.mjs';
import { readRemoteModuleSet, readRoomObjects, readRoomStatus } from './screeps-api.mjs';

export class LiveSurvivalStatusError extends Error {
  constructor(message) {
    super(message);
    this.name = 'LiveSurvivalStatusError';
  }
}

export const checkLiveSurvivalStatus = async (commandArguments = process.argv.slice(2)) => {
  const statusRequest = parseLiveSurvivalStatusRequest(commandArguments);
  const screepsConfig = await readMainScreepsConfig();

  await printLiveSurvivalStatus(screepsConfig, statusRequest);
};

export const checkLiveSurvivalStatusFrom = async (workspacePath, commandArguments) => {
  const statusRequest = parseLiveSurvivalStatusRequest(commandArguments);
  const screepsConfig = await readMainScreepsConfigFrom(workspacePath);

  await printLiveSurvivalStatus(screepsConfig, statusRequest);
};

export const parseLiveSurvivalStatusRequest = (commandArguments) => {
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

    throw new LiveSurvivalStatusError(`Unknown argument "${commandArgument}".`);
  }

  if (shardName === null) {
    throw new LiveSurvivalStatusError('Missing --shard <name>.');
  }

  if (roomName === null) {
    throw new LiveSurvivalStatusError('Missing --room <name>.');
  }

  return {
    roomName,
    shardName,
  };
};

const printLiveSurvivalStatus = async (screepsConfig, statusRequest) => {
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
  const remoteModules = await readRemoteModuleSet(screepsConfig);
  const survivalSummary = summarizeLiveRoomSurvival(roomObjects);

  console.log(
    [
      '[status:live:screeps]',
      `branch=${screepsConfig.branch}`,
      `shard=${statusRequest.shardName}`,
      `room=${statusRequest.roomName}`,
      `status=${roomStatus}`,
      `moduleHash=${hashModuleSet(remoteModules)}`,
      `controllerLevel=${survivalSummary.controllerLevel}`,
      `controllerDowngradeTime=${survivalSummary.controllerDowngradeTime}`,
      `controllerProgress=${survivalSummary.controllerProgress}`,
      `workerCount=${survivalSummary.workerCount}`,
      `spawnEnergy=${survivalSummary.spawnEnergy}`,
      `spawning=${survivalSummary.spawning}`,
      `constructionSites=${survivalSummary.constructionSiteCount}`,
      `constructionProgress=${survivalSummary.constructionProgress}`,
      `hostileCreeps=${survivalSummary.hostileCreepCount}`,
      `hostileSpawns=${survivalSummary.hostileSpawnCount}`,
      `hostileTowers=${survivalSummary.hostileTowerCount}`,
      'constants=official-runtime-capture',
    ].join(' '),
  );
};

const summarizeLiveRoomSurvival = (roomObjects) => {
  const ownedSpawn = selectOwnedSpawn(roomObjects);
  const ownedUserId = readStringField(ownedSpawn, 'user');
  const spawnName = readStringField(ownedSpawn, 'name');
  const controller = roomObjects.find(
    (roomObject) => readStringField(roomObject, 'type') === 'controller',
  );
  const constructionSites = roomObjects.filter(
    (roomObject) =>
      readStringField(roomObject, 'type') === 'constructionSite' &&
      objectBelongsToUser(roomObject, ownedUserId),
  );

  return {
    constructionProgress: formatConstructionProgress(constructionSites),
    constructionSiteCount: constructionSites.length,
    controllerDowngradeTime: formatOptionalNumber(readNumberField(controller, 'downgradeTime')),
    controllerLevel: formatOptionalNumber(readNumberField(controller, 'level')),
    controllerProgress: formatOptionalNumber(readNumberField(controller, 'progress')),
    hostileCreepCount: countHostileObjects(roomObjects, ownedUserId, 'creep'),
    hostileSpawnCount: countHostileObjects(roomObjects, ownedUserId, 'spawn'),
    hostileTowerCount: countHostileObjects(roomObjects, ownedUserId, 'tower'),
    spawnEnergy: formatSpawnEnergy(ownedSpawn),
    spawning: readSpawningState(ownedSpawn),
    workerCount: countWorkerCreeps(roomObjects, ownedUserId, spawnName),
  };
};

const selectOwnedSpawn = (roomObjects) =>
  roomObjects
    .filter((roomObject) => readStringField(roomObject, 'type') === 'spawn')
    .sort((leftSpawn, rightSpawn) =>
      readStringField(leftSpawn, 'name').localeCompare(readStringField(rightSpawn, 'name')),
    )[0] ?? null;

const countWorkerCreeps = (roomObjects, ownedUserId, spawnName) =>
  roomObjects.filter((roomObject) => {
    if (readStringField(roomObject, 'type') !== 'creep') {
      return false;
    }

    if (!objectBelongsToUser(roomObject, ownedUserId)) {
      return false;
    }

    const creepName = readStringField(roomObject, 'name');

    return spawnName === ''
      ? creepName.includes('-worker-')
      : creepName.startsWith(`${spawnName}-worker-`);
  }).length;

const countHostileObjects = (roomObjects, ownedUserId, objectType) =>
  roomObjects.filter(
    (roomObject) =>
      readStringField(roomObject, 'type') === objectType &&
      !objectBelongsToUser(roomObject, ownedUserId),
  ).length;

const objectBelongsToUser = (roomObject, userId) => {
  if (userId === '') {
    return true;
  }

  return readStringField(roomObject, 'user') === userId;
};

const formatSpawnEnergy = (spawnObject) => {
  const availableEnergy = readEnergyAmount(spawnObject);
  const energyCapacity = readEnergyCapacity(spawnObject);

  return `${formatOptionalNumber(availableEnergy)}/${formatOptionalNumber(energyCapacity)}`;
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

const readSpawningState = (spawnObject) => {
  if (!isPlainObject(spawnObject)) {
    return 'unknown';
  }

  return spawnObject.spawning ? 'yes' : 'no';
};

const readEnergyAmount = (roomObject) =>
  readNumberField(roomObject, 'energy') ?? readNestedNumberField(roomObject, 'store', 'energy');

const readEnergyCapacity = (roomObject) =>
  readNumberField(roomObject, 'energyCapacity') ??
  readNumberField(roomObject, 'storeCapacity') ??
  readNestedNumberField(roomObject, 'storeCapacityResource', 'energy') ??
  readNestedNumberField(roomObject, 'store', 'energyCapacity');

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

const formatOptionalNumber = (optionalNumber) =>
  typeof optionalNumber === 'number' ? `${optionalNumber}` : '-';

const readFollowingArgument = (commandArguments, argumentIndex, argumentName) => {
  const argumentText = commandArguments[argumentIndex + 1];

  if (argumentText === undefined || argumentText.startsWith('--')) {
    throw new LiveSurvivalStatusError(`Missing value after ${argumentName}.`);
  }

  return argumentText;
};

const isPlainObject = (candidateValue) =>
  typeof candidateValue === 'object' && candidateValue !== null && !Array.isArray(candidateValue);

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await checkLiveSurvivalStatus();
  } catch (caughtError) {
    reportCommandFailure('status:live:screeps', caughtError);
  }
}
