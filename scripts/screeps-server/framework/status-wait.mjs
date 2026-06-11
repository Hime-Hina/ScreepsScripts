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

export async function waitForPlayerMemory(preparedRun) {
  return waitForStatusCondition(
    preparedRun.runDirectory,
    preparedRun.statusFilePath,
    (statusRecords) => findPlayerMemory(statusRecords, preparedRun.playerRuntimeContract),
    () => describeMissingPlayerMemory(preparedRun.playerRuntimeContract),
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
