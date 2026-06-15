import { spawn } from 'node:child_process';

const DEFAULT_HOOK_TIMEOUT_MS = 10000;
const NOTIFY_COMMAND_ENV = 'SCREEPS_OPS_NOTIFY_COMMAND';

export const runOpsEventHooks = async ({
  decision,
  env = process.env,
  executeCommand = executeHookCommand,
  observedAt = new Date(),
  opsEvent,
  source = 'screeps-ops-event-bridge',
}) => {
  const hookResults = [];

  if (decision.actions.includes('notify')) {
    hookResults.push(
      await runHookAction({
        action: 'notify',
        command: env[NOTIFY_COMMAND_ENV],
        decision,
        executeCommand,
        observedAt,
        opsEvent,
        source,
      }),
    );
  }

  return hookResults;
};

const runHookAction = async ({
  action,
  command,
  decision,
  executeCommand,
  observedAt,
  opsEvent,
  source,
}) => {
  if (typeof command !== 'string' || command.trim() === '') {
    return {
      action,
      reason: 'not-configured',
      status: 'skipped',
    };
  }

  const payload = createHookPayload({ action, decision, observedAt, opsEvent, source });
  const hookResult = await executeCommand({
    command,
    input: `${JSON.stringify(payload)}\n`,
    timeoutMs: DEFAULT_HOOK_TIMEOUT_MS,
  });

  if (hookResult.exitCode === 0 && hookResult.timedOut !== true) {
    return {
      action,
      status: 'delivered',
    };
  }

  return {
    action,
    ...(hookResult.exitCode === undefined ? {} : { exitCode: hookResult.exitCode }),
    ...(hookResult.timedOut === true ? { timedOut: true } : {}),
    status: 'failed',
  };
};

const createHookPayload = ({ action, decision, observedAt, opsEvent, source }) => ({
  action,
  decision: {
    actions: decision.actions,
    dedupeKey: decision.dedupeKey,
    suppressed: decision.suppressed,
  },
  event: opsEvent,
  observedAt: observedAt.toISOString(),
  source,
});

const executeHookCommand = ({ command, input, timeoutMs }) =>
  new Promise((resolve) => {
    let settled = false;
    let hookProcess;

    const timeoutHandle = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      hookProcess?.kill?.('SIGTERM');
      resolve({ timedOut: true });
    }, timeoutMs);

    const settle = (result) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeoutHandle);
      resolve(result);
    };

    try {
      hookProcess = spawn(command, {
        shell: true,
        stdio: ['pipe', 'ignore', 'ignore'],
      });
    } catch {
      settle({ exitCode: null });
      return;
    }

    hookProcess.on('error', () => settle({ exitCode: null }));
    hookProcess.on('close', (exitCode) => settle({ exitCode }));
    hookProcess.stdin.end(input, 'utf8');
  });
