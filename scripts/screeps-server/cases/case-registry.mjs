import {
  DEFENSE_CORE_THREAT_FIXTURE_NAME,
  DEFENSE_DISTANT_THREAT_FIXTURE_NAME,
  DEFENSE_HARMLESS_SCOUT_FIXTURE_NAME,
  SINGLE_OWNED_SPAWN_ACTIVE_BOT,
  SINGLE_OWNED_SPAWN_FIXTURE_NAME,
} from '../fixtures/single-owned-spawn-fixture.mjs';

const SCREEPS_SERVER_CASES = new Map([
  [
    'basic-runtime-heartbeat',
    {
      fixtureName: SINGLE_OWNED_SPAWN_FIXTURE_NAME,
      name: 'basic-runtime-heartbeat',
      run: assertBasicRuntimeHeartbeat,
    },
  ],
  [
    'memory-schema-write',
    {
      fixtureName: SINGLE_OWNED_SPAWN_FIXTURE_NAME,
      name: 'memory-schema-write',
      run: assertMemorySchemaWrite,
    },
  ],
  [
    'defense-core-threat-safe-mode',
    {
      fixtureName: DEFENSE_CORE_THREAT_FIXTURE_NAME,
      name: 'defense-core-threat-safe-mode',
      run: assertDefenseCoreThreatSafeMode,
    },
  ],
  [
    'defense-harmless-scout-continues',
    {
      fixtureName: DEFENSE_HARMLESS_SCOUT_FIXTURE_NAME,
      name: 'defense-harmless-scout-continues',
      run: assertDefenseHarmlessScoutContinues,
    },
  ],
  [
    'defense-distant-threat-defers-build',
    {
      fixtureName: DEFENSE_DISTANT_THREAT_FIXTURE_NAME,
      name: 'defense-distant-threat-defers-build',
      run: assertDefenseDistantThreatDefersBuild,
    },
  ],
]);

const SCREEPS_SERVER_SUITES = new Map([
  ['smoke', ['basic-runtime-heartbeat', 'memory-schema-write']],
]);

export function createSuiteSelection(suiteName) {
  const caseNames = SCREEPS_SERVER_SUITES.get(suiteName);

  if (!caseNames) {
    throw new Error(
      `Unknown Screeps server e2e suite "${suiteName}". ${describeAvailableSuites()}`,
    );
  }

  return {
    caseDefinitions: caseNames.map(readCaseDefinition),
    label: `suite=${suiteName}`,
  };
}

export function createSingleCaseSelection(caseName) {
  return {
    caseDefinitions: [readCaseDefinition(caseName)],
    label: `case=${caseName}`,
  };
}

export function readCliSelection(commandArguments) {
  if (commandArguments.length === 0) {
    return createSuiteSelection('smoke');
  }

  if (commandArguments.length === 1) {
    return createSuiteSelection(commandArguments[0]);
  }

  if (commandArguments.length === 2 && commandArguments[0] === 'case') {
    return createSingleCaseSelection(commandArguments[1]);
  }

  throw new Error(
    `Invalid Screeps server e2e selection "${commandArguments.join(' ')}". Use "smoke" or "case <case-name>". ${describeAvailableSuites()} ${describeAvailableCases()}`,
  );
}

export function readSharedFixtureName(caseDefinitions) {
  const fixtureNames = new Set(caseDefinitions.map((caseDefinition) => caseDefinition.fixtureName));

  if (fixtureNames.size !== 1) {
    throw new Error(
      `Screeps server e2e cases in one run must share one fixture. Received: ${Array.from(
        fixtureNames,
      ).join(', ')}`,
    );
  }

  return caseDefinitions[0].fixtureName;
}

function readCaseDefinition(caseName) {
  const caseDefinition = SCREEPS_SERVER_CASES.get(caseName);

  if (!caseDefinition) {
    throw new Error(`Unknown Screeps server e2e case "${caseName}". ${describeAvailableCases()}`);
  }

  return caseDefinition;
}

async function assertBasicRuntimeHeartbeat(harness) {
  await harness.waitForPlayerHeartbeat();
}

async function assertMemorySchemaWrite(harness) {
  const botMemory = await harness.readBotMemory();

  if (
    !botMemory[SINGLE_OWNED_SPAWN_ACTIVE_BOT.memoryRootKey] ||
    botMemory[SINGLE_OWNED_SPAWN_ACTIVE_BOT.memoryRootKey].schemaVersion !==
      SINGLE_OWNED_SPAWN_ACTIVE_BOT.memorySchemaVersion
  ) {
    throw new Error(
      `Saved ${SINGLE_OWNED_SPAWN_ACTIVE_BOT.username} Memory does not contain ${SINGLE_OWNED_SPAWN_ACTIVE_BOT.memoryRootKey}.schemaVersion = ${SINGLE_OWNED_SPAWN_ACTIVE_BOT.memorySchemaVersion}.`,
    );
  }
}

async function assertDefenseCoreThreatSafeMode(harness) {
  await harness.waitForPlayerHeartbeat();
  await harness.waitForDefenseSafeModeActivation();
}

async function assertDefenseHarmlessScoutContinues(harness) {
  await harness.waitForPlayerHeartbeat();
  await harness.waitForDefenseHostileObserved();
  await harness.waitForDefenseNoSafeMode();
  await harness.waitForDefenseConstructionContinues();
}

async function assertDefenseDistantThreatDefersBuild(harness) {
  await harness.waitForPlayerHeartbeat();
  await harness.waitForDefenseHostileObserved();
  await harness.waitForDefenseNoSafeMode();
  await harness.waitForDefenseConstructionDeferred();
}

function describeAvailableSuites() {
  return `Available suites: ${Array.from(SCREEPS_SERVER_SUITES.keys()).join(', ')}.`;
}

function describeAvailableCases() {
  return `Available cases: ${Array.from(SCREEPS_SERVER_CASES.keys()).join(', ')}.`;
}
