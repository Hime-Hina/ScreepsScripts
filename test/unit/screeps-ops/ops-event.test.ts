import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { describe, expect, it } from 'vitest';

interface OpsEventModule {
  appendOpsEventToJsonl(storePath: string, opsEvent: Record<string, unknown>): Promise<void>;
  createOpsEventPolicyState(): unknown;
  decideOpsEventActions(
    opsEvent: Record<string, unknown>,
    policyState?: unknown,
  ): { actions: string[]; dedupeKey: string; suppressed: boolean };
  parseOpsEventLine(consoleLine: string): Record<string, unknown> | null;
}

const loadOpsEventModule = async (): Promise<OpsEventModule> => {
  const loadedModule: unknown = await import(
    pathToFileURL(resolve('scripts/screeps/ops-event.mjs')).href
  );

  if (!isOpsEventModule(loadedModule)) {
    throw new Error('ops-event.mjs exports changed.');
  }

  return loadedModule;
};

describe('Screeps ops event parser', () => {
  it('parses structured Hermes event console lines', async () => {
    const opsEventModule = await loadOpsEventModule();

    const opsEvent = opsEventModule.parseOpsEventLine(
      '[HERMES_EVENT] {"schema":"screeps.ops.event.v1","id":"worker-low-1","severity":"actionable","kind":"worker_below_target","tick":42,"shard":"shard1","room":"W51N21","summary":"worker count below target","metrics":{"workers":2,"target":3}}',
    );

    expect(opsEvent).toMatchObject({
      id: 'worker-low-1',
      kind: 'worker_below_target',
      metrics: {
        target: 3,
        workers: 2,
      },
      room: 'W51N21',
      schema: 'screeps.ops.event.v1',
      severity: 'actionable',
      shard: 'shard1',
      summary: 'worker count below target',
      tick: 42,
    });
  });

  it('ignores normal console heartbeat lines', async () => {
    const opsEventModule = await loadOpsEventModule();

    expect(
      opsEventModule.parseOpsEventLine(
        '[tick 42] cpu=0.10 bucket=10000 limit=20 tickLimit=500 budget=full rooms=W51N21:workers=5',
      ),
    ).toBeNull();
  });

  it('rejects malformed structured events without leaking payload details', async () => {
    const opsEventModule = await loadOpsEventModule();

    expect(() => opsEventModule.parseOpsEventLine('[HERMES_EVENT] {bad json')).toThrow(
      'Ops event line contains invalid JSON.',
    );
  });

  it('redacts sensitive metric keys before persistence or policy use', async () => {
    const opsEventModule = await loadOpsEventModule();

    const opsEvent = opsEventModule.parseOpsEventLine(
      '[HERMES_EVENT] {"schema":"screeps.ops.event.v1","id":"secret-test","severity":"critical","kind":"token_probe","tick":7,"shard":"shard1","summary":"secret should be redacted","metrics":{"token":"ptr-secret-token","nested":{"password":"pw","safe":1}}}',
    );

    expect(opsEvent).toMatchObject({
      metrics: {
        nested: {
          password: '[redacted]',
          safe: 1,
        },
        token: '[redacted]',
      },
    });
  });
});

