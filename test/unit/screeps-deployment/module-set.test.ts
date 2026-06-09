import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { loadModuleSetModule } from '../../support/screeps-deployment-modules';

describe('Screeps module set', () => {
  it('hashes equivalent module sets independent of key order', async () => {
    const moduleSetModule = await loadModuleSetModule();
    const firstModuleSet = {
      main: 'module.exports.loop = function() {};',
      'main.js.map': '{}',
    };
    const secondModuleSet = {
      'main.js.map': '{}',
      main: 'module.exports.loop = function() {};',
    };

    expect(moduleSetModule.hashModuleSet(firstModuleSet)).toBe(
      moduleSetModule.hashModuleSet(secondModuleSet),
    );
    expect(moduleSetModule.moduleSetsAreEqual(firstModuleSet, secondModuleSet)).toBe(true);
  });

  it('reads dist/main.js as the only local deployment module', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'screeps-module-set-'));

    try {
      await mkdir(join(workspacePath, 'dist'));
      await writeFile(join(workspacePath, 'dist', 'main.js'), 'exports.loop = function loop() {};');

      const moduleSetModule = await loadModuleSetModule();

      await expect(moduleSetModule.readLocalMainModuleSetFrom(workspacePath)).resolves.toEqual({
        main: 'exports.loop = function loop() {};',
      });
    } finally {
      await rm(workspacePath, { recursive: true });
    }
  });

  it('rejects malformed remote module sets', async () => {
    const moduleSetModule = await loadModuleSetModule();

    expect(() => moduleSetModule.decodeRemoteModuleSet([])).toThrow(
      'Screeps API response must contain a modules object.',
    );
    expect(() =>
      moduleSetModule.decodeRemoteModuleSet({
        main: 1,
      }),
    ).toThrow('Remote module "main" must be a string.');
  });

  it('describes empty and populated module sets for non-secret command output', async () => {
    const moduleSetModule = await loadModuleSetModule();

    expect(moduleSetModule.describeModuleNames({})).toBe('(none)');
    expect(
      moduleSetModule.describeModuleNames({
        main: 'source',
        'main.js.map': '{}',
      }),
    ).toBe('main, main.js.map');
  });

  it('fails hashing when a module source is not a string', async () => {
    const moduleSetModule = await loadModuleSetModule();
    const invalidModuleSet = {
      main: 1,
    } as unknown as Record<string, string>;

    expect(() => moduleSetModule.hashModuleSet(invalidModuleSet)).toThrow(
      'Module "main" must be a string.',
    );
  });
});
