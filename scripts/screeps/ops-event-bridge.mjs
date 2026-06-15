#!/usr/bin/env node

import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

import { reportCommandFailure } from './command-failure.mjs';
import { readMainScreepsConfig, readMainScreepsConfigFrom } from './config.mjs';
import {
  appendOpsEventToJsonl,
  createOpsEventPolicyState,
  decideOpsEventActions,
  parseOpsEventLine,
} from './ops-event.mjs';
import { readDefaultEventStorePath } from './ops-event-bridge-dry-run.mjs';
import { readLiveAccountIdentity } from './screeps-api.mjs';
import { openScreepsConsoleWebSocket } from './screeps-console-websocket.mjs';

const DEFAULT_RECONNECT_DELAY_MS = 5000;
const MAX_RETAINED_DECISIONS = 100;

export class OpsEventBridgeLiveError extends Error {
  constructor(message) {
    super(message);
    this.name = 'OpsEventBridgeLiveError';
  }
}

export const runOpsEventBridgeLive = async (commandArguments = process.argv.slice(2)) => {
  const liveRequest = parseLiveBridgeArguments(commandArguments);
  const screepsConfig = await readMainScreepsConfig();

  return runOpsEventBridgeLiveWithConfig(screepsConfig, liveRequest);
};

export const runOpsEventBridgeLiveFrom = async (
  workspacePath,
  commandArguments,
  dependencies = {},
) => {
  const liveRequest = parseLiveBridgeArguments(commandArguments);
  const screepsConfig = await readMainScreepsConfigFrom(workspacePath);

  return runOpsEventBridgeLiveWithConfig(screepsConfig, liveRequest, dependencies);
};

export const parseLiveBridgeArguments = (commandArguments) => {
  let storePath = null;
  let maxEvents = null;
  let maxConsoleUpdates = null;
  let timeoutMs = null;
  let maxReconnects = null;
  let reconnectDelayMs = DEFAULT_RECONNECT_DELAY_MS;
  let shardName = null;

  for (let argumentIndex = 0; argumentIndex < commandArguments.length; argumentIndex += 1) {
    const commandArgument = commandArguments[argumentIndex];

    if (commandArgument === '--') {
      continue;
    }

    if (commandArgument === '--dry-run-file' || commandArgument === '--dry-run-line') {
      throw new OpsEventBridgeLiveError(
        'Use ops-event-bridge-dry-run.mjs for dry-run input; live bridge reads Screeps console websocket output.',
      );
    }

    if (commandArgument === '--store') {
      storePath = readFollowingArgument(commandArguments, argumentIndex, '--store');
      argumentIndex += 1;
      continue;
    }

    if (commandArgument === '--store-default') {
      storePath = readDefaultEventStorePath();
      continue;
    }

    if (commandArgument === '--max-events') {
      maxEvents = readPositiveIntegerArgument(commandArguments, argumentIndex, '--max-events');
      argumentIndex += 1;
      continue;
    }

    if (commandArgument === '--max-console-updates') {
      maxConsoleUpdates = readPositiveIntegerArgument(
        commandArguments,
        argumentIndex,
        '--max-console-updates',
      );
      argumentIndex += 1;
      continue;
    }

    if (commandArgument === '--timeout-ms') {
      timeoutMs = readPositiveIntegerArgument(commandArguments, argumentIndex, '--timeout-ms');
      argumentIndex += 1;
      continue;
    }

    if (commandArgument === '--max-reconnects') {
      maxReconnects = readNonNegativeIntegerArgument(
        commandArguments,
        argumentIndex,
        '--max-reconnects',
      );
      argumentIndex += 1;
      continue;
    }

    if (commandArgument === '--reconnect-delay-ms') {
      reconnectDelayMs = readNonNegativeIntegerArgument(
        commandArguments,
        argumentIndex,
        '--reconnect-delay-ms',
      );
      argumentIndex += 1;
      continue;
    }

    if (commandArgument === '--shard') {
      shardName = readFollowingArgument(commandArguments, argumentIndex, '--shard');
      argumentIndex += 1;
      continue;
    }

    throw new OpsEventBridgeLiveError(`Unknown argument "${commandArgument}".`);
  }

  return {
    maxConsoleUpdates,
    maxEvents,
    maxReconnects,
    reconnectDelayMs,
    shardName,
    storePath,
    timeoutMs,
  };
};

