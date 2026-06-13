import fs from 'node:fs/promises';
import path from 'node:path';

import { SERVER_PACKAGE_ROOT } from '../framework/local-server-contract.mjs';

export async function writeStatusMod(statusModPath, statusFilePath, activeBotRuntimeContract) {
  await writeStatusModSource(
    statusModPath,
    statusFilePath,
    activeBotRuntimeContract,
    'function registerDefenseStatusObserver() {}',
  );
}

export async function writeDefenseStatusMod(
  statusModPath,
  statusFilePath,
  activeBotRuntimeContract,
  defenseRuntimeContract,
) {
  await writeStatusModSource(
    statusModPath,
    statusFilePath,
    activeBotRuntimeContract,
    createDefenseStatusObserverSource(defenseRuntimeContract),
  );
}

async function writeStatusModSource(
  statusModPath,
  statusFilePath,
  activeBotRuntimeContract,
  defenseStatusObserverSource,
) {
  const statusModSource = `'use strict';

const fs = require('fs');
const { createRequire } = require('module');
const statusFilePath = ${JSON.stringify(statusFilePath)};
const activeBotUsername = ${JSON.stringify(activeBotRuntimeContract.username)};
const memoryRootKey = ${JSON.stringify(activeBotRuntimeContract.memoryRootKey)};
const serverPackageManifestPath = ${JSON.stringify(path.join(SERVER_PACKAGE_ROOT, 'package.json'))};

function writeStatus(event, fields) {
  const statusRecord = Object.assign({
    event,
    pid: process.pid,
    time: new Date().toISOString()
  }, fields || {});

  fs.appendFileSync(statusFilePath, JSON.stringify(statusRecord) + '\\n');
}

function readMemoryObject(memoryEnvelope) {
  if (!memoryEnvelope || typeof memoryEnvelope.data !== 'string') {
    return null;
  }

  try {
    return JSON.parse(memoryEnvelope.data || '{}');
  } catch (error) {
    return null;
  }
}

function readMemorySchemaVersion(memoryObject) {
  const memoryRoot = memoryObject && memoryObject[memoryRootKey];

  return memoryRoot && memoryRoot.schemaVersion;
}

function registerOfflineSteamWebApi() {
  const serverPackageRequire = createRequire(serverPackageManifestPath);
  const SteamWebApi = serverPackageRequire('steam-webapi');

  SteamWebApi.ready = function readyWithoutSteamNetwork(keyOrCallback, maybeCallback) {
    const callback = typeof keyOrCallback === 'function' ? keyOrCallback : maybeCallback;

    if (typeof callback === 'function') {
      process.nextTick(callback);
    }
  };

  writeStatus('steam-webapi-offline');
}

${defenseStatusObserverSource}

module.exports = function registerScreepsServerTestStatus(config) {
  writeStatus('mod-loaded', {
    hasBackend: Boolean(config.backend),
    hasEngine: Boolean(config.engine),
    hasStorage: Boolean(config.storage)
  });

  if (config.storage && typeof config.storage.loadDb === 'function') {
    const loadOfficialDb = config.storage.loadDb;

    config.storage.loadDb = function loadDbWithStatus() {
      writeStatus('storage-load-start');
      return Promise.resolve(loadOfficialDb.apply(this, arguments)).then(
        (loadedDatabase) => {
          writeStatus('storage-ready');
          return loadedDatabase;
        },
        (storageError) => {
          writeStatus('storage-error', {
            message: String(storageError && (storageError.stack || storageError))
          });
          throw storageError;
        }
      );
    };
  }

  if (config.backend) {
    registerOfflineSteamWebApi();

    config.backend.on('expressPostConfig', function onExpressPostConfig() {
      writeStatus('backend-ready');
    });
  }

  if (config.engine) {
    config.engine.on('init', function onEngineInit(processType) {
      writeStatus('engine-init', { processType });
    });

    config.engine.on('runnerLoopStage', function onRunnerLoopStage(stage, runResult) {
      if (stage !== 'saveResultFinish' || !runResult || runResult.username !== activeBotUsername) {
        return;
      }

      if (runResult.error) {
        writeStatus('player-runtime-error', {
          error: String(runResult.error && (runResult.error.stack || runResult.error)),
          username: runResult.username
        });
      }

      const consoleLines = runResult.console && Array.isArray(runResult.console.log)
        ? runResult.console.log
        : [];
      const heartbeatLine = consoleLines.find(
        (line) => typeof line === 'string' && line.startsWith('[tick ')
      );

      if (heartbeatLine) {
        const botMemory = readMemoryObject(runResult.memory);

        writeStatus('player-heartbeat', {
          line: heartbeatLine,
          memory: botMemory,
          memorySchemaVersion: readMemorySchemaVersion(botMemory),
          username: runResult.username
        });
        console.log('[screeps-server-test] player-heartbeat ' + activeBotUsername + ' ' + heartbeatLine);
      }
    });
  }

  registerDefenseStatusObserver(config);
};
`;

  await fs.writeFile(statusModPath, statusModSource, 'utf8');
}

