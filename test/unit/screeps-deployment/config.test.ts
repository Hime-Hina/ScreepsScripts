import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { loadConfigModule } from '../../support/screeps-deployment-modules';

describe('Screeps deployment config', () => {
  it('loads the main Screeps profile without requiring account passwords', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'screeps-config-'));

    try {
      await writeFile(
        join(workspacePath, 'screeps.json'),
        JSON.stringify({
          main: {
            branch: 'main',
            protocol: 'https',
            server: 'screeps.com',
            token: 'secret-token',
          },
        }),
      );

      const configModule = await loadConfigModule();

      await expect(configModule.readMainScreepsConfigFrom(workspacePath)).resolves.toEqual({
        branch: 'main',
        protocol: 'https',
        server: 'screeps.com',
        token: 'secret-token',
      });
    } finally {
      await rm(workspacePath, { recursive: true });
    }
  });

  it('rejects missing token at the config boundary', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'screeps-config-'));

    try {
      await writeFile(
        join(workspacePath, 'screeps.json'),
        JSON.stringify({
          main: {
            branch: 'main',
            protocol: 'https',
            server: 'screeps.com',
          },
        }),
      );

      const configModule = await loadConfigModule();

      await expect(configModule.readMainScreepsConfigFrom(workspacePath)).rejects.toThrow(
        'Screeps config field "token" must be a non-empty string.',
      );
    } finally {
      await rm(workspacePath, { recursive: true });
    }
  });

  it('rejects a missing local config file without printing secrets', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'screeps-config-'));

    try {
      const configModule = await loadConfigModule();

      await expect(configModule.readMainScreepsConfigFrom(workspacePath)).rejects.toThrow(
        'Missing screeps.json; create it from screeps.example.json.',
      );
    } finally {
      await rm(workspacePath, { recursive: true });
    }
  });

  it('rejects malformed JSON before decoding fields', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'screeps-config-'));

    try {
      await writeFile(join(workspacePath, 'screeps.json'), '{not-json');

      const configModule = await loadConfigModule();

      await expect(configModule.readMainScreepsConfigFrom(workspacePath)).rejects.toThrow(
        'screeps.json is not valid JSON.',
      );
    } finally {
      await rm(workspacePath, { recursive: true });
    }
  });

  it('rejects config files without the main profile object', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'screeps-config-'));

    try {
      await writeFile(join(workspacePath, 'screeps.json'), JSON.stringify([]));

      const configModule = await loadConfigModule();

      await expect(configModule.readMainScreepsConfigFrom(workspacePath)).rejects.toThrow(
        'screeps.json must contain a top-level object.',
      );
    } finally {
      await rm(workspacePath, { recursive: true });
    }
  });

  it('rejects unsupported protocols and server paths', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'screeps-config-'));

    try {
      const configModule = await loadConfigModule();

      await writeFile(
        join(workspacePath, 'screeps.json'),
        JSON.stringify({
          main: {
            branch: 'main',
            protocol: 'ftp',
            server: 'screeps.com',
            token: 'secret-token',
          },
        }),
      );

      await expect(configModule.readMainScreepsConfigFrom(workspacePath)).rejects.toThrow(
        'Screeps protocol must be "https" or "http".',
      );

      await writeFile(
        join(workspacePath, 'screeps.json'),
        JSON.stringify({
          main: {
            branch: 'main',
            protocol: 'https',
            server: 'screeps.com/api',
            token: 'secret-token',
          },
        }),
      );

      await expect(configModule.readMainScreepsConfigFrom(workspacePath)).rejects.toThrow(
        'Screeps server must be a host name without protocol or path.',
      );
    } finally {
      await rm(workspacePath, { recursive: true });
    }
  });
});
