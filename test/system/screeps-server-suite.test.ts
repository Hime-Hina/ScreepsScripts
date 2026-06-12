import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const SCREEPS_SERVER_SCRIPT_ROOT = path.join('scripts', 'screeps-server');

interface RegistryProbe {
  readonly defenseCaseFixtureNames: readonly string[];
  readonly defenseCaseLabel: string;
  readonly defenseCaseNames: readonly string[];
  readonly mixedFixtureError: string;
  readonly smokeCaseNames: readonly string[];
  readonly smokeFixtureNames: readonly string[];
}

const readRegistryProbe = (): RegistryProbe => {
  const probeText = execFileSync(
    process.execPath,
    [
      '--input-type=module',
      '--eval',
      `
        import { createSingleCaseSelection, createSuiteSelection, readSharedFixtureName } from './scripts/screeps-server/cases/case-registry.mjs';

        const suiteSelection = createSuiteSelection('smoke');
        const defenseCaseSelection = createSingleCaseSelection('defense-core-threat-safe-mode');
        let mixedFixtureError = '';

        try {
          readSharedFixtureName([
            ...suiteSelection.caseDefinitions,
            ...defenseCaseSelection.caseDefinitions,
          ]);
        } catch (error) {
          mixedFixtureError = error instanceof Error ? error.message : String(error);
        }

        console.log(JSON.stringify({
          defenseCaseFixtureNames: defenseCaseSelection.caseDefinitions.map((caseDefinition) => caseDefinition.fixtureName),
          defenseCaseLabel: defenseCaseSelection.label,
          defenseCaseNames: defenseCaseSelection.caseDefinitions.map((caseDefinition) => caseDefinition.name),
          mixedFixtureError,
          smokeCaseNames: suiteSelection.caseDefinitions.map((caseDefinition) => caseDefinition.name),
          smokeFixtureNames: suiteSelection.caseDefinitions.map((caseDefinition) => caseDefinition.fixtureName),
        }));
      `,
    ],
    { encoding: 'utf8' },
  );
  const registryProbe: unknown = JSON.parse(probeText);

  if (!isRegistryProbe(registryProbe)) {
    throw new Error('Screeps server suite registry probe returned an unexpected shape.');
  }

  return registryProbe;
};

const isRegistryProbe = (registryProbe: unknown): registryProbe is RegistryProbe => {
  if (typeof registryProbe !== 'object' || registryProbe === null) {
    return false;
  }

  const candidateProbe = registryProbe as Record<string, unknown>;

  return (
    isStringArray(candidateProbe['defenseCaseFixtureNames']) &&
    typeof candidateProbe['defenseCaseLabel'] === 'string' &&
    isStringArray(candidateProbe['defenseCaseNames']) &&
    typeof candidateProbe['mixedFixtureError'] === 'string' &&
    isStringArray(candidateProbe['smokeCaseNames']) &&
    isStringArray(candidateProbe['smokeFixtureNames'])
  );
};

const isStringArray = (arrayCandidate: unknown): arrayCandidate is readonly string[] =>
  Array.isArray(arrayCandidate) &&
  arrayCandidate.every((arrayItem) => typeof arrayItem === 'string');

describe('Screeps server suite registry', () => {
  it('separates the runner entrypoint, framework, fixtures, cases, and observability modules', () => {
    expect(readDirectoryFileNames(SCREEPS_SERVER_SCRIPT_ROOT)).toEqual(['run-suite.mjs']);
    expect(readDirectoryNames(SCREEPS_SERVER_SCRIPT_ROOT)).toEqual([
      'cases',
      'fixtures',
      'framework',
      'observability',
    ]);
    expect(readDirectoryFileNames(path.join(SCREEPS_SERVER_SCRIPT_ROOT, 'cases'))).toEqual([
      'case-registry.mjs',
      'suite-runner.mjs',
    ]);
    expect(readDirectoryFileNames(path.join(SCREEPS_SERVER_SCRIPT_ROOT, 'fixtures'))).toEqual([
      'single-owned-spawn-fixture.mjs',
    ]);
    expect(readDirectoryFileNames(path.join(SCREEPS_SERVER_SCRIPT_ROOT, 'framework'))).toEqual([
      'command-execution.mjs',
      'harness.mjs',
      'local-server-contract.mjs',
      'official-package.mjs',
      'process-control.mjs',
      'server-output.mjs',
      'status-wait.mjs',
      'tcp-port-reservation.mjs',
    ]);
    expect(readDirectoryFileNames(path.join(SCREEPS_SERVER_SCRIPT_ROOT, 'observability'))).toEqual([
      'status-mod.mjs',
    ]);
  });

  it('keeps the smoke suite inside the single-owned-spawn fixture boundary and selects the defense drill case explicitly', () => {
    const registryProbe = readRegistryProbe();

    expect(registryProbe.smokeCaseNames).toEqual([
      'basic-runtime-heartbeat',
      'memory-schema-write',
    ]);
    expect(registryProbe.smokeFixtureNames).toEqual(['single-owned-spawn', 'single-owned-spawn']);
    expect(registryProbe.defenseCaseLabel).toBe('case=defense-core-threat-safe-mode');
    expect(registryProbe.defenseCaseNames).toEqual(['defense-core-threat-safe-mode']);
    expect(registryProbe.defenseCaseFixtureNames).toEqual(['defense-core-threat']);
    expect(registryProbe.mixedFixtureError).toContain(
      'Screeps server e2e cases in one run must share one fixture',
    );
  });
});

const readDirectoryFileNames = (directoryPath: string): readonly string[] =>
  readdirSync(directoryPath, { withFileTypes: true })
    .filter((directoryEntry) => directoryEntry.isFile())
    .map((directoryEntry) => directoryEntry.name)
    .sort((leftName, rightName) => leftName.localeCompare(rightName));

const readDirectoryNames = (directoryPath: string): readonly string[] =>
  readdirSync(directoryPath, { withFileTypes: true })
    .filter((directoryEntry) => directoryEntry.isDirectory())
    .map((directoryEntry) => directoryEntry.name)
    .sort((leftName, rightName) => leftName.localeCompare(rightName));