const runOpsEventBridgeLiveWithConfig = async (
  screepsConfig,
  liveRequest,
  { WebSocketConstructor = globalThis.WebSocket } = {},
) => {
  const accountIdentity = await readLiveAccountIdentity(screepsConfig);
  const policyState = createOpsEventPolicyState();
  const decisions = [];
  const bridgeState = { consoleUpdateCount: 0, eventCount: 0 };
  const startedAt = Date.now();
  let reconnectCount = 0;

  console.log(
    [
      '[ops:event-bridge] live=started',
      `branch=${screepsConfig.branch}`,
      `store=${liveRequest.storePath ?? '-'}`,
      `shard=${liveRequest.shardName ?? '*'}`,
      `maxEvents=${liveRequest.maxEvents ?? 'unbounded'}`,
      `maxConsoleUpdates=${liveRequest.maxConsoleUpdates ?? 'unbounded'}`,
      `timeoutMs=${liveRequest.timeoutMs ?? 'unbounded'}`,
    ].join(' '),
  );

  while (!hasReachedBridgeLimit(bridgeState, liveRequest)) {
    assertNotTimedOut(startedAt, liveRequest.timeoutMs);

    const disconnected = await runSingleLiveBridgeConnection({
      accountId: accountIdentity.accountId,
      bridgeState,
      decisions,
      liveRequest,
      policyState,
      screepsConfig,
      startedAt,
      WebSocketConstructor,
    });

    if (!disconnected || hasReachedBridgeLimit(bridgeState, liveRequest)) {
      break;
    }

    if (liveRequest.maxReconnects !== null && reconnectCount >= liveRequest.maxReconnects) {
      throw new OpsEventBridgeLiveError('Screeps console websocket reconnect limit reached.');
    }

    reconnectCount += 1;
    console.log(`[ops:event-bridge] reconnect=${reconnectCount}`);

    if (liveRequest.reconnectDelayMs > 0) {
      await sleep(liveRequest.reconnectDelayMs);
    }
  }

  console.log(
    `[ops:event-bridge] liveEvents=${bridgeState.eventCount} consoleUpdates=${bridgeState.consoleUpdateCount} retainedDecisions=${decisions.length}`,
  );

  return decisions;
};

const runSingleLiveBridgeConnection = ({
  accountId,
  bridgeState,
  decisions,
  liveRequest,
  policyState,
  screepsConfig,
  startedAt,
  WebSocketConstructor,
}) =>
  new Promise((resolve, reject) => {
    let connection;
    let processingConsoleUpdates = Promise.resolve();
    let settled = false;
    let timeoutHandle = null;

    const settle = (settleFunction, value) => {
      if (settled) {
        return;
      }

      settled = true;

      if (timeoutHandle !== null) {
        clearTimeout(timeoutHandle);
      }

      connection?.close();
      settleFunction(value);
    };

    const rejectWithError = (caughtError) => {
      settle(reject, caughtError);
    };

    const resolveDisconnected = () => {
      settle(resolve, true);
    };

    const resolveComplete = () => {
      settle(resolve, false);
    };

    if (liveRequest.timeoutMs !== null) {
      const remainingTimeoutMs = liveRequest.timeoutMs - (Date.now() - startedAt);

      if (remainingTimeoutMs <= 0) {
        rejectWithError(new OpsEventBridgeLiveError('Timed out waiting for Screeps ops events.'));
        return;
      }

      timeoutHandle = setTimeout(() => {
        rejectWithError(new OpsEventBridgeLiveError('Timed out waiting for Screeps ops events.'));
      }, remainingTimeoutMs);
    }

    try {
      connection = openScreepsConsoleWebSocket({
        accountId,
        onConsoleUpdate: (consoleUpdate) => {
          processingConsoleUpdates = processingConsoleUpdates
            .then(() =>
              processConsoleUpdate({
                bridgeState,
                consoleUpdate,
                decisions,
                liveRequest,
                policyState,
              }),
            )
            .then(() => {
              if (hasReachedBridgeLimit(bridgeState, liveRequest)) {
                resolveComplete();
              }
            });
          void processingConsoleUpdates.catch(rejectWithError);
        },
        onDisconnect: resolveDisconnected,
        onError: rejectWithError,
        screepsConfig,
        WebSocketConstructor,
      });
    } catch (caughtError) {
      rejectWithError(caughtError);
    }
  });

