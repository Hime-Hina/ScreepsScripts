import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { loadConfigModule, loadPtrConfigModule } from '../../support/screeps-deployment-modules';

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

describe('Screeps PTR config', () => {
  it('loads independent PTR branch and token config without live server fields', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'screeps-ptr-config-'));

    try {
      await writeFile(
        join(workspacePath, 'screeps.ptr.json'),
        JSON.stringify({
          branch: 'main',
          token: 'ptr-secret-token',
        }),
      );

      const ptrConfigModule = await loadPtrConfigModule();

      await expect(ptrConfigModule.readPtrScreepsConfigFrom(workspacePath)).resolves.toEqual({
        branch: 'main',
        token: 'ptr-secret-token',
      });
    } finally {
      await rm(workspacePath, { recursive: true });
    }
  });

  it('rejects missing PTR config without falling back to live screeps.json', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'screeps-ptr-config-'));

    try {
      await writeFile(
        join(workspacePath, 'screeps.json'),
        JSON.stringify({
          main: {
            branch: 'main',
            protocol: 'https',
            server: 'screeps.com',
            token: 'live-secret-token',
          },
        }),
      );

      const ptrConfigModule = await loadPtrConfigModule();

      await expect(ptrConfigModule.readPtrScreepsConfigFrom(workspacePath)).rejects.toThrow(
        'Missing screeps.ptr.json; create it from screeps.ptr.example.json.',
      );
    } finally {
      await rm(workspacePath, { recursive: true });
    }
  });

  it('rejects malformed PTR config without leaking token values', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'screeps-ptr-config-'));
    const ptrSecretToken = 'ptr-secret-token';

    try {
      await writeFile(
        join(workspacePath, 'screeps.ptr.json'),
        JSON.stringify({
          branch: '',
          token: ptrSecretToken,
        }),
      );

      const ptrConfigModule = await loadPtrConfigModule();

      await expect(ptrConfigModule.readPtrScreepsConfigFrom(workspacePath)).rejects.toThrow(
        'PTR config field "branch" must be a non-empty string.',
      );
      await expect(ptrConfigModule.readPtrScreepsConfigFrom(workspacePath)).rejects.not.toThrow(
        ptrSecretToken,
      );
    } finally {
      await rm(workspacePath, { recursive: true });
    }
  });

  it('rejects live profile, endpoint, cookie, and password fields in PTR config', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'screeps-ptr-config-'));

    try {
      const ptrConfigModule = await loadPtrConfigModule();

      await writeFile(
        join(workspacePath, 'screeps.ptr.json'),
        JSON.stringify({
          main: {
            branch: 'main',
            token: 'ptr-secret-token',
          },
        }),
      );

      await expect(ptrConfigModule.readPtrScreepsConfigFrom(workspacePath)).rejects.toThrow(
        'PTR config supports only "branch" and "token"; remove unsupported field "main".',
      );

      await writeFile(
        join(workspacePath, 'screeps.ptr.json'),
        JSON.stringify({
          branch: 'main',
          server: 'screeps.com',
          token: 'ptr-secret-token',
        }),
      );

      await expect(ptrConfigModule.readPtrScreepsConfigFrom(workspacePath)).rejects.toThrow(
        'PTR config supports only "branch" and "token"; remove unsupported field "server".',
      );

      await writeFile(
        join(workspacePath, 'screeps.ptr.json'),
        JSON.stringify({
          branch: 'main',
          cookie: '',
          token: 'ptr-secret-token',
        }),
      );

      await expect(ptrConfigModule.readPtrScreepsConfigFrom(workspacePath)).rejects.toThrow(
        'PTR config supports only "branch" and "token"; remove unsupported field "cookie".',
      );

      await writeFile(
        join(workspacePath, 'screeps.ptr.json'),
        JSON.stringify({
          branch: 'main',
          password: '',
          token: 'ptr-secret-token',
        }),
      );

      await expect(ptrConfigModule.readPtrScreepsConfigFrom(workspacePath)).rejects.toThrow(
        'PTR config supports only "branch" and "token"; remove unsupported field "password".',
      );
    } finally {
      await rm(workspacePath, { recursive: true });
    }
  });

  it('rejects malformed PTR JSON before decoding fields', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'screeps-ptr-config-'));

    try {
      await writeFile(join(workspacePath, 'screeps.ptr.json'), '{not-json');

      const ptrConfigModule = await loadPtrConfigModule();

      await expect(ptrConfigModule.readPtrScreepsConfigFrom(workspacePath)).rejects.toThrow(
        'screeps.ptr.json is not valid JSON.',
      );
    } finally {
      await rm(workspacePath, { recursive: true });
    }
  });
});