describe('Screeps ops event store and policy', () => {
  it('appends normalized events as JSONL', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'screeps-ops-events-'));
    const storePath = join(workspacePath, 'events', 'live.jsonl');
    const opsEventModule = await loadOpsEventModule();

    try {
      const firstEvent = opsEventModule.parseOpsEventLine(
        '[HERMES_EVENT] {"schema":"screeps.ops.event.v1","id":"event-1","severity":"info","kind":"heartbeat","tick":1,"shard":"shard1","summary":"ok"}',
      );
      const secondEvent = opsEventModule.parseOpsEventLine(
        '[HERMES_EVENT] {"schema":"screeps.ops.event.v1","id":"event-2","severity":"warning","kind":"cpu_bucket_low","tick":2,"shard":"shard1","summary":"bucket low"}',
      );

      if (firstEvent === null || secondEvent === null) {
        throw new Error('Expected structured events.');
      }

      await opsEventModule.appendOpsEventToJsonl(storePath, firstEvent);
      await opsEventModule.appendOpsEventToJsonl(storePath, secondEvent);

      const storedLines = (await readFile(storePath, 'utf8')).trim().split('\n');

      const storedEvents: unknown[] = storedLines.map(
        (storedLine: string) => JSON.parse(storedLine) as unknown,
      );

      expect(storedEvents).toEqual([firstEvent, secondEvent]);
    } finally {
      await rm(workspacePath, { force: true, recursive: true });
    }
  });

  it('records info events without waking Hermes', async () => {
    const opsEventModule = await loadOpsEventModule();
    const opsEvent = opsEventModule.parseOpsEventLine(
      '[HERMES_EVENT] {"schema":"screeps.ops.event.v1","id":"heartbeat-1","severity":"info","kind":"heartbeat","tick":10,"shard":"shard1","summary":"ok"}',
    );

    if (opsEvent === null) {
      throw new Error('Expected structured event.');
    }

    expect(opsEventModule.decideOpsEventActions(opsEvent)).toMatchObject({
      actions: ['record'],
      suppressed: false,
    });
  });

  it('wakes Hermes for actionable events and suppresses repeated cooldown events', async () => {
    const opsEventModule = await loadOpsEventModule();
    const policyState = opsEventModule.createOpsEventPolicyState();
    const firstEvent = opsEventModule.parseOpsEventLine(
      '[HERMES_EVENT] {"schema":"screeps.ops.event.v1","id":"worker-low-1","severity":"actionable","kind":"worker_below_target","tick":100,"shard":"shard1","room":"W51N21","summary":"worker count below target","cooldownTicks":50}',
    );
    const repeatedEvent = opsEventModule.parseOpsEventLine(
      '[HERMES_EVENT] {"schema":"screeps.ops.event.v1","id":"worker-low-2","severity":"actionable","kind":"worker_below_target","tick":120,"shard":"shard1","room":"W51N21","summary":"worker count still below target","cooldownTicks":50}',
    );

    if (firstEvent === null || repeatedEvent === null) {
      throw new Error('Expected structured events.');
    }

    expect(opsEventModule.decideOpsEventActions(firstEvent, policyState)).toMatchObject({
      actions: ['record', 'wake_hermes'],
      suppressed: false,
    });
    expect(opsEventModule.decideOpsEventActions(repeatedEvent, policyState)).toMatchObject({
      actions: ['record'],
      suppressed: true,
    });
  });

  it('notifies and wakes Hermes for critical events', async () => {
    const opsEventModule = await loadOpsEventModule();
    const opsEvent = opsEventModule.parseOpsEventLine(
      '[HERMES_EVENT] {"schema":"screeps.ops.event.v1","id":"spawn-missing-1","severity":"critical","kind":"spawn_missing","tick":200,"shard":"shard1","room":"W51N21","summary":"spawn missing"}',
    );

    if (opsEvent === null) {
      throw new Error('Expected structured event.');
    }

    expect(opsEventModule.decideOpsEventActions(opsEvent)).toMatchObject({
      actions: ['record', 'notify', 'wake_hermes'],
      suppressed: false,
    });
  });
});

const isOpsEventModule = (candidateModule: unknown): candidateModule is OpsEventModule =>
  typeof candidateModule === 'object' &&
  candidateModule !== null &&
  'appendOpsEventToJsonl' in candidateModule &&
  typeof candidateModule.appendOpsEventToJsonl === 'function' &&
  'createOpsEventPolicyState' in candidateModule &&
  typeof candidateModule.createOpsEventPolicyState === 'function' &&
  'decideOpsEventActions' in candidateModule &&
  typeof candidateModule.decideOpsEventActions === 'function' &&
  'parseOpsEventLine' in candidateModule &&
  typeof candidateModule.parseOpsEventLine === 'function';
