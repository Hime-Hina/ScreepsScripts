import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { loadRollbackSnapshotModule } from '../../support/screeps-deployment-modules';

describe('Screeps rollback snapshot', () => {
  it('stores the branch-bound remote module set for rollback', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'screeps-rollback-'));

    try {
      const rollbackSnapshotModule = await loadRollbackSnapshotModule();
      const rollbackSnapshot = rollbackSnapshotModule.createRollbackSnapshot(
        'main',
        {
          main: 'old-main',
          'main.js.map': 'old-map',
        },
        '2026-06-09T00:00:00.000Z',
      );

      await rollbackSnapshotModule.writeRollbackSnapshotTo(workspacePath, rollbackSnapshot);

      await expect(
        rollbackSnapshotModule.readRollbackSnapshotFrom(workspacePath),
      ).resolves.toMatchObject({
        branch: 'main',
        capturedAt: '2026-06-09T00:00:00.000Z',
        modules: {
          main: 'old-main',
          'main.js.map': 'old-map',
        },
      });
    } finally {
      await rm(workspacePath, { recursive: true });
    }
  });

  it('rejects rollback when the configured branch differs from the snapshot branch', async () => {
    const rollbackSnapshotModule = await loadRollbackSnapshotModule();
    const rollbackSnapshot = rollbackSnapshotModule.createRollbackSnapshot(
      'main',
      {
        main: 'old-main',
      },
      '2026-06-09T00:00:00.000Z',
    );

    expect(() =>
      rollbackSnapshotModule.assertSnapshotBranch(rollbackSnapshot, 'simulation'),
    ).toThrow('Rollback snapshot branch "main" does not match configured branch "simulation".');
  });

  it('rejects missing and malformed rollback snapshots', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'screeps-rollback-'));
    const rollbackSnapshotPath = join('.screeps', 'rollback', 'latest.json');

    try {
      const rollbackSnapshotModule = await loadRollbackSnapshotModule();

      await expect(rollbackSnapshotModule.readRollbackSnapshotFrom(workspacePath)).rejects.toThrow(
        `Missing rollback snapshot at ${rollbackSnapshotPath}`,
      );

      await writeSnapshotText(workspacePath, '{not-json');

      await expect(rollbackSnapshotModule.readRollbackSnapshotFrom(workspacePath)).rejects.toThrow(
        `${rollbackSnapshotPath} is not valid JSON.`,
      );
    } finally {
      await rm(workspacePath, { recursive: true });
    }
  });

  it('rejects unsupported snapshot schema and malformed module hashes', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'screeps-rollback-'));

    try {
      const rollbackSnapshotModule = await loadRollbackSnapshotModule();

      await writeSnapshotText(
        workspacePath,
        JSON.stringify({
          schemaVersion: 2,
        }),
      );

      await expect(rollbackSnapshotModule.readRollbackSnapshotFrom(workspacePath)).rejects.toThrow(
        'Rollback snapshot schema version is not supported.',
      );

      await writeSnapshotText(
        workspacePath,
        JSON.stringify({
          schemaVersion: 1,
          capturedAt: '2026-06-09T00:00:00.000Z',
          branch: 'main',
          moduleSetHash: 'hash',
          moduleHashes: {
            main: 1,
          },
          modules: {
            main: 'old-main',
          },
        }),
      );

      await expect(rollbackSnapshotModule.readRollbackSnapshotFrom(workspacePath)).rejects.toThrow(
        'Rollback snapshot moduleHashes.main must be a string.',
      );
    } finally {
      await rm(workspacePath, { recursive: true });
    }
  });

  it('rejects snapshots whose stored hash does not match the modules', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'screeps-rollback-'));

    try {
      const rollbackSnapshotModule = await loadRollbackSnapshotModule();
      const rollbackSnapshot = rollbackSnapshotModule.createRollbackSnapshot(
        'main',
        {
          main: 'old-main',
        },
        '2026-06-09T00:00:00.000Z',
      );

      await writeSnapshotText(
        workspacePath,
        JSON.stringify({
          ...rollbackSnapshot,
          modules: {
            main: 'tampered-main',
          },
        }),
      );

      await expect(rollbackSnapshotModule.readRollbackSnapshotFrom(workspacePath)).rejects.toThrow(
        'Rollback snapshot moduleSetHash does not match modules.',
      );
    } finally {
      await rm(workspacePath, { recursive: true });
    }
  });
});

const writeSnapshotText = async (workspacePath: string, snapshotText: string) => {
  const snapshotDirectory = join(workspacePath, '.screeps', 'rollback');

  await mkdir(snapshotDirectory, { recursive: true });
  await writeFile(join(snapshotDirectory, 'latest.json'), snapshotText);
};
