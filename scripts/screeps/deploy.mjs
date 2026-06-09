#!/usr/bin/env node

import { pathToFileURL } from 'node:url';

import { reportCommandFailure } from './command-failure.mjs';
import { readMainScreepsConfig } from './config.mjs';
import {
  describeModuleNames,
  hashModuleSet,
  moduleSetsAreEqual,
  readLocalMainModuleSet,
} from './module-set.mjs';
import {
  createRollbackSnapshot,
  ROLLBACK_SNAPSHOT_PATH,
  writeRollbackSnapshot,
} from './rollback-snapshot.mjs';
import { readRemoteModuleSet, uploadRemoteModuleSet } from './screeps-api.mjs';

export const deployScreeps = async () => {
  const screepsConfig = await readMainScreepsConfig();
  const previousModules = await readRemoteModuleSet(screepsConfig);
  const rollbackSnapshot = createRollbackSnapshot(
    screepsConfig.branch,
    previousModules,
    new Date().toISOString(),
  );

  await writeRollbackSnapshot(rollbackSnapshot);

  const localModules = await readLocalMainModuleSet();

  await uploadRemoteModuleSet(screepsConfig, localModules);

  const deployedModules = await readRemoteModuleSet(screepsConfig);

  if (!moduleSetsAreEqual(localModules, deployedModules)) {
    throw new Error(
      `Readback mismatch after deploy; run pnpm rollback:screeps before further live changes.`,
    );
  }

  const deployedHash = hashModuleSet(deployedModules);

  console.log(
    `[deploy:screeps] branch=${screepsConfig.branch} modules=${describeModuleNames(localModules)} hash=${deployedHash}`,
  );
  console.log(
    `[deploy:screeps] rollbackSnapshot=${ROLLBACK_SNAPSHOT_PATH} previousModules=${describeModuleNames(
      previousModules,
    )} previousHash=${rollbackSnapshot.moduleSetHash}`,
  );
};

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await deployScreeps();
  } catch (caughtError) {
    reportCommandFailure('deploy:screeps', caughtError);
  }
}
