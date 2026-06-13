import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const SCREEPS_SERVER_SCRIPT_ROOT = path.join('scripts', 'screeps-server');

interface RegistryProbe {
  readonly coreThreatCaseFixtureNames: readonly string[];
  readonly coreThreatCaseLabel: string;
  readonly coreThreatCaseNames: readonly string[];
  readonly distantThreatCaseFixtureNames: readonly string[];
  readonly distantThreatCaseLabel: string;
  readonly distantThreatCaseNames: readonly string[];
  readonly harmlessScoutCaseFixtureNames: readonly string[];
  readonly harmlessScoutCaseLabel: string;
  readonly harmlessScoutCaseNames: readonly string[];
  readonly mixedFixtureError: string;
  readonly runtimeMonitorCaseFixtureNames: readonly string[];
  readonly runtimeMonitorCaseLabel: string;
  readonly runtimeMonitorCaseNames: readonly string[];
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
        const coreThreatCaseSelection = createSingleCaseSelection('defense-core-threat-safe-mode');
        const harmlessScoutCaseSelection = createSingleCaseSelection('defense-harmless-scout-continues');
        const distantThreatCaseSelection = createSingleCaseSelection('defense-distant-threat-defers-build');
        const runtimeMonitorCaseSelection = createSingleCaseSelection('runtime-resilience-monitoring');
        let mixedFixtureError = '';

        try {
          readSharedFixtureName([
            ...suiteSelection.caseDefinitions,
            ...coreThreatCaseSelection.caseDefinitions,
          ]);
        } catch (error) {
          mixedFixtureError = error instanceof Error ? error.message : String(error);
        }

        console.log(JSON.stringify({
          coreThreatCaseFixtureNames: coreThreatCaseSelection.caseDefinitions.map((caseDefinition) => caseDefinition.fixtureName),
          coreThreatCaseLabel: coreThreatCaseSelection.label,
          coreThreatCaseNames: coreThreatCaseSelection.caseDefinitions.map((caseDefinition) => caseDefinition.name),
          distantThreatCaseFixtureNames: distantThreatCaseSelection.caseDefinitions.map((caseDefinition) => caseDefinition.fixtureName),
          distantThreatCaseLabel: distantThreatCaseSelection.label,
          distantThreatCaseNames: distantThreatCaseSelection.caseDefinitions.map((caseDefinition) => caseDefinition.name),
          harmlessScoutCaseFixtureNames: harmlessScoutCaseSelection.caseDefinitions.map((caseDefinition) => caseDefinition.fixtureName),
          harmlessScoutCaseLabel: harmlessScoutCaseSelection.label,
          harmlessScoutCaseNames: harmlessScoutCaseSelection.caseDefinitions.map((caseDefinition) => caseDefinition.name),
          mixedFixtureError,
          runtimeMonitorCaseFixtureNames: runtimeMonitorCaseSelection.caseDefinitions.map((caseDefinition) => caseDefinition.fixtureName),
          runtimeMonitorCaseLabel: runtimeMonitorCaseSelection.label,
          runtimeMonitorCaseNames: runtimeMonitorCaseSelection.caseDefinitions.map((caseDefinition) => caseDefinition.name),
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
    isStringArray(candidateProbe['coreThreatCaseFixtureNames']) &&
    typeof candidateProbe['coreThreatCaseLabel'] === 'string' &&
    isStringArray(candidateProbe['coreThreatCaseNames']) &&
    isStringArray(candidateProbe['distantThreatCaseFixtureNames']) &&
    typeof candidateProbe['distantThreatCaseLabel'] === 'string' &&
    isStringArray(candidateProbe['distantThreatCaseNames']) &&
    isStringArray(candidateProbe['harmlessScoutCaseFixtureNames']) &&
    typeof candidateProbe['harmlessScoutCaseLabel'] === 'string' &&
    isStringArray(candidateProbe['harmlessScoutCaseNames']) &&
    typeof candidateProbe['mixedFixtureError'] === 'string' &&
    isStringArray(candidateProbe['runtimeMonitorCaseFixtureNames']) &&
    typeof candidateProbe['runtimeMonitorCaseLabel'] === 'string' &&
    isStringArray(candidateProbe['runtimeMonitorCaseNames']) &&
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

  it('keeps smoke inside the single-owned-spawn fixture and selects drill cases explicitly', () => {
    const registryProbe = readRegistryProbe();

    expect(registryProbe.smokeCaseNames).toEqual([
      'basic-runtime-heartbeat',
      'memory-schema-write',
    ]);
    expect(registryProbe.smokeFixtureNames).toEqual(['single-owned-spawn', 'single-owned-spawn']);
    expect(registryProbe.coreThreatCaseLabel).toBe('case=defense-core-threat-safe-mode');
    expect(registryProbe.coreThreatCaseNames).toEqual(['defense-core-threat-safe-mode']);
    expect(registryProbe.coreThreatCaseFixtureNames).toEqual(['defense-core-threat']);
    expect(registryProbe.harmlessScoutCaseLabel).toBe('case=defense-harmless-scout-continues');
    expect(registryProbe.harmlessScoutCaseNames).toEqual(['defense-harmless-scout-continues']);
    expect(registryProbe.harmlessScoutCaseFixtureNames).toEqual(['defense-harmless-scout']);
    expect(registryProbe.distantThreatCaseLabel).toBe('case=defense-distant-threat-defers-build');
    expect(registryProbe.distantThreatCaseNames).toEqual(['defense-distant-threat-defers-build']);
    expect(registryProbe.distantThreatCaseFixtureNames).toEqual(['defense-distant-threat']);
    expect(registryProbe.runtimeMonitorCaseLabel).toBe('case=runtime-resilience-monitoring');
    expect(registryProbe.runtimeMonitorCaseNames).toEqual(['runtime-resilience-monitoring']);
    expect(registryProbe.runtimeMonitorCaseFixtureNames).toEqual(['single-owned-spawn']);
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
