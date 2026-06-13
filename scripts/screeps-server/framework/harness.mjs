import path from 'node:path';
import { performance } from 'node:perf_hooks';

import {
  prepareDefenseCoreThreatRun,
  prepareDefenseDistantThreatRun,
  prepareDefenseHarmlessScoutRun,
  prepareSingleOwnedSpawnRun,
} from '../fixtures/single-owned-spawn-fixture.mjs';
import { runCommand } from './command-execution.mjs';
import {
  LOCAL_STORAGE_HOST,
  OFFICIAL_CHILD_RESTART_DELAY_MS,
  OFFLINE_STEAM_WEB_API_KEY,
} from './local-server-contract.mjs';
import { createOfficialServerRequire, ensureOfficialServerPackage } from './official-package.mjs';
import { raceWithServerExit, stopServerChildren } from './process-control.mjs';
import { ScreepsServerOutput } from './server-output.mjs';
import {
  waitForDefenseConstructionContinues,
  waitForDefenseConstructionDeferred,
  waitForDefenseHostileObserved,
  waitForDefenseNoSafeMode,
  waitForDefenseSafeModeActivation,
  waitForPlayerHeartbeat,
  waitForPlayerMemory,
  waitForServerReady,
} from './status-wait.mjs';
import { reserveTcpPort } from './tcp-port-reservation.mjs';

export class ScreepsLocalServerHarness {
  constructor() {
    this.preparedRun = undefined;
    this.serverChildren = {};
    this.launcherRestartTimers = [];
    this.serverOutput = new ScreepsServerOutput();
    this.timings = new Map();
    this.isStopping = false;
  }

  async prepareSingleOwnedSpawnFixture() {
    await this.measure('install', () => ensureOfficialServerPackage());
    this.preparedRun = await this.measure('fixture', () => prepareSingleOwnedSpawnRun());
    this.isStopping = false;
  }

  async prepareDefenseCoreThreatFixture() {
    await this.measure('install', () => ensureOfficialServerPackage());
    this.preparedRun = await this.measure('fixture', () => prepareDefenseCoreThreatRun());
    this.isStopping = false;
  }

  async prepareDefenseHarmlessScoutFixture() {
    await this.measure('install', () => ensureOfficialServerPackage());
    this.preparedRun = await this.measure('fixture', () => prepareDefenseHarmlessScoutRun());
    this.isStopping = false;
  }

  async prepareDefenseDistantThreatFixture() {
    await this.measure('install', () => ensureOfficialServerPackage());
    this.preparedRun = await this.measure('fixture', () => prepareDefenseDistantThreatRun());
    this.isStopping = false;
  }

  async start() {
    await this.measure('startup', async () => {
      const preparedRun = this.requirePreparedRun();
      const screepsRequire = createOfficialServerRequire();
      const startOfficialServer = screepsRequire('@screeps/launcher/lib/start');
      const gamePort = await reserveTcpPort();
      const cliPort = await reserveTcpPort();
      const storagePort = await reserveTcpPort();
      const launchContext = captureLaunchContext();

      try {
        applyLocalLaunchContext(launchContext);
        process.chdir(preparedRun.runDirectory);
        const launchedServer = await startOfficialServer(
          {
            assetdir: path.join(preparedRun.runDirectory, 'assets'),
            cli_host: '127.0.0.1',
            cli_port: cliPort,
            db: preparedRun.dbPath,
            host: '127.0.0.1',
            log_console: true,
            log_rotate_keep: 1,
            logdir: preparedRun.logDirectory,
            modfile: path.join(preparedRun.runDirectory, 'mods.json'),
            port: gamePort,
            processors_cnt: 1,
            runner_threads: 1,
            runners_cnt: 1,
            steam_api_key: OFFLINE_STEAM_WEB_API_KEY,
            storage_port: storagePort,
          },
          this.serverOutput,
        );

        this.serverChildren = launchedServer.processes;
        this.launcherRestartTimers = launchContext.launcherRestartTimers;
      } finally {
        restoreLaunchContext(launchContext);
      }
    });
  }

  async waitForReady() {
    await this.measure('ready', () =>
      this.raceWithServerExit(waitForServerReady(this.requirePreparedRun())),
    );
  }

  async waitForPlayerHeartbeat() {
    await this.measure('tick', () =>
      this.raceWithServerExit(waitForPlayerHeartbeat(this.requirePreparedRun())),
    );
  }

  async readBotMemory() {
    return this.measure('memory', () =>
      this.raceWithServerExit(waitForPlayerMemory(this.requirePreparedRun())),
    );
  }

