#!/usr/bin/env node

import { pathToFileURL } from 'node:url';

import { reportCommandFailure } from './command-failure.mjs';
import { readMainScreepsConfig } from './config.mjs';
import {
  describeModuleNames,
  hashModuleSet,
  readLocalMainModuleSet,
  requiredModulesMatch,
} from './module-set.mjs';
import { readRemoteModuleSet } from './screeps-api.mjs';

export const verifyLiveScreepsReadback = async () => {
  const screepsConfig = await readMainScreepsConfig();
  const localModules = await readLocalMainModuleSet();
  const remoteModules = await readRemoteModuleSet(screepsConfig);

  if (!requiredModulesMatch(localModules, remoteModules)) {
    throw new Error('Live API readback main module does not match dist/main.js.');
  }

  console.log(
    `[verify:live:screeps] apiReadback=main-matched branch=${screepsConfig.branch} localModules=${describeModuleNames(
      localModules,
    )} remoteModules=${describeModuleNames(remoteModules)} hash=${hashModuleSet(remoteModules)}`,
  );
  console.log('[verify:live:screeps] naturalTickHeartbeat=not-verified-by-this-script');
};

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await verifyLiveScreepsReadback();
  } catch (caughtError) {
    reportCommandFailure('verify:live:screeps', caughtError);
  }
}
