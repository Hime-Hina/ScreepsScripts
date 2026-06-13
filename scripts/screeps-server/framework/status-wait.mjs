import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';

import { PLAYER_HEARTBEAT_WATCHDOG_MS, READY_WATCHDOG_MS } from './local-server-contract.mjs';

export async function waitForServerReady(preparedRun) {
  return waitForStatusCondition(
    preparedRun.runDirectory,
    preparedRun.statusFilePath,
    findServerReady,
    describeMissingReadySignals,
    READY_WATCHDOG_MS,
  );
}

export async function waitForPlayerHeartbeat(preparedRun) {
  return waitForStatusCondition(
    preparedRun.runDirectory,
    preparedRun.statusFilePath,
    (statusRecords) => findPlayerHeartbeat(statusRecords, preparedRun.playerRuntimeContract),
    () => describeMissingPlayerHeartbeat(preparedRun.playerRuntimeContract),
    PLAYER_HEARTBEAT_WATCHDOG_MS,
  );
}

export async function waitForRuntimeMonitorEvidence(preparedRun) {
  return waitForStatusCondition(
    preparedRun.runDirectory,
    preparedRun.statusFilePath,
    (statusRecords) => findRuntimeMonitorEvidence(statusRecords, preparedRun.playerRuntimeContract),
    () => describeMissingRuntimeMonitorEvidence(preparedRun.playerRuntimeContract),
    PLAYER_HEARTBEAT_WATCHDOG_MS,
  );
}

export async function waitForPlayerMemory(preparedRun) {
  return waitForStatusCondition(
    preparedRun.runDirectory,
    preparedRun.statusFilePath,
    (statusRecords) => findPlayerMemory(statusRecords, preparedRun.playerRuntimeContract),
    () => describeMissingPlayerMemory(preparedRun.playerRuntimeContract),
    PLAYER_HEARTBEAT_WATCHDOG_MS,
  );
}

export async function waitForDefenseSafeModeActivation(preparedRun) {
  const defenseRuntimeContract = readDefenseRuntimeContract(preparedRun);

  return waitForStatusCondition(
    preparedRun.runDirectory,
    preparedRun.statusFilePath,
    (statusRecords) => findDefenseSafeModeActivation(statusRecords, defenseRuntimeContract),
    () => describeMissingDefenseSafeModeActivation(defenseRuntimeContract),
    PLAYER_HEARTBEAT_WATCHDOG_MS,
  );
}

export async function waitForDefenseHostileObserved(preparedRun) {
  const defenseRuntimeContract = readDefenseRuntimeContract(preparedRun);

  return waitForStatusCondition(
    preparedRun.runDirectory,
    preparedRun.statusFilePath,
    (statusRecords) => findDefenseHostileObserved(statusRecords, defenseRuntimeContract),
    () => describeMissingDefenseHostileObserved(defenseRuntimeContract),
    PLAYER_HEARTBEAT_WATCHDOG_MS,
  );
}

export async function waitForDefenseNoSafeMode(preparedRun) {
  const defenseRuntimeContract = readDefenseRuntimeContract(preparedRun);

  return waitForStatusCondition(
    preparedRun.runDirectory,
    preparedRun.statusFilePath,
    (statusRecords) =>
      findDefenseNoSafeMode(
        statusRecords,
        preparedRun.playerRuntimeContract,
        defenseRuntimeContract,
      ),
    () => describeMissingDefenseNoSafeMode(defenseRuntimeContract),
    PLAYER_HEARTBEAT_WATCHDOG_MS,
  );
}

export async function waitForDefenseConstructionContinues(preparedRun) {
  const defenseRuntimeContract = readDefenseRuntimeContract(preparedRun);

  return waitForStatusCondition(
    preparedRun.runDirectory,
    preparedRun.statusFilePath,
    (statusRecords) => findDefenseConstructionProgress(statusRecords, defenseRuntimeContract),
    () => describeMissingDefenseConstructionProgress(defenseRuntimeContract),
    PLAYER_HEARTBEAT_WATCHDOG_MS,
  );
}

export async function waitForDefenseConstructionDeferred(preparedRun) {
  const defenseRuntimeContract = readDefenseRuntimeContract(preparedRun);

  return waitForStatusCondition(
    preparedRun.runDirectory,
    preparedRun.statusFilePath,
    (statusRecords) => findDefenseConstructionDeferred(statusRecords, defenseRuntimeContract),
    () => describeMissingDefenseConstructionDeferred(defenseRuntimeContract),
    PLAYER_HEARTBEAT_WATCHDOG_MS,
  );
}

