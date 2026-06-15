import { mkdir, mkdtemp, readdir, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { describe, expect, it } from 'vitest';

interface OpsStoreMaintenanceModule {
  cleanupClaimStore(request: {
    readonly claimRetentionDays?: number;
    readonly claimStorePath: string | null;
    readonly clock?: Date;
  }): Promise<{ readonly filesRemoved: number }>;
  cleanupEventStoreDirectory(request: {
    readonly clock?: Date;
    readonly eventRetentionDays?: number;
    readonly eventStoreDirectory: string | null;
  }): Promise<{ readonly filesRemoved: number }>;
  cleanupOpsDataStores(request?: {
    readonly claimRetentionDays?: number;
    readonly claimStorePath?: string | null;
    readonly clock?: Date;
    readonly eventRetentionDays?: number;
    readonly eventStoreDirectory?: string | null;
  }): Promise<{ readonly claimFilesRemoved: number; readonly eventFilesRemoved: number }>;
}

const loadOpsStoreMaintenanceModule = async (): Promise<OpsStoreMaintenanceModule> => {
  const loadedModule: unknown = await import(
    pathToFileURL(resolve('scripts/screeps/ops-store-maintenance.mjs')).href
  );

  if (!isOpsStoreMaintenanceModule(loadedModule)) {
    throw new Error('ops-store-maintenance.mjs exports changed.');
  }

  return loadedModule;
};

describe('Screeps ops store maintenance', () => {
  it('removes stale day-scoped JSONL event files and keeps recent or unrelated files', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'screeps-ops-events-retention-'));
    const eventStoreDirectory = join(workspacePath, 'events');
    const maintenanceModule = await loadOpsStoreMaintenanceModule();

    try {
      await mkdir(eventStoreDirectory, { recursive: true });
      await writeFile(join(eventStoreDirectory, '2026-05-31.jsonl'), '{}\n', 'utf8');
      await writeFile(join(eventStoreDirectory, '2026-06-02.jsonl'), '{}\n', 'utf8');
      await writeFile(join(eventStoreDirectory, 'notes.txt'), 'keep\n', 'utf8');

      await expect(
        maintenanceModule.cleanupEventStoreDirectory({
          clock: new Date('2026-06-15T12:00:00.000Z'),
          eventRetentionDays: 14,
          eventStoreDirectory,
        }),
      ).resolves.toEqual({ filesRemoved: 1 });

      expect((await readdir(eventStoreDirectory)).sort()).toEqual([
        '2026-06-02.jsonl',
        'notes.txt',
      ]);
    } finally {
      await rm(workspacePath, { force: true, recursive: true });
    }
  });

  it('removes stale claim records by claimedAt and falls back to mtime for unreadable claims', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'screeps-ops-claims-retention-'));
    const claimStorePath = join(workspacePath, 'claims');
    const maintenanceModule = await loadOpsStoreMaintenanceModule();
    const malformedOldPath = join(claimStorePath, 'malformed-old.json');

    try {
      await mkdir(claimStorePath, { recursive: true });
      await writeFile(
        join(claimStorePath, 'old.json'),
        JSON.stringify({ claimedAt: '2026-06-01T00:00:00.000Z' }),
        'utf8',
      );
      await writeFile(
        join(claimStorePath, 'recent.json'),
        JSON.stringify({ claimedAt: '2026-06-15T00:00:00.000Z' }),
        'utf8',
      );
      await writeFile(malformedOldPath, '{bad json', 'utf8');
      await writeFile(join(claimStorePath, 'readme.txt'), 'keep\n', 'utf8');
      await utimes(
        malformedOldPath,
        new Date('2026-06-01T00:00:00.000Z'),
        new Date('2026-06-01T00:00:00.000Z'),
      );

      await expect(
        maintenanceModule.cleanupClaimStore({
          claimRetentionDays: 2,
          claimStorePath,
          clock: new Date('2026-06-15T12:00:00.000Z'),
        }),
      ).resolves.toEqual({ filesRemoved: 2 });

      expect((await readdir(claimStorePath)).sort()).toEqual(['readme.txt', 'recent.json']);
    } finally {
      await rm(workspacePath, { force: true, recursive: true });
    }
  });

  it('treats missing or disabled stores as no-op cleanup', async () => {
    const maintenanceModule = await loadOpsStoreMaintenanceModule();

    await expect(maintenanceModule.cleanupOpsDataStores()).resolves.toEqual({
      claimFilesRemoved: 0,
      eventFilesRemoved: 0,
    });
    await expect(
      maintenanceModule.cleanupOpsDataStores({
        claimStorePath: '/tmp/screeps-missing-claims-for-test',
        eventStoreDirectory: '/tmp/screeps-missing-events-for-test',
      }),
    ).resolves.toEqual({
      claimFilesRemoved: 0,
      eventFilesRemoved: 0,
    });
  });
});

const isOpsStoreMaintenanceModule = (
  candidateModule: unknown,
): candidateModule is OpsStoreMaintenanceModule =>
  typeof candidateModule === 'object' &&
  candidateModule !== null &&
  'cleanupClaimStore' in candidateModule &&
  typeof candidateModule.cleanupClaimStore === 'function' &&
  'cleanupEventStoreDirectory' in candidateModule &&
  typeof candidateModule.cleanupEventStoreDirectory === 'function' &&
  'cleanupOpsDataStores' in candidateModule &&
  typeof candidateModule.cleanupOpsDataStores === 'function';
