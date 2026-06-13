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
} from './screeps-api.mjs';

const CONSOLE_HEARTBEAT_TIMEOUT_MS = 30000;
const SOCKJS_SESSION_ALPHABET = 'abcdefghijklmnopqrstuvwxyz012345';

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
  const remoteModules = await readRemoteModuleSet(screepsConfig);
  const survivalSummary = summarizeLiveRoomSurvival(roomObjects);
  const naturalHeartbeat = await readNaturalConsoleHeartbeat(
    screepsConfig,
    accountIdentity.accountId,
    statusRequest,
  );

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
      'naturalTickHeartbeat=verified',
      `tick=${naturalHeartbeat.tick}`,
      `heartbeatShard=${naturalHeartbeat.shardName}`,
      `heartbeatRoom=${naturalHeartbeat.roomName}`,
      `heartbeatCpu=${naturalHeartbeat.cpu}`,
      `heartbeatBucket=${naturalHeartbeat.bucket}`,
      `heartbeatLimit=${naturalHeartbeat.limit}`,
      `heartbeatTickLimit=${naturalHeartbeat.tickLimit}`,
      `heartbeatBudget=${naturalHeartbeat.budget}`,
      `heartbeatWorkers=${naturalHeartbeat.workerCount}`,
      `heartbeatSpawnEnergy=${naturalHeartbeat.spawnEnergy}`,
      `heartbeatConstruction=${naturalHeartbeat.constructionSiteCount}`,
      `heartbeatHostiles=${naturalHeartbeat.hostileCount}`,
      'constants=official-runtime-capture',
    ].join(' '),
  );
};

const readNaturalConsoleHeartbeat = (screepsConfig, accountId, statusRequest) =>
  new Promise((resolve, reject) => {
    const WebSocketConstructor = globalThis.WebSocket;

    if (typeof WebSocketConstructor !== 'function') {
      reject(new LiveSurvivalStatusError('WebSocket is not available in this Node runtime.'));
      return;
    }

    let heartbeatSocket;
    let settled = false;

    const heartbeatWatchdog = setTimeout(() => {
      settleWithError(
        new LiveSurvivalStatusError(
          `Timed out waiting for P4 natural console heartbeat on ${statusRequest.shardName}/${statusRequest.roomName}.`,
        ),
      );
    }, CONSOLE_HEARTBEAT_TIMEOUT_MS);

    const settleWithHeartbeat = (heartbeatEvidence) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(heartbeatWatchdog);
      heartbeatSocket?.close();
      resolve(heartbeatEvidence);
    };

    function settleWithError(statusError) {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(heartbeatWatchdog);
      heartbeatSocket?.close();
      reject(statusError);
    }

    try {
      heartbeatSocket = new WebSocketConstructor(
        buildConsoleWebSocketUrl(screepsConfig).toString(),
      );
    } catch (caughtError) {
      settleWithError(
        new LiveSurvivalStatusError(
          `Failed to open Screeps console websocket: ${readCaughtErrorMessage(caughtError)}`,
        ),
      );
      return;
    }

    heartbeatSocket.onmessage = (messageEvent) => {
      const frameText =
        typeof messageEvent.data === 'string' ? messageEvent.data : String(messageEvent.data);

      let sockJsFrame;

      try {
        sockJsFrame = decodeSockJsFrame(frameText);
      } catch (caughtError) {
        settleWithError(
          new LiveSurvivalStatusError(
            `Screeps console websocket returned malformed frame: ${readCaughtErrorMessage(
              caughtError,
            )}`,
          ),
        );
        return;
      }

      if (sockJsFrame.type === 'open') {
        heartbeatSocket.send(JSON.stringify([`auth ${screepsConfig.token}`]));
        return;
      }

      if (sockJsFrame.type === 'close') {
        settleWithError(
          new LiveSurvivalStatusError(
            'Screeps console websocket closed before P4 heartbeat was observed.',
          ),
        );
        return;
      }

      for (const messageText of sockJsFrame.messages) {
        if (messageText === 'auth failed') {
          settleWithError(
            new LiveSurvivalStatusError('Screeps console websocket authentication failed.'),
          );
          return;
        }

        if (messageText.startsWith('auth ok')) {
          heartbeatSocket.send(JSON.stringify([`subscribe user:${accountId}/console`]));
          continue;
        }

        let heartbeatEvidence;

        try {
          heartbeatEvidence = readConsoleHeartbeatMessage(messageText, accountId, statusRequest);
        } catch (caughtError) {
          settleWithError(
            caughtError instanceof LiveSurvivalStatusError
              ? caughtError
              : new LiveSurvivalStatusError(
                  `Failed to decode Screeps console heartbeat: ${readCaughtErrorMessage(
                    caughtError,
                  )}`,
                ),
          );
          return;
        }

        if (heartbeatEvidence !== null) {
          settleWithHeartbeat(heartbeatEvidence);
          return;
        }
      }
    };

    heartbeatSocket.onerror = () => {
      settleWithError(
        new LiveSurvivalStatusError(
          'Screeps console websocket error before P4 heartbeat was observed.',
        ),
      );
    };

    heartbeatSocket.onclose = () => {
      settleWithError(
        new LiveSurvivalStatusError(
          'Screeps console websocket closed before P4 heartbeat was observed.',
        ),
      );
    };
  });