async function waitForStatusCondition(
  runDirectory,
  statusFilePath,
  findSatisfiedStatus,
  describeMissingStatus,
  watchdogMs,
) {
  return waitForFileCondition(
    runDirectory,
    statusFilePath,
    async () => {
      const statusRecords = await readStatusRecords(statusFilePath);
      const runtimeErrorRecord = statusRecords.find(
        (statusRecord) => statusRecord.event === 'player-runtime-error',
      );

      if (runtimeErrorRecord) {
        throw new Error(`Player runtime error: ${runtimeErrorRecord.error}`);
      }

      return findSatisfiedStatus(statusRecords);
    },
    () => describeMissingStatus(),
    watchdogMs,
  );
}

function findServerReady(statusRecords) {
  const events = new Set(statusRecords.map((statusRecord) => statusRecord.event));
  const engineProcessTypes = new Set(
    statusRecords
      .filter((statusRecord) => statusRecord.event === 'engine-init')
      .map((statusRecord) => statusRecord.processType),
  );

  if (
    events.has('storage-ready') &&
    events.has('backend-ready') &&
    engineProcessTypes.has('main') &&
    engineProcessTypes.has('runner') &&
    engineProcessTypes.has('processor')
  ) {
    return { event: 'server-ready' };
  }

  return undefined;
}

function describeMissingReadySignals() {
  return 'storage-ready, backend-ready, engine main/runner/processor init';
}

function findPlayerHeartbeat(statusRecords, playerRuntimeContract) {
  return statusRecords.find(
    (statusRecord) =>
      statusRecord.event === 'player-heartbeat' &&
      statusRecord.username === playerRuntimeContract.username &&
      statusRecord.memorySchemaVersion === playerRuntimeContract.memorySchemaVersion,
  );
}

function describeMissingPlayerHeartbeat(playerRuntimeContract) {
  return `${playerRuntimeContract.username} heartbeat with Memory.${playerRuntimeContract.memoryRootKey}.schemaVersion = ${playerRuntimeContract.memorySchemaVersion}`;
}

const RUNTIME_MONITOR_HEARTBEAT_FRAGMENTS = Object.freeze([
  'cpu=',
  'bucket=',
  'limit=',
  'tickLimit=',
  'budget=',
  'rooms=',
  'workers=',
  'spawnEnergy=',
  'construction=',
  'hostiles=',
]);

function findRuntimeMonitorEvidence(statusRecords, playerRuntimeContract) {
  return statusRecords.find(
    (statusRecord) =>
      statusRecord.event === 'player-heartbeat' &&
      statusRecord.username === playerRuntimeContract.username &&
      statusRecord.memorySchemaVersion === playerRuntimeContract.memorySchemaVersion &&
      typeof statusRecord.line === 'string' &&
      RUNTIME_MONITOR_HEARTBEAT_FRAGMENTS.every((heartbeatFragment) =>
        statusRecord.line.includes(heartbeatFragment),
      ),
  );
}

function describeMissingRuntimeMonitorEvidence(playerRuntimeContract) {
  return `${playerRuntimeContract.username} runtime monitor heartbeat with CPU snapshot and room survival summary`;
}

function findPlayerMemory(statusRecords, playerRuntimeContract) {
  const memoryRecord = findPlayerHeartbeat(statusRecords, playerRuntimeContract);

  if (memoryRecord && memoryRecord.memory) {
    return memoryRecord.memory;
  }

  return undefined;
}

function describeMissingPlayerMemory(playerRuntimeContract) {
  return `${playerRuntimeContract.username} Memory.${playerRuntimeContract.memoryRootKey}.schemaVersion = ${playerRuntimeContract.memorySchemaVersion}`;
}

function readDefenseRuntimeContract(preparedRun) {
  if (!preparedRun.defenseRuntimeContract) {
    throw new Error('Screeps server fixture does not expose a defense runtime contract.');
  }

  return preparedRun.defenseRuntimeContract;
}