const processConsoleUpdate = async ({
  bridgeState,
  consoleUpdate,
  decisions,
  liveRequest,
  policyState,
}) => {
  if (liveRequest.shardName !== null && consoleUpdate.shard !== liveRequest.shardName) {
    return;
  }

  bridgeState.consoleUpdateCount += 1;

  for (const consoleLine of consoleUpdate.lines) {
    if (hasReachedEventLimit(bridgeState, liveRequest.maxEvents)) {
      return;
    }

    let opsEvent;

    try {
      opsEvent = parseOpsEventLine(consoleLine);
    } catch (caughtError) {
      console.log(
        `[ops:event-bridge] parseError=${JSON.stringify({ message: readCaughtErrorMessage(caughtError) })}`,
      );
      continue;
    }

    if (opsEvent === null) {
      continue;
    }

    if (liveRequest.storePath !== null) {
      await appendOpsEventToJsonl(liveRequest.storePath, opsEvent);
    }

    const decision = decideOpsEventActions(opsEvent, policyState);
    const decisionSummary = {
      actions: decision.actions,
      dedupeKey: decision.dedupeKey,
      eventId: opsEvent.id,
      kind: opsEvent.kind,
      severity: opsEvent.severity,
      shard: opsEvent.shard,
      suppressed: decision.suppressed,
    };

    if (opsEvent.room !== undefined) {
      decisionSummary.room = opsEvent.room;
    }

    bridgeState.eventCount += 1;
    retainDecision(decisions, decisionSummary);
    console.log(`[ops:event-bridge] decision=${JSON.stringify(decisionSummary)}`);
  }
};

const retainDecision = (decisions, decisionSummary) => {
  decisions.push(decisionSummary);

  if (decisions.length > MAX_RETAINED_DECISIONS) {
    decisions.shift();
  }
};

const hasReachedBridgeLimit = (bridgeState, liveRequest) =>
  hasReachedEventLimit(bridgeState, liveRequest.maxEvents) ||
  (liveRequest.maxConsoleUpdates !== null &&
    bridgeState.consoleUpdateCount >= liveRequest.maxConsoleUpdates);

const hasReachedEventLimit = (bridgeState, maxEvents) =>
  maxEvents !== null && bridgeState.eventCount >= maxEvents;

const assertNotTimedOut = (startedAt, timeoutMs) => {
  if (timeoutMs !== null && Date.now() - startedAt >= timeoutMs) {
    throw new OpsEventBridgeLiveError('Timed out waiting for Screeps ops events.');
  }
};

const readPositiveIntegerArgument = (commandArguments, argumentIndex, argumentName) => {
  const parsedInteger = readIntegerArgument(commandArguments, argumentIndex, argumentName);

  if (parsedInteger <= 0) {
    throw new OpsEventBridgeLiveError(`${argumentName} must be greater than 0.`);
  }

  return parsedInteger;
};

const readNonNegativeIntegerArgument = (commandArguments, argumentIndex, argumentName) => {
  const parsedInteger = readIntegerArgument(commandArguments, argumentIndex, argumentName);

  if (parsedInteger < 0) {
    throw new OpsEventBridgeLiveError(`${argumentName} must be zero or greater.`);
  }

  return parsedInteger;
};

const readIntegerArgument = (commandArguments, argumentIndex, argumentName) => {
  const argumentValue = readFollowingArgument(commandArguments, argumentIndex, argumentName);
  const parsedInteger = Number(argumentValue);

  if (!Number.isInteger(parsedInteger)) {
    throw new OpsEventBridgeLiveError(`${argumentName} must be an integer.`);
  }

  return parsedInteger;
};

const readFollowingArgument = (commandArguments, argumentIndex, argumentName) => {
  const argumentValue = commandArguments[argumentIndex + 1];

  if (argumentValue === undefined || argumentValue.trim() === '') {
    throw new OpsEventBridgeLiveError(`Missing value after ${argumentName}.`);
  }

  return argumentValue;
};

const readCaughtErrorMessage = (caughtError) => {
  if (caughtError instanceof Error) {
    return caughtError.message;
  }

  return String(caughtError);
};

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await runOpsEventBridgeLive();
  } catch (caughtError) {
    reportCommandFailure('ops:event-bridge', caughtError);
  }
}
