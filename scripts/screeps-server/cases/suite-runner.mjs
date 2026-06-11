import { performance } from 'node:perf_hooks';

import {
  describeSingleOwnedSpawnFixture,
  SINGLE_OWNED_SPAWN_FIXTURE_NAME,
} from '../fixtures/single-owned-spawn-fixture.mjs';
import { runProjectBuild, ScreepsLocalServerHarness } from '../framework/harness.mjs';
import { readSharedFixtureName } from './case-registry.mjs';

export async function runScreepsServerSelection(caseSelection) {
  const fixtureName = readSharedFixtureName(caseSelection.caseDefinitions);

  if (fixtureName !== SINGLE_OWNED_SPAWN_FIXTURE_NAME) {
    throw new Error(`Unsupported Screeps server e2e fixture "${fixtureName}".`);
  }

  const harness = new ScreepsLocalServerHarness();
  const startedAt = performance.now();

  try {
    await harness.recordBuildTiming(runProjectBuild);
    await harness.prepareSingleOwnedSpawnFixture();
    await harness.start();
    await harness.waitForReady();

    for (const caseDefinition of caseSelection.caseDefinitions) {
      await caseDefinition.run(harness);
      console.log(`screeps-server-e2e case passed case=${caseDefinition.name}`);
    }

    console.log(
      `screeps-server-e2e passed ${caseSelection.label} ${describeSingleOwnedSpawnFixture()} cases=${caseSelection.caseDefinitions
        .map((caseDefinition) => caseDefinition.name)
        .join(',')}`,
    );
  } finally {
    await harness.stop();
    harness.printTimingReport(performance.now() - startedAt);
  }
}
