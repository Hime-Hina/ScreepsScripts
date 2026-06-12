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

const readDefaultCheckWorkflow = (): string => readFileSync('.github/workflows/check.yml', 'utf8');

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
      'deploy:ptr:screeps',
      'found:ptr-room:screeps',
      'lint',
      'rollback:screeps',
      'rollback:ptr:screeps',
      'scout:screeps',
      'test:bundle',
      'test:coverage',
      'test:integration',
      'test:screeps-server',
      'test:system',
      'test:unit',
      'typecheck',
      'verify:live:screeps',
      'verify:ptr:screeps',
    ];

    expect(packageManifest.packageManager).toMatch(/^pnpm@/);

    for (const scriptName of requiredScriptNames) {
      expect(typeof packageManifest.scripts[scriptName]).toBe('string');
    }
  });

  it('keeps Screeps credentials and rollback snapshots out of tracked source', () => {
    const gitIgnoreText = readFileSync('.gitignore', 'utf8');

    expect(gitIgnoreText).toContain('screeps.json');
    expect(gitIgnoreText).toContain('screeps.ptr.json');
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
    expect(packageManifest.scripts['deploy:ptr:screeps']).toBe(
      'pnpm check && pnpm build && node scripts/screeps/deploy-ptr.mjs',
    );
    expect(packageManifest.scripts['found:ptr-room:screeps']).toBe(
      'node scripts/screeps/found-ptr-room.mjs',
    );
    expect(packageManifest.scripts['verify:ptr:screeps']).toBe(
      'pnpm build && node scripts/screeps/verify-ptr.mjs',
    );
    expect(packageManifest.scripts['rollback:ptr:screeps']).toBe(
      'node scripts/screeps/rollback-ptr.mjs',
    );
    expect(packageManifest.scripts['test:bundle']).toBe('pnpm build && vitest run test/e2e');
    expect(packageManifest.scripts['test:screeps-server']).toBe(
      'node scripts/screeps-server/run-suite.mjs smoke',
    );
    expect(
      Object.keys(packageManifest.scripts).filter((scriptName) =>
        scriptName.startsWith('test:screeps-server:'),
      ),
    ).toEqual([]);
    expect(packageManifest.scripts['check']).toContain('pnpm test:bundle');
    expect(packageManifest.scripts['check']).not.toContain('deploy:screeps');
    expect(packageManifest.scripts['check']).not.toContain('deploy:ptr:screeps');
    expect(packageManifest.scripts['check']).not.toContain('rollback:screeps');
    expect(packageManifest.scripts['check']).not.toContain('rollback:ptr:screeps');
    expect(packageManifest.scripts['check']).not.toContain('scout:screeps');
    expect(packageManifest.scripts['check']).not.toContain('test:screeps-server');
    expect(packageManifest.scripts['check']).not.toContain('verify:live:screeps');
    expect(packageManifest.scripts['check']).not.toContain('verify:ptr:screeps');
  });

  it('defines the default GitHub Actions check gate without Screeps operations', () => {
    const workflowText = readDefaultCheckWorkflow();
    const forbiddenProjectCommands = [
      'deploy:screeps',
      'deploy:ptr:screeps',
      'found:ptr-room:screeps',
      'verify:live:screeps',
      'verify:ptr:screeps',
      'rollback:screeps',
      'rollback:ptr:screeps',
      'scout:screeps',
      'test:screeps-server',
    ];

    expect(workflowText).toMatch(/^on:\r?\n(?:.|\r?\n)*^\s*pull_request:\s*$/m);
    expect(workflowText).toMatch(
      /^on:\r?\n(?:.|\r?\n)*^\s*push:\r?\n\s*branches:\r?\n\s*-\s*master\s*$/m,
    );
    expect(workflowText).toContain('uses: actions/setup-node@');
    expect(workflowText).toMatch(/node-version:\s*22\b/);
    expect(workflowText).toContain('run: corepack enable');
    expect(workflowText).toContain('run: pnpm install --frozen-lockfile');
    expect(workflowText).toContain('run: pnpm check');
    expect(workflowText).not.toMatch(/\bworkflow_dispatch\b/);
    expect(workflowText).not.toMatch(/\bsecrets\./i);
    expect(workflowText).not.toMatch(/\bSCREEPS\b/i);

    for (const forbiddenProjectCommand of forbiddenProjectCommands) {
      expect(workflowText).not.toContain(forbiddenProjectCommand);
    }
  });
});
