import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { describe, expect, it } from 'vitest';

interface OpsEventNotifierModule {
  formatOpsEventNotification(payload: Record<string, unknown>): string;
  runOpsEventNotifier(request: {
    readonly env?: Record<string, string | undefined>;
    readonly inputText?: string;
    readonly sendMessage?: (request: {
      readonly hermesCommand: string;
      readonly message: string;
      readonly target: string;
    }) => Promise<void>;
  }): Promise<{ readonly target: string }>;
}

const loadOpsEventNotifierModule = async (): Promise<OpsEventNotifierModule> => {
  const loadedModule: unknown = await import(
    pathToFileURL(resolve('scripts/screeps/ops-event-notifier.mjs')).href
  );

  if (!isOpsEventNotifierModule(loadedModule)) {
    throw new Error('ops-event-notifier.mjs exports changed.');
  }

  return loadedModule;
};

describe('Screeps ops event notifier', () => {
  it('formats compact Telegram-safe ops notifications without raw metrics', async () => {
    const notifierModule = await loadOpsEventNotifierModule();

    expect(notifierModule.formatOpsEventNotification(createHookPayload())).toBe(
      [
        'Screeps critical: spawn_missing',
        'spawn missing',
        'scope: shard=shard1 room=W51N21 tick=42',
        'dedupeKey=spawn_missing:shard1:W51N21',
        'actions=record,notify,wake_hermes',
        'observedAt=2026-06-15T00:00:00.000Z',
      ].join('\n'),
    );
    expect(notifierModule.formatOpsEventNotification(createHookPayload())).not.toContain(
      'secret-token',
    );
  });

  it('sends formatted notification through hermes send target configuration', async () => {
    const notifierModule = await loadOpsEventNotifierModule();
    const sendRequests: {
      readonly hermesCommand: string;
      readonly message: string;
      readonly target: string;
    }[] = [];

    await expect(
      notifierModule.runOpsEventNotifier({
        env: {
          HERMES_BIN: '/opt/hermes/bin/hermes',
          SCREEPS_OPS_NOTIFY_TARGET: 'telegram:-1001234567890',
        },
        inputText: JSON.stringify(createHookPayload()),
        sendMessage: (sendRequest) => {
          sendRequests.push(sendRequest);
          return Promise.resolve();
        },
      }),
    ).resolves.toEqual({ target: 'telegram:-1001234567890' });

    expect(sendRequests).toEqual([
      {
        hermesCommand: '/opt/hermes/bin/hermes',
        message: expect.stringContaining('Screeps critical: spawn_missing') as string,
        target: 'telegram:-1001234567890',
      },
    ]);
    expect(sendRequests[0]?.message).not.toContain('secret-token');
  });

  it('defaults to the Hermes binary on PATH and the Telegram home target', async () => {
    const notifierModule = await loadOpsEventNotifierModule();
    const sendRequests: {
      readonly hermesCommand: string;
      readonly message: string;
      readonly target: string;
    }[] = [];

    await expect(
      notifierModule.runOpsEventNotifier({
        env: {},
        inputText: JSON.stringify(createHookPayload()),
        sendMessage: (sendRequest) => {
          sendRequests.push(sendRequest);
          return Promise.resolve();
        },
      }),
    ).resolves.toEqual({ target: 'telegram' });

    expect(sendRequests[0]?.hermesCommand).toBe('hermes');
    expect(sendRequests[0]?.target).toBe('telegram');
  });

  it('runs hermes send with the formatted message over stdin', async () => {
    const notifierModule = await loadOpsEventNotifierModule();
    const workspacePath = await mkdtemp(join(tmpdir(), 'screeps-ops-notifier-'));
    const fakeHermesPath = join(workspacePath, 'fake-hermes.mjs');
    const capturedMessagePath = join(workspacePath, 'message.txt');
    const previousCapturePath = process.env['FAKE_HERMES_CAPTURE_PATH'];

    try {
      await writeFile(
        fakeHermesPath,
        [
          '#!/usr/bin/env node',
          "import { writeFileSync } from 'node:fs';",
          "let inputText = '';",
          "process.stdin.on('data', (chunk) => { inputText += chunk; });",
          "process.stdin.on('end', () => {",
          '  writeFileSync(process.env.FAKE_HERMES_CAPTURE_PATH, JSON.stringify({ argv: process.argv.slice(2), inputText }));',
          '});',
        ].join('\n'),
        'utf8',
      );
      await chmod(fakeHermesPath, 0o755);
      process.env['FAKE_HERMES_CAPTURE_PATH'] = capturedMessagePath;

      await expect(
        notifierModule.runOpsEventNotifier({
          env: {
            HERMES_BIN: fakeHermesPath,
            SCREEPS_OPS_NOTIFY_TARGET: 'telegram',
          },
          inputText: JSON.stringify(createHookPayload()),
        }),
      ).resolves.toEqual({ target: 'telegram' });

      const captured = JSON.parse(await readFile(capturedMessagePath, 'utf8')) as {
        readonly argv: string[];
        readonly inputText: string;
      };
      expect(captured.argv).toEqual(['send', '--to', 'telegram', '--file', '-', '--quiet']);
      expect(captured.inputText).toContain('Screeps critical: spawn_missing');
      expect(captured.inputText).not.toContain('secret-token');
    } finally {
      if (previousCapturePath === undefined) {
        delete process.env['FAKE_HERMES_CAPTURE_PATH'];
      } else {
        process.env['FAKE_HERMES_CAPTURE_PATH'] = previousCapturePath;
      }

      await rm(workspacePath, { force: true, recursive: true });
    }
  });

  it('reports hermes send failures', async () => {
    const notifierModule = await loadOpsEventNotifierModule();
    const workspacePath = await mkdtemp(join(tmpdir(), 'screeps-ops-notifier-failure-'));
    const fakeHermesPath = join(workspacePath, 'fake-hermes-fails.mjs');

    try {
      await writeFile(
        fakeHermesPath,
        ['#!/usr/bin/env node', "console.error('send failed');", 'process.exit(7);'].join('\n'),
        'utf8',
      );
      await chmod(fakeHermesPath, 0o755);

      await expect(
        notifierModule.runOpsEventNotifier({
          env: { HERMES_BIN: fakeHermesPath },
          inputText: JSON.stringify(createHookPayload()),
        }),
      ).rejects.toThrow('hermes send failed with exit code 7: send failed');
    } finally {
      await rm(workspacePath, { force: true, recursive: true });
    }
  });

  it('rejects malformed hook payload JSON', async () => {
    const notifierModule = await loadOpsEventNotifierModule();

    await expect(
      notifierModule.runOpsEventNotifier({
        inputText: '{bad json',
        sendMessage: () => {
          throw new Error('send should not run');
        },
      }),
    ).rejects.toThrow('Invalid ops notify hook payload JSON.');
  });
});

const createHookPayload = () => ({
  action: 'notify',
  decision: {
    actions: ['record', 'notify', 'wake_hermes'],
    dedupeKey: 'spawn_missing:shard1:W51N21',
    suppressed: false,
  },
  event: {
    id: 'spawn-missing-1',
    kind: 'spawn_missing',
    metrics: {
      token: 'secret-token',
    },
    room: 'W51N21',
    severity: 'critical',
    shard: 'shard1',
    summary: 'spawn missing',
    tick: 42,
  },
  observedAt: '2026-06-15T00:00:00.000Z',
});

const isOpsEventNotifierModule = (
  candidateModule: unknown,
): candidateModule is OpsEventNotifierModule =>
  typeof candidateModule === 'object' &&
  candidateModule !== null &&
  'formatOpsEventNotification' in candidateModule &&
  typeof candidateModule.formatOpsEventNotification === 'function' &&
  'runOpsEventNotifier' in candidateModule &&
  typeof candidateModule.runOpsEventNotifier === 'function';
