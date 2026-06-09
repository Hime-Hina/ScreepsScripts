import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

interface PackageManifest {
  readonly packageManager: string;
  readonly scripts: Record<string, string>;
}

const readPackageManifest = (): PackageManifest => {
  const packageManifest: unknown = JSON.parse(readFileSync('package.json', 'utf8'));

  if (!isPackageManifest(packageManifest)) {
    throw new Error('package.json does not match the expected project contract.');
  }

  return packageManifest;
};

const isPackageManifest = (packageManifest: unknown): packageManifest is PackageManifest => {
  if (typeof packageManifest !== 'object' || packageManifest === null) {
    return false;
  }

  const candidateManifest = packageManifest as Record<string, unknown>;
  const scriptsCandidate = candidateManifest['scripts'];

  return (
    typeof candidateManifest['packageManager'] === 'string' &&
    candidateManifest['packageManager'].startsWith('pnpm@') &&
    typeof scriptsCandidate === 'object' &&
    scriptsCandidate !== null &&
    Object.values(scriptsCandidate).every((scriptCommand) => typeof scriptCommand === 'string')
  );
};

describe('project scripts', () => {
  it('keeps pnpm as the package manager and exposes the required verification scripts', () => {
    const packageManifest = readPackageManifest();
    const requiredScriptNames = [
      'build',
      'check',
      'deploy:screeps',
      'lint',
      'rollback:screeps',
      'scout:screeps',
      'test:coverage',
      'test:e2e',
      'test:integration',
      'test:system',
      'test:unit',
      'typecheck',
      'verify:live:screeps',
    ];

    expect(packageManifest.packageManager).toMatch(/^pnpm@/);

    for (const scriptName of requiredScriptNames) {
      expect(typeof packageManifest.scripts[scriptName]).toBe('string');
    }
  });

  it('keeps live Screeps credentials and rollback snapshots out of tracked source', () => {
    const gitIgnoreText = readFileSync('.gitignore', 'utf8');

    expect(gitIgnoreText).toContain('screeps.json');
    expect(gitIgnoreText).toContain('.screeps/');
  });

  it('keeps live Screeps operations explicit and outside the default check gate', () => {
    const packageManifest = readPackageManifest();

    expect(packageManifest.scripts['deploy:screeps']).toBe(
      'pnpm check && pnpm build && node scripts/screeps/deploy.mjs',
    );
    expect(packageManifest.scripts['verify:live:screeps']).toBe(
      'pnpm build && node scripts/screeps/verify-live.mjs',
    );
    expect(packageManifest.scripts['rollback:screeps']).toBe('node scripts/screeps/rollback.mjs');
    expect(packageManifest.scripts['scout:screeps']).toBe('node scripts/screeps/scout-rooms.mjs');
    expect(packageManifest.scripts['check']).not.toContain('deploy:screeps');
    expect(packageManifest.scripts['check']).not.toContain('rollback:screeps');
    expect(packageManifest.scripts['check']).not.toContain('scout:screeps');
  });
});