function findDefenseSafeModeActivation(statusRecords, defenseRuntimeContract) {
  return statusRecords.find(
    (statusRecord) =>
      statusRecord.event === 'safe-mode-active' &&
      statusRecord.controllerId === defenseRuntimeContract.controllerId &&
      statusRecord.roomName === defenseRuntimeContract.roomName &&
      statusRecord.hostile &&
      statusRecord.hostile.id === defenseRuntimeContract.hostileCreepId,
  );
}

function findDefenseHostileObserved(statusRecords, defenseRuntimeContract) {
  return statusRecords.find(
    (statusRecord) =>
      statusRecord.event === 'defense-hostile-observed' &&
      statusRecord.roomName === defenseRuntimeContract.roomName &&
      matchesDefenseHostile(statusRecord.hostile, defenseRuntimeContract),
  );
}

function findDefenseNoSafeMode(statusRecords, playerRuntimeContract, defenseRuntimeContract) {
  throwIfDefenseSafeModeActive(statusRecords, defenseRuntimeContract);

  const playerHeartbeat = findPlayerHeartbeat(statusRecords, playerRuntimeContract);

  if (!playerHeartbeat) {
    return undefined;
  }

  return statusRecords.find(
    (statusRecord) =>
      statusRecord.event === 'defense-no-safe-mode' &&
      statusRecord.gameTime >= readPlayerHeartbeatGameTime(playerHeartbeat) &&
      statusRecord.controllerId === defenseRuntimeContract.controllerId &&
      statusRecord.roomName === defenseRuntimeContract.roomName &&
      statusRecord.safeModeActive === false &&
      matchesDefenseHostile(statusRecord.hostile, defenseRuntimeContract),
  );
}

function findDefenseConstructionProgress(statusRecords, defenseRuntimeContract) {
  throwIfDefenseSafeModeActive(statusRecords, defenseRuntimeContract);
  readDefenseConstructionSiteId(defenseRuntimeContract);

  return statusRecords.find(
    (statusRecord) =>
      statusRecord.event === 'defense-construction-progress' &&
      statusRecord.controllerId === defenseRuntimeContract.controllerId &&
      statusRecord.roomName === defenseRuntimeContract.roomName &&
      statusRecord.safeModeActive === false &&
      statusRecord.constructionSite &&
      statusRecord.constructionSite.id === defenseRuntimeContract.constructionSiteId &&
      statusRecord.constructionSite.progress > defenseRuntimeContract.initialConstructionProgress &&
      matchesDefenseHostile(statusRecord.hostile, defenseRuntimeContract),
  );
}

function findDefenseConstructionDeferred(statusRecords, defenseRuntimeContract) {
  throwIfDefenseSafeModeActive(statusRecords, defenseRuntimeContract);
  readDefenseConstructionSiteId(defenseRuntimeContract);

  return statusRecords.find(
    (statusRecord) =>
      statusRecord.event === 'defense-construction-deferred' &&
      statusRecord.controllerId === defenseRuntimeContract.controllerId &&
      statusRecord.roomName === defenseRuntimeContract.roomName &&
      statusRecord.safeModeActive === false &&
      statusRecord.constructionSite &&
      statusRecord.constructionSite.id === defenseRuntimeContract.constructionSiteId &&
      statusRecord.constructionSite.progress ===
        defenseRuntimeContract.initialConstructionProgress &&
      statusRecord.controllerProgress > defenseRuntimeContract.initialControllerProgress &&
      matchesDefenseHostile(statusRecord.hostile, defenseRuntimeContract),
  );
}

function throwIfDefenseSafeModeActive(statusRecords, defenseRuntimeContract) {
  const safeModeActivation = findDefenseSafeModeActivation(statusRecords, defenseRuntimeContract);

  if (safeModeActivation) {
    throw new Error(
      `Unexpected safe-mode-active for controller ${defenseRuntimeContract.controllerId} and hostile ${defenseRuntimeContract.hostileCreepId}.`,
    );
  }
}

