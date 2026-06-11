import { spawn } from 'node:child_process';

import { TEARDOWN_WATCHDOG_MS } from './local-server-contract.mjs';

export async function stopServerChildren(serverChildren) {
  const childEntries = Object.entries(serverChildren);

  for (const [, serverChild] of childEntries) {
    serverChild.removeAllListeners('exit');
  }

  await Promise.all(childEntries.map(([, serverChild]) => stopServerChild(serverChild)));
}

export async function raceWithServerExit(serverChildren, shouldIgnoreExit, operationPromise) {
  const childEntries = Object.entries(serverChildren);

  if (childEntries.length === 0) {
    return operationPromise;
  }

  return new Promise((resolve, reject) => {
    const exitListeners = [];

    const cleanup = () => {
      for (const [serverChild, onUnexpectedExit] of exitListeners) {
        serverChild.removeListener('exit', onUnexpectedExit);
      }
    };

    for (const [childName, serverChild] of childEntries) {
      const onUnexpectedExit = (exitCode, exitSignal) => {
        if (!shouldIgnoreExit()) {
          cleanup();
          reject(
            new Error(
              `Screeps server child ${childName} exited before the expected signal: code=${exitCode} signal=${exitSignal}`,
            ),
          );
        }
      };

      serverChild.once('exit', onUnexpectedExit);
      exitListeners.push([serverChild, onUnexpectedExit]);
    }

    operationPromise.then(
      (operationValue) => {
        cleanup();
        resolve(operationValue);
      },
      (operationError) => {
        cleanup();
        reject(operationError);
      },
    );
  });
}

async function stopServerChild(serverChild) {
  if (!serverChild.pid) {
    return;
  }

  if (process.platform === 'win32') {
    await runTaskkill(serverChild.pid);
    return;
  }

  serverChild.kill('SIGTERM');
  await waitForChildExit(serverChild, TEARDOWN_WATCHDOG_MS);
}

async function runTaskkill(pid) {
  await new Promise((resolve) => {
    const taskkill = spawn('taskkill', ['/PID', String(pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    });

    taskkill.on('exit', () => resolve());
    taskkill.on('error', () => resolve());
  });
}

async function waitForChildExit(serverChild, watchdogMs) {
  if (serverChild.exitCode !== null || serverChild.signalCode !== null) {
    return;
  }

  await new Promise((resolve) => {
    const watchdog = setTimeout(resolve, watchdogMs);

    serverChild.once('exit', () => {
      clearTimeout(watchdog);
      resolve();
    });
  });
}