const buildConsoleWebSocketUrl = (screepsConfig) => {
  const socketProtocol = screepsConfig.protocol === 'https' ? 'wss' : 'ws';
  const socketUrl = new URL('/socket/', `${socketProtocol}://${screepsConfig.server}`);

  socketUrl.pathname = `/socket/${createSockJsServerId()}/${createSockJsSessionId()}/websocket`;

  return socketUrl;
};

const createSockJsServerId = () =>
  Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');

const createSockJsSessionId = () =>
  Array.from(
    { length: 8 },
    () => SOCKJS_SESSION_ALPHABET[Math.floor(Math.random() * SOCKJS_SESSION_ALPHABET.length)],
  ).join('');

const decodeSockJsFrame = (frameText) => {
  if (frameText === 'o') {
    return { messages: [], type: 'open' };
  }

  if (frameText === 'h') {
    return { messages: [], type: 'heartbeat' };
  }

  if (frameText.startsWith('a')) {
    const messageTexts = JSON.parse(frameText.slice(1));

    if (
      !Array.isArray(messageTexts) ||
      !messageTexts.every((messageText) => typeof messageText === 'string')
    ) {
      throw new Error('SockJS message array did not contain only strings.');
    }

    return { messages: messageTexts, type: 'messages' };
  }

  if (frameText.startsWith('m')) {
    const messageText = JSON.parse(frameText.slice(1));

    if (typeof messageText !== 'string') {
      throw new Error('SockJS single message was not a string.');
    }

    return { messages: [messageText], type: 'messages' };
  }

  if (frameText.startsWith('c')) {
    return { messages: [], type: 'close' };
  }

  return { messages: [], type: 'unknown' };
};

const readConsoleHeartbeatMessage = (messageText, accountId, statusRequest) => {
  let channelUpdate;

  try {
    channelUpdate = JSON.parse(messageText);
  } catch {
    return null;
  }

  if (!Array.isArray(channelUpdate) || channelUpdate.length !== 2) {
    return null;
  }

  const [channelName, consoleUpdate] = channelUpdate;
  const consoleChannelName = `user:${accountId}/console`;

  if (channelName !== consoleChannelName || !isPlainObject(consoleUpdate)) {
    return null;
  }

  if (readStringField(consoleUpdate, 'shard') !== statusRequest.shardName) {
    return null;
  }

  const messages = consoleUpdate.messages;

  if (!isPlainObject(messages) || !Array.isArray(messages.log)) {
    return null;
  }

  for (const consoleLine of messages.log) {
    if (typeof consoleLine !== 'string' || !consoleLine.startsWith('[tick ')) {
      continue;
    }

    return parseRuntimeMonitorHeartbeat(consoleLine, statusRequest);
  }

  return null;
};

