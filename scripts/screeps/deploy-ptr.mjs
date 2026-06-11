#!/usr/bin/env node

import { pathToFileURL } from 'node:url';

import { reportCommandFailure } from './command-failure.mjs';
import {
  describeModuleNames,
  hashModuleSet,
  moduleSetsAreEqual,
  readLocalMainModuleSetFrom,
} from './module-set.mjs';
import { readPtrRemoteModuleSet, uploadPtrRemoteModuleSet } from './ptr-api.mjs';
import { readPtrScreepsConfigFrom } from './ptr-config.mjs';
import {
  createPtrRollbackSnapshot,
  PTR_ROLLBACK_SNAPSHOT_PATH,
  writePtrRollbackSnapshotTo,
} from './ptr-rollback-snapshot.mjs';

export const deployPtrScreeps = async () => deployPtrScreepsFrom(process.cwd());

export const deployPtrScreepsFrom = async (workspacePath) => {
  const ptrConfig = await readPtrScreepsConfigFrom(workspacePath);
  const previousModules = await readPtrRemoteModuleSet(ptrConfig);
  const rollbackSnapshot = createPtrRollbackSnapshot(
    ptrConfig.branch,
    previousModules,
    new Date().toISOString(),
  );

  await writePtrRollbackSnapshotTo(workspacePath, rollbackSnapshot);

  const localModules = await readLocalMainModuleSetFrom(workspacePath);

  await uploadPtrRemoteModuleSet(ptrConfig, localModules);

  const deployedModules = await readPtrRemoteModuleSet(ptrConfig);

  if (!moduleSetsAreEqual(localModules, deployedModules)) {
    throw new Error(
      'Readback mismatch after PTR deploy; run pnpm rollback:ptr:screeps before further PTR changes.',
    );
  }

  console.log(
    `[deploy:ptr:screeps] branch=${ptrConfig.branch} modules=${describeModuleNames(
      localModules,
    )} hash=${hashModuleSet(deployedModules)}`,
  );
  console.log(
    `[deploy:ptr:screeps] rollbackSnapshot=${PTR_ROLLBACK_SNAPSHOT_PATH} previousModules=${describeModuleNames(
      previousModules,
    )} previousHash=${rollbackSnapshot.moduleSetHash}`,
  );
  console.log('[deploy:ptr:screeps] naturalTickHeartbeat=not-verified-by-this-script');
};

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await deployPtrScreeps();
  } catch (caughtError) {
    reportCommandFailure('deploy:ptr:screeps', caughtError);
  }
}
