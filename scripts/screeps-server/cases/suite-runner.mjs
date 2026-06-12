import { performance } from 'node:perf_hooks';

import {
  DEFENSE_CORE_THREAT_FIXTURE_NAME,
  describeDefenseCoreThreatFixture,
  describeSingleOwnedSpawnFixture,
  SINGLE_OWNED_SPAWN_FIXTURE_NAME,
} from '../fixtures/single-owned-spawn-fixture.mjs';
import { runProjectBuild, ScreepsLocalServerHarness } from '../framework/harness.mjs';
import { readSharedFixtureName } from './case-registry.mjs';

export async function runScreepsServerSelection(caseSelection) {
  const fixtureName = readSharedFixtureName(caseSelection.caseDefinitions);
  const harness = new ScreepsLocalServerHarness();
  const startedAt = performance.now();
  const fixtureDescription = describeFixture(fixtureName);

  try {
    await harness.recordBuildTiming(runProjectBuild);
    await prepareSelectedFixture(harness, fixtureName);
    await harness.start();
    await harness.waitForReady();

    for (const caseDefinition of caseSelection.caseDefinitions) {
      await caseDefinition.run(harness);
      console.log(`screeps-server-e2e case passed case=${caseDefinition.name}`);
    }

    console.log(
      `screeps-server-e2e passed ${caseSelection.label} ${fixtureDescription} cases=${caseSelection.caseDefinitions
        .map((caseDefinition) => caseDefinition.name)
        .join(',')}`,
    );
  } finally {
    await harness.stop();
    harness.printTimingReport(performance.now() - startedAt);
  }
}

async function prepareSelectedFixture(harness, fixtureName) {
  if (fixtureName === SINGLE_OWNED_SPAWN_FIXTURE_NAME) {
    await harness.prepareSingleOwnedSpawnFixture();
    return;
  }

  if (fixtureName === DEFENSE_CORE_THREAT_FIXTURE_NAME) {
    await harness.prepareDefenseCoreThreatFixture();
    return;
  }

  throw new Error(`Unsupported Screeps server e2e fixture "${fixtureName}".`);
}

function describeFixture(fixtureName) {
  if (fixtureName === SINGLE_OWNED_SPAWN_FIXTURE_NAME) {
    return describeSingleOwnedSpawnFixture();
  }

  if (fixtureName === DEFENSE_CORE_THREAT_FIXTURE_NAME) {
    return describeDefenseCoreThreatFixture();
  }

  throw new Error(`Unsupported Screeps server e2e fixture "${fixtureName}".`);
}
