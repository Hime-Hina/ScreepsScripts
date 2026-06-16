import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { describe, expect, it } from 'vitest';

interface OpsEventHooksModule {
  runOpsEventHooks(request: {
    readonly decision: {
      readonly actions: readonly string[];
      readonly dedupeKey: string;
      readonly suppressed: boolean;
    };
    readonly env?: Record<string, string | undefined>;
    readonly executeCommand?: (request: {
      readonly command: string;
      readonly input: string;
      readonly timeoutMs: number;
    }) => Promise<{ readonly exitCode?: number | null; readonly timedOut?: boolean }>;
    readonly observedAt?: Date;
    readonly opsEvent: Record<string, unknown>;
    readonly source?: string;
  }): Promise<
    {
      readonly action: string;
      readonly exitCode?: number | null;
      readonly reason?: string;
      readonly status: string;
      readonly timedOut?: boolean;
    }[]
  >;
}

const loadOpsEventHooksModule = async (): Promise<OpsEventHooksModule> => {
  const loadedModule: unknown = await import(
    pathToFileURL(resolve('scripts/screeps/ops-event-hooks.mjs')).href
  );

  if (!isOpsEventHooksModule(loadedModule)) {
    throw new Error('ops-event-hooks.mjs exports changed.');
  }

  return loadedModule;
};