function createDefenseStatusObserverSource(defenseRuntimeContract) {
  return `
const defenseControllerId = ${JSON.stringify(defenseRuntimeContract.controllerId)};
const defenseConstructionSiteId = ${JSON.stringify(defenseRuntimeContract.constructionSiteId ?? null)};
const defenseHostileCreepId = ${JSON.stringify(defenseRuntimeContract.hostileCreepId)};
const defenseInitialConstructionProgress = ${JSON.stringify(defenseRuntimeContract.initialConstructionProgress ?? null)};
const defenseInitialControllerProgress = ${JSON.stringify(defenseRuntimeContract.initialControllerProgress ?? null)};
const defenseRoomName = ${JSON.stringify(defenseRuntimeContract.roomName)};
const defenseUserId = ${JSON.stringify(defenseRuntimeContract.userId)};
const writtenDefenseStatusKeys = new Set();

function findDefenseHostile(roomObjects) {
  return roomObjects && roomObjects[defenseHostileCreepId] || null;
}

function findDefenseController(roomObjects) {
  return roomObjects && roomObjects[defenseControllerId] || null;
}

function findDefenseConstructionSite(roomObjects) {
  return defenseConstructionSiteId && roomObjects && roomObjects[defenseConstructionSiteId] || null;
}

function toDefenseHostileStatus(hostileCreep) {
  if (!hostileCreep) {
    return null;
  }

  return {
    bodyParts: Array.isArray(hostileCreep.body)
      ? hostileCreep.body.map((bodyPart) => ({
          hits: bodyPart.hits,
          type: bodyPart.type
        }))
      : [],
    hits: hostileCreep.hits,
    id: hostileCreep._id,
    roomName: hostileCreep.room,
    user: hostileCreep.user,
    x: hostileCreep.x,
    y: hostileCreep.y
  };
}

function toDefenseConstructionSiteStatus(constructionSite) {
  if (!constructionSite) {
    return null;
  }

  return {
    id: constructionSite._id,
    progress: constructionSite.progress || 0,
    progressTotal: constructionSite.progressTotal || 0,
    roomName: constructionSite.room,
    structureType: constructionSite.structureType,
    x: constructionSite.x,
    y: constructionSite.y
  };
}

function writeDefenseStatusOnce(event, statusKey, fields) {
  const defenseStatusKey = event + ':' + statusKey;

  if (writtenDefenseStatusKeys.has(defenseStatusKey)) {
    return;
  }

  writtenDefenseStatusKeys.add(defenseStatusKey);
  writeStatus(event, fields);
}

function writeDefenseSafeModeStatus(event, controller, roomObjects, gameTime) {
  writeStatus(event, {
    controllerId: controller._id,
    gameTime,
    hostile: toDefenseHostileStatus(findDefenseHostile(roomObjects)),
    roomName: controller.room,
    safeMode: controller.safeMode || null,
    safeModeAvailable: controller.safeModeAvailable || 0
  });
}

function writeDefenseObservationStatus(controller, roomObjects, gameTime) {
  const hostileStatus = toDefenseHostileStatus(findDefenseHostile(roomObjects));

  if (!hostileStatus) {
    return;
  }

  writeDefenseStatusOnce('defense-hostile-observed', defenseHostileCreepId, {
    controllerId: controller._id,
    gameTime,
    hostile: hostileStatus,
    roomName: controller.room,
    safeMode: controller.safeMode || null,
    safeModeActive: controller.safeMode > gameTime,
    safeModeAvailable: controller.safeModeAvailable || 0
  });

  if (!(controller.safeMode > gameTime)) {
    writeDefenseStatusOnce('defense-no-safe-mode', defenseHostileCreepId + ':' + gameTime, {
      controllerId: controller._id,
      gameTime,
      hostile: hostileStatus,
      roomName: controller.room,
      safeMode: controller.safeMode || null,
      safeModeActive: false,
      safeModeAvailable: controller.safeModeAvailable || 0
    });
  }
}

function writeDefenseConstructionStatus(controller, roomObjects, gameTime) {
  const constructionSite = findDefenseConstructionSite(roomObjects);

  if (!constructionSite) {
    return;
  }

  const constructionSiteStatus = toDefenseConstructionSiteStatus(constructionSite);
  const constructionStatusFields = {
    constructionSite: constructionSiteStatus,
    controllerId: controller._id,
    controllerProgress: controller.progress || 0,
    gameTime,
    hostile: toDefenseHostileStatus(findDefenseHostile(roomObjects)),
    roomName: controller.room,
    safeMode: controller.safeMode || null,
    safeModeActive: controller.safeMode > gameTime,
    safeModeAvailable: controller.safeModeAvailable || 0
  };

  if (
    defenseInitialConstructionProgress !== null &&
    constructionSiteStatus.progress > defenseInitialConstructionProgress
  ) {
    writeDefenseStatusOnce(
      'defense-construction-progress',
      defenseConstructionSiteId,
      constructionStatusFields
    );
  }

  if (
    defenseInitialConstructionProgress !== null &&
    defenseInitialControllerProgress !== null &&
    constructionSiteStatus.progress === defenseInitialConstructionProgress &&
    constructionStatusFields.controllerProgress > defenseInitialControllerProgress
  ) {
    writeDefenseStatusOnce(
      'defense-construction-deferred',
      defenseConstructionSiteId,
      constructionStatusFields
    );
  }
}

function registerDefenseStatusObserver(config) {
  if (!config.engine) {
    return;
  }

  config.engine.on(
    'preProcessObjectIntents',
    function onDefenseSafeModeIntent(controller, userId, objectIntents, roomObjects, roomTerrain, gameTime) {
      if (
        !controller ||
        controller._id !== defenseControllerId ||
        userId !== defenseUserId ||
        !objectIntents ||
        !objectIntents.activateSafeMode
      ) {
        return;
      }

      writeDefenseSafeModeStatus('safe-mode-intent', controller, roomObjects, gameTime);
    }
  );

  config.engine.on(
    'processObjectIntents',
    function onDefenseSafeModeAccepted(controller, userId, objectIntents, roomObjects, roomTerrain, gameTime) {
      if (
        !controller ||
        controller._id !== defenseControllerId ||
        controller._safeModeActivated !== 1
      ) {
        return;
      }

      writeDefenseSafeModeStatus('safe-mode-accepted', controller, roomObjects, gameTime);
    }
  );

  config.engine.on('processObject', function onDefenseSafeModeActive(controller, roomObjects, roomTerrain, gameTime) {
    if (
      !controller ||
      controller._id !== defenseControllerId ||
      controller.room !== defenseRoomName ||
      !(controller.safeMode > gameTime)
    ) {
      return;
    }

    writeDefenseSafeModeStatus('safe-mode-active', controller, roomObjects, gameTime);
  });

  config.engine.on('processRoom', function onDefenseRoomObserved(
    roomName,
    roomInfo,
    roomObjects,
    roomTerrain,
    gameTime
  ) {
    if (roomName !== defenseRoomName) {
      return;
    }

    const controller = findDefenseController(roomObjects);

    if (!controller) {
      return;
    }

    writeDefenseObservationStatus(controller, roomObjects, gameTime);
    writeDefenseConstructionStatus(controller, roomObjects, gameTime);
  });
}
`;
}