function matchesDefenseHostile(hostileStatus, defenseRuntimeContract) {
  if (
    !hostileStatus ||
    hostileStatus.id !== defenseRuntimeContract.hostileCreepId ||
    hostileStatus.x !== defenseRuntimeContract.hostileX ||
    hostileStatus.y !== defenseRuntimeContract.hostileY
  ) {
    return false;
  }

  if (!Array.isArray(defenseRuntimeContract.hostileBodyPartTypes)) {
    return true;
  }

  const statusBodyPartTypes = Array.isArray(hostileStatus.bodyParts)
    ? hostileStatus.bodyParts.map((bodyPart) => bodyPart.type)
    : [];

  return (
    statusBodyPartTypes.length === defenseRuntimeContract.hostileBodyPartTypes.length &&
    statusBodyPartTypes.every(
      (bodyPartType, bodyPartIndex) =>
        bodyPartType === defenseRuntimeContract.hostileBodyPartTypes[bodyPartIndex],
    )
  );
}

function describeMissingDefenseSafeModeActivation(defenseRuntimeContract) {
  return `safe-mode-active for controller ${defenseRuntimeContract.controllerId} and hostile ${defenseRuntimeContract.hostileCreepId}`;
}

function describeMissingDefenseHostileObserved(defenseRuntimeContract) {
  return `defense-hostile-observed for hostile ${defenseRuntimeContract.hostileCreepId} at ${defenseRuntimeContract.hostileX},${defenseRuntimeContract.hostileY}`;
}

function describeMissingDefenseNoSafeMode(defenseRuntimeContract) {
  return `defense-no-safe-mode for controller ${defenseRuntimeContract.controllerId} and hostile ${defenseRuntimeContract.hostileCreepId}`;
}

function describeMissingDefenseConstructionProgress(defenseRuntimeContract) {
  return `construction progress for site ${readDefenseConstructionSiteId(defenseRuntimeContract)}`;
}

function describeMissingDefenseConstructionDeferred(defenseRuntimeContract) {
  return `construction deferred with controller upgrade fallback for site ${readDefenseConstructionSiteId(defenseRuntimeContract)}`;
}

function readDefenseConstructionSiteId(defenseRuntimeContract) {
  if (!defenseRuntimeContract.constructionSiteId) {
    throw new Error('Screeps server fixture does not expose a defense construction site.');
  }

  return defenseRuntimeContract.constructionSiteId;
}

function readPlayerHeartbeatGameTime(playerHeartbeat) {
  const lineMatch = /^\[tick (?<gameTime>\d+)\]/u.exec(playerHeartbeat.line);

  if (!lineMatch || !lineMatch.groups) {
    throw new Error(`Player heartbeat does not include a tick line: ${playerHeartbeat.line}`);
  }

  return Number.parseInt(lineMatch.groups.gameTime, 10);
}

async function waitForFileCondition(
  watchedDirectory,
  watchedFilePath,
  inspectWatchedFile,
  describeExpectedState,
  watchdogMs,
) {
  return new Promise((resolve, reject) => {
    let isSettled = false;
    let watcher;

    const finish = (finishOperation, finishValue) => {
      if (isSettled) {
        return;
      }

      isSettled = true;
      clearTimeout(watchdog);

      if (watcher) {
        watcher.close();
      }

      finishOperation(finishValue);
    };

    const inspectAndSettle = () => {
      inspectWatchedFile().then(
        (matchedValue) => {
          if (matchedValue !== undefined) {
            finish(resolve, matchedValue);
          }
        },
        (inspectionError) => finish(reject, inspectionError),
      );
    };

    const watchdog = setTimeout(() => {
      finish(
        reject,
        new Error(`Timed out waiting for ${describeExpectedState()} in ${watchedFilePath}.`),
      );
    }, watchdogMs);

    try {
      watcher = fsWatch(watchedDirectory, watchedFilePath, inspectAndSettle);
    } catch (watchError) {
      finish(reject, watchError);
      return;
    }

    inspectAndSettle();
  });
}

function fsWatch(watchedDirectory, watchedFilePath, inspectAndSettle) {
  const nodeFs = createRequire(import.meta.url)('node:fs');

  return nodeFs.watch(watchedDirectory, (eventType, filename) => {
    if (!filename || path.basename(watchedFilePath) === filename.toString()) {
      inspectAndSettle();
    }
  });
}

async function readStatusRecords(statusFilePath) {
  let statusText;

  try {
    statusText = await fs.readFile(statusFilePath, 'utf8');
  } catch (readError) {
    if (readError && readError.code === 'ENOENT') {
      return [];
    }

    throw readError;
  }

  return statusText
    .split(/\r?\n/u)
    .filter((statusLine) => statusLine.length > 0)
    .map((statusLine) => JSON.parse(statusLine));
}