describe('Screeps ops event hooks', () => {
  it('skips active hooks when their commands are not configured', async () => {
    const hooksModule = await loadOpsEventHooksModule();

    await expect(
      hooksModule.runOpsEventHooks({
        decision: createNotifyDecision(),
        env: {},
        opsEvent: createOpsEvent(),
      }),
    ).resolves.toEqual([
      {
        action: 'notify',
        reason: 'not-configured',
        status: 'skipped',
      },
      {
        action: 'wake_hermes',
        reason: 'not-configured',
        status: 'skipped',
      },
    ]);
  });

  it('does not run hooks when the decision has no notify action', async () => {
    const hooksModule = await loadOpsEventHooksModule();

    await expect(
      hooksModule.runOpsEventHooks({
        decision: {
          actions: ['record'],
          dedupeKey: 'runtime_heartbeat:shard1',
          suppressed: false,
        },
        env: { SCREEPS_OPS_NOTIFY_COMMAND: 'notify-hook' },
        executeCommand: () => {
          throw new Error('hook should not run');
        },
        opsEvent: createOpsEvent({ severity: 'info' }),
      }),
    ).resolves.toEqual([]);
  });

  it('passes redacted event payload to the configured notify command over stdin', async () => {
    const hooksModule = await loadOpsEventHooksModule();
    const hookRequests: {
      readonly command: string;
      readonly input: string;
      readonly timeoutMs: number;
    }[] = [];

    await expect(
      hooksModule.runOpsEventHooks({
        decision: createNotifyDecision(),
        env: { SCREEPS_OPS_NOTIFY_COMMAND: 'notify-hook' },
        executeCommand: (hookRequest) => {
          hookRequests.push(hookRequest);
          return Promise.resolve({ exitCode: 0 });
        },
        observedAt: new Date('2026-06-15T00:00:00.000Z'),
        opsEvent: createOpsEvent(),
      }),
    ).resolves.toEqual([
      {
        action: 'notify',
        status: 'delivered',
      },
      {
        action: 'wake_hermes',
        reason: 'not-configured',
        status: 'skipped',
      },
    ]);

    expect(hookRequests).toHaveLength(1);
    expect(hookRequests[0]?.command).toBe('notify-hook');
    expect(hookRequests[0]?.timeoutMs).toBe(10000);
    expect(JSON.parse(hookRequests[0]?.input ?? '{}')).toMatchObject({
      action: 'notify',
      decision: {
        actions: ['record', 'notify', 'wake_hermes'],
        dedupeKey: 'spawn_missing:shard1:W51N21',
        suppressed: false,
      },
      event: {
        metrics: {
          safe: 1,
          token: '[redacted]',
        },
      },
      observedAt: '2026-06-15T00:00:00.000Z',
      source: 'screeps-ops-event-bridge',
    });
  });

  it('passes redacted event payload to the configured wake command over stdin', async () => {
    const hooksModule = await loadOpsEventHooksModule();
    const hookRequests: {
      readonly command: string;
      readonly input: string;
      readonly timeoutMs: number;
    }[] = [];

    await expect(
      hooksModule.runOpsEventHooks({
        decision: {
          actions: ['record', 'wake_hermes'],
          dedupeKey: 'worker_below_target:shard1:W51N21',
          suppressed: false,
        },
        env: { SCREEPS_OPS_WAKE_COMMAND: 'wake-hook' },
        executeCommand: (hookRequest) => {
          hookRequests.push(hookRequest);
          return Promise.resolve({ exitCode: 0 });
        },
        observedAt: new Date('2026-06-15T00:00:00.000Z'),
        opsEvent: createOpsEvent({ severity: 'actionable' }),
      }),
    ).resolves.toEqual([
      {
        action: 'wake_hermes',
        status: 'delivered',
      },
    ]);

    expect(hookRequests).toHaveLength(1);
    expect(hookRequests[0]?.command).toBe('wake-hook');
    expect(hookRequests[0]?.timeoutMs).toBe(10000);
    expect(JSON.parse(hookRequests[0]?.input ?? '{}')).toMatchObject({
      action: 'wake_hermes',
      decision: {
        actions: ['record', 'wake_hermes'],
        dedupeKey: 'worker_below_target:shard1:W51N21',
        suppressed: false,
      },
      event: {
        metrics: {
          safe: 1,
          token: '[redacted]',
        },
      },
      observedAt: '2026-06-15T00:00:00.000Z',
      source: 'screeps-ops-event-bridge',
    });
  });

  it('reports notify hook command failures without throwing', async () => {
    const hooksModule = await loadOpsEventHooksModule();

    await expect(
      hooksModule.runOpsEventHooks({
        decision: createNotifyDecision(),
        env: { SCREEPS_OPS_NOTIFY_COMMAND: 'notify-hook' },
        executeCommand: () => Promise.resolve({ exitCode: 7 }),
        opsEvent: createOpsEvent(),
      }),
    ).resolves.toEqual([
      {
        action: 'notify',
        exitCode: 7,
        status: 'failed',
      },
      {
        action: 'wake_hermes',
        reason: 'not-configured',
        status: 'skipped',
      },
    ]);
  });

  it('can execute a real notify hook command', async () => {
    const hooksModule = await loadOpsEventHooksModule();

    await expect(
      hooksModule.runOpsEventHooks({
        decision: createNotifyDecision(),
        env: { SCREEPS_OPS_NOTIFY_COMMAND: 'node -e "process.stdin.resume()"' },
        opsEvent: createOpsEvent(),
      }),
    ).resolves.toEqual([
      {
        action: 'notify',
        status: 'delivered',
      },
      {
        action: 'wake_hermes',
        reason: 'not-configured',
        status: 'skipped',
      },
    ]);
  });

  it('reports real notify hook non-zero exits', async () => {
    const hooksModule = await loadOpsEventHooksModule();

    await expect(
      hooksModule.runOpsEventHooks({
        decision: createNotifyDecision(),
        env: { SCREEPS_OPS_NOTIFY_COMMAND: 'node -e "process.exit(7)"' },
        opsEvent: createOpsEvent(),
      }),
    ).resolves.toEqual([
      {
        action: 'notify',
        exitCode: 7,
        status: 'failed',
      },
      {
        action: 'wake_hermes',
        reason: 'not-configured',
        status: 'skipped',
      },
    ]);
  });
});

const createNotifyDecision = () => ({
  actions: ['record', 'notify', 'wake_hermes'],
  dedupeKey: 'spawn_missing:shard1:W51N21',
  suppressed: false,
});

const createOpsEvent = (overrides: Record<string, unknown> = {}) => ({
  id: 'spawn-missing-1',
  kind: 'spawn_missing',
  metrics: {
    safe: 1,
    token: '[redacted]',
  },
  room: 'W51N21',
  schema: 'screeps.ops.event.v1',
  severity: 'critical',
  shard: 'shard1',
  summary: 'spawn missing',
  tick: 42,
  ...overrides,
});

const isOpsEventHooksModule = (candidateModule: unknown): candidateModule is OpsEventHooksModule =>
  typeof candidateModule === 'object' &&
  candidateModule !== null &&
  'runOpsEventHooks' in candidateModule &&
  typeof candidateModule.runOpsEventHooks === 'function';