  async waitForDefenseSafeModeActivation() {
    await this.measure('defense', () =>
      this.raceWithServerExit(waitForDefenseSafeModeActivation(this.requirePreparedRun())),
    );
  }

  async waitForDefenseHostileObserved() {
    await this.measure('defense', () =>
      this.raceWithServerExit(waitForDefenseHostileObserved(this.requirePreparedRun())),
    );
  }

  async waitForDefenseNoSafeMode() {
    await this.measure('defense', () =>
      this.raceWithServerExit(waitForDefenseNoSafeMode(this.requirePreparedRun())),
    );
  }

  async waitForDefenseConstructionContinues() {
    await this.measure('defense', () =>
      this.raceWithServerExit(waitForDefenseConstructionContinues(this.requirePreparedRun())),
    );
  }

  async waitForDefenseConstructionDeferred() {
    await this.measure('defense', () =>
      this.raceWithServerExit(waitForDefenseConstructionDeferred(this.requirePreparedRun())),
    );
  }

  async stop() {
    await this.measure('teardown', async () => {
      this.isStopping = true;

      for (const launcherRestartTimer of this.launcherRestartTimers) {
        clearTimeout(launcherRestartTimer);
      }

      this.launcherRestartTimers = [];
      await stopServerChildren(this.serverChildren);
      this.serverChildren = {};
    });
  }

  printTimingReport(totalDurationMs) {
    const timingFields = [
      `build=${formatDuration(this.timings.get('build'))}`,
      `install=${formatDuration(this.timings.get('install'))}`,
      `fixture=${formatDuration(this.timings.get('fixture'))}`,
      `startup=${formatDuration(this.timings.get('startup'))}`,
      `ready=${formatDuration(this.timings.get('ready'))}`,
      `tick=${formatDuration(this.timings.get('tick'))}`,
      `memory=${formatDuration(this.timings.get('memory'))}`,
      `defense=${formatDuration(this.timings.get('defense'))}`,
      `teardown=${formatDuration(this.timings.get('teardown'))}`,
      `total=${formatDuration(totalDurationMs)}`,
    ];

    console.log(`screeps-server-e2e timings ${timingFields.join(' ')}`);
  }

  async recordBuildTiming(buildOperation) {
    await this.measure('build', buildOperation);
  }

  async measure(timingName, operation) {
    const startedAt = performance.now();

    try {
      return await operation();
    } finally {
      this.timings.set(timingName, performance.now() - startedAt);
    }
  }

  requirePreparedRun() {
    if (!this.preparedRun) {
      throw new Error('Screeps server fixture has not been prepared.');
    }

    return this.preparedRun;
  }

  async raceWithServerExit(operationPromise) {
    return raceWithServerExit(this.serverChildren, () => this.isStopping, operationPromise);
  }
}

export async function runProjectBuild() {
  await runCommand('pnpm', ['build'], path.resolve('.'));
}

function captureLaunchContext() {
  return {
    launcherRestartTimers: [],
    previousSetTimeout: globalThis.setTimeout,
    previousSteamKey: process.env.STEAM_KEY,
    previousStorageHost: process.env.STORAGE_HOST,
    previousWorkingDirectory: process.cwd(),
  };
}

function applyLocalLaunchContext(launchContext) {
  globalThis.setTimeout = function setTimeoutWithLauncherRestartTracking(
    timeoutOperation,
    delayMs,
    ...timeoutArguments
  ) {
    const timeoutReference = launchContext.previousSetTimeout(
      timeoutOperation,
      delayMs,
      ...timeoutArguments,
    );

    if (Number(delayMs) >= OFFICIAL_CHILD_RESTART_DELAY_MS) {
      launchContext.launcherRestartTimers.push(timeoutReference);
    }

    return timeoutReference;
  };

  process.env.STEAM_KEY = OFFLINE_STEAM_WEB_API_KEY;
  process.env.STORAGE_HOST = LOCAL_STORAGE_HOST;
}

function restoreLaunchContext(launchContext) {
  globalThis.setTimeout = launchContext.previousSetTimeout;
  process.chdir(launchContext.previousWorkingDirectory);
  restoreProcessEnvironmentVariable('STEAM_KEY', launchContext.previousSteamKey);
  restoreProcessEnvironmentVariable('STORAGE_HOST', launchContext.previousStorageHost);
}

function restoreProcessEnvironmentVariable(variableName, previousValue) {
  if (previousValue === undefined) {
    delete process.env[variableName];
    return;
  }

  process.env[variableName] = previousValue;
}

function formatDuration(durationMs) {
  if (typeof durationMs !== 'number') {
    return 'n/a';
  }

  return `${(durationMs / 1000).toFixed(2)}s`;
}