const parseRuntimeMonitorHeartbeat = (consoleLine, statusRequest) => {
  const heartbeatMatch =
    /^\[tick (?<tick>\d+)\] cpu=(?<cpu>\d+(?:\.\d+)?) bucket=(?<bucket>\d+) limit=(?<limit>\d+) tickLimit=(?<tickLimit>\d+) budget=(?<budget>[A-Za-z0-9-]+) rooms=(?<roomSummaries>.+)$/u.exec(
      consoleLine,
    );

  if (heartbeatMatch?.groups === undefined) {
    throw new LiveSurvivalStatusError(
      `P4 heartbeat on ${statusRequest.shardName} is missing required CPU or budget fields.`,
    );
  }

  const roomSummary = readHeartbeatRoomSummary(
    heartbeatMatch.groups.roomSummaries,
    statusRequest.roomName,
    statusRequest.shardName,
  );

  return {
    bucket: heartbeatMatch.groups.bucket,
    budget: heartbeatMatch.groups.budget,
    constructionSiteCount: roomSummary.constructionSiteCount,
    cpu: heartbeatMatch.groups.cpu,
    hostileCount: roomSummary.hostileCount,
    limit: heartbeatMatch.groups.limit,
    roomName: statusRequest.roomName,
    shardName: statusRequest.shardName,
    spawnEnergy: roomSummary.spawnEnergy,
    tick: heartbeatMatch.groups.tick,
    tickLimit: heartbeatMatch.groups.tickLimit,
    workerCount: roomSummary.workerCount,
  };
};

const readHeartbeatRoomSummary = (roomSummariesText, targetRoomName, shardName) => {
  const roomSummaryTexts = roomSummariesText.split(',');
  const matchingRoomSummaryText = roomSummaryTexts.find(
    (roomSummaryText) => roomSummaryText.split(':')[0] === targetRoomName,
  );

  if (matchingRoomSummaryText === undefined) {
    throw new LiveSurvivalStatusError(
      `P4 heartbeat on ${shardName} did not include target room ${targetRoomName}.`,
    );
  }

  const roomSummaryParts = matchingRoomSummaryText.split(':');
  const roomFields = new Map(
    roomSummaryParts.slice(1).map((roomSummaryPart) => {
      const separatorIndex = roomSummaryPart.indexOf('=');

      if (separatorIndex === -1) {
        return [roomSummaryPart, ''];
      }

      return [roomSummaryPart.slice(0, separatorIndex), roomSummaryPart.slice(separatorIndex + 1)];
    }),
  );

  const workerCount = readRequiredRoomSummaryNumber(roomFields, 'workers', targetRoomName);
  const spawnEnergy = readRequiredRoomSummaryEnergy(roomFields, targetRoomName);
  const constructionSiteCount = readRequiredRoomSummaryNumber(
    roomFields,
    'construction',
    targetRoomName,
  );
  const hostileCount = readRequiredRoomSummaryNumber(roomFields, 'hostiles', targetRoomName);

  return {
    constructionSiteCount,
    hostileCount,
    spawnEnergy,
    workerCount,
  };
};

const readRequiredRoomSummaryNumber = (roomFields, fieldName, roomName) => {
  const fieldValue = roomFields.get(fieldName);

  if (fieldValue === undefined || !/^\d+$/u.test(fieldValue)) {
    throw new LiveSurvivalStatusError(
      `P4 heartbeat room ${roomName} is missing ${fieldName} summary.`,
    );
  }

  return fieldValue;
};

const readRequiredRoomSummaryEnergy = (roomFields, roomName) => {
  const spawnEnergy = roomFields.get('spawnEnergy');

  if (spawnEnergy === undefined || !/^\d+\/\d+$/u.test(spawnEnergy)) {
    throw new LiveSurvivalStatusError(
      `P4 heartbeat room ${roomName} is missing spawnEnergy summary.`,
    );
  }

  return spawnEnergy;
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

const readCaughtErrorMessage = (caughtError) => {
  if (caughtError instanceof Error) {
    return caughtError.message;
  }

  return String(caughtError);
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
