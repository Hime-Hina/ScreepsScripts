#!/usr/bin/env node

import { pathToFileURL } from 'node:url';

import { reportCommandFailure } from './command-failure.mjs';
import {
  describeModuleNames,
  hashModuleSet,
  readLocalMainModuleSetFrom,
  requiredModulesMatch,
} from './module-set.mjs';
import { readPtrRemoteModuleSet } from './ptr-api.mjs';
import { readPtrScreepsConfigFrom } from './ptr-config.mjs';

export const verifyPtrScreepsReadback = async () => verifyPtrScreepsReadbackFrom(process.cwd());

export const verifyPtrScreepsReadbackFrom = async (workspacePath) => {
  const ptrConfig = await readPtrScreepsConfigFrom(workspacePath);
  const localModules = await readLocalMainModuleSetFrom(workspacePath);
  const remoteModules = await readPtrRemoteModuleSet(ptrConfig);

  if (!requiredModulesMatch(localModules, remoteModules)) {
    throw new Error('PTR API readback main module does not match dist/main.js.');
  }

  console.log(
    `[verify:ptr:screeps] apiReadback=main-matched branch=${ptrConfig.branch} localModules=${describeModuleNames(
      localModules,
    )} remoteModules=${describeModuleNames(remoteModules)} mainHash=${hashModuleSet(localModules)}`,
  );
  console.log('[verify:ptr:screeps] naturalTickHeartbeat=not-verified-by-this-script');
};

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await verifyPtrScreepsReadback();
  } catch (caughtError) {
    reportCommandFailure('verify:ptr:screeps', caughtError);
  }
}
