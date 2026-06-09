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
      'lint',
      'test:coverage',
      'test:e2e',
      'test:integration',
      'test:system',
      'test:unit',
      'typecheck',
    ];

    expect(packageManifest.packageManager).toMatch(/^pnpm@/);

    for (const scriptName of requiredScriptNames) {
      expect(typeof packageManifest.scripts[scriptName]).toBe('string');
    }
  });
});
