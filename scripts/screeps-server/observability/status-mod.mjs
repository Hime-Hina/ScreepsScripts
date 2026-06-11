import fs from 'node:fs/promises';
import path from 'node:path';

import { SERVER_PACKAGE_ROOT } from '../framework/local-server-contract.mjs';

export async function writeStatusMod(statusModPath, statusFilePath, activeBotRuntimeContract) {
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
};
`;

  await fs.writeFile(statusModPath, statusModSource, 'utf8');
}
