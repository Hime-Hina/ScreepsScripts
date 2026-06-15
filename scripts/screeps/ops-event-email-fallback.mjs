#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import { reportCommandFailure } from './command-failure.mjs';
import { applyOpsEventClaim, readDefaultClaimStorePath } from './ops-event-claims.mjs';
import {
  createOpsEventPolicyState,
  decideOpsEventActions,
  OPS_EVENT_PREFIX,
  parseOpsEventLine,
} from './ops-event.mjs';

export const runOpsEventEmailFallback = async (commandArguments = process.argv.slice(2)) => {
  const fallbackRequest = parseEmailFallbackArguments(commandArguments);
  const messageText = await readFallbackMessageText(fallbackRequest);
  const eventLine = readFirstOpsEventLine(messageText);

  if (eventLine === null) {
    const ignoredResult = {
      fallback: 'ignored',
      reason: 'no-structured-event',
    };
    printEmailFallbackResult(ignoredResult);

    return ignoredResult;
  }

  const opsEvent = parseOpsEventLine(eventLine);

  if (opsEvent === null) {
    const ignoredResult = {
      fallback: 'ignored',
      reason: 'no-structured-event',
    };
    printEmailFallbackResult(ignoredResult);

    return ignoredResult;
  }

  if (opsEvent.severity !== 'critical') {
    const ignoredResult = {
      eventId: opsEvent.id,
      fallback: 'ignored',
      kind: opsEvent.kind,
      reason: 'non-critical-event',
      severity: opsEvent.severity,
    };
    printEmailFallbackResult(ignoredResult);

    return ignoredResult;
  }

  const decision = await applyOpsEventClaim({
    claimStorePath: fallbackRequest.claimStorePath,
    decision: decideOpsEventActions(opsEvent, createOpsEventPolicyState()),
    opsEvent,
    source: 'email',
  });

  const result = {
    actions: decision.actions,
    claimOwner: decision.claim.owner?.source ?? null,
    claimPath: decision.claim.path,
    dedupeKey: decision.dedupeKey,
    duplicate: decision.claim.duplicate,
    eventId: opsEvent.id,
    fallback: decision.claim.duplicate ? 'duplicate' : 'claimed',
    kind: opsEvent.kind,
    severity: opsEvent.severity,
    suppressed: decision.suppressed,
  };

  printEmailFallbackResult(result);

  return result;
};

export const parseEmailFallbackArguments = (commandArguments) => {
  let claimStorePath = readDefaultClaimStorePath();
  let eventLine = null;
  let messageFile = null;

  for (let argumentIndex = 0; argumentIndex < commandArguments.length; argumentIndex += 1) {
    const commandArgument = commandArguments[argumentIndex];

    if (commandArgument === '--') {
      continue;
    }

    if (commandArgument === '--event-line') {
      eventLine = readFollowingArgument(commandArguments, argumentIndex, '--event-line');
      argumentIndex += 1;
      continue;
    }

    if (commandArgument === '--message-file') {
      messageFile = readFollowingArgument(commandArguments, argumentIndex, '--message-file');
      argumentIndex += 1;
      continue;
    }

    if (commandArgument === '--claim-store') {
      claimStorePath = readFollowingArgument(commandArguments, argumentIndex, '--claim-store');
      argumentIndex += 1;
      continue;
    }

    if (commandArgument === '--claim-store-default') {
      claimStorePath = readDefaultClaimStorePath();
      continue;
    }

    if (commandArgument === '--no-claim-store') {
      claimStorePath = null;
      continue;
    }

    throw new Error(`Unknown argument "${commandArgument}".`);
  }

  if (eventLine !== null && messageFile !== null) {
    throw new Error('Specify only one of --event-line or --message-file.');
  }

  return {
    claimStorePath,
    eventLine,
    messageFile,
  };
};

const readFallbackMessageText = async (fallbackRequest) => {
  if (fallbackRequest.eventLine !== null) {
    return fallbackRequest.eventLine;
  }

  if (fallbackRequest.messageFile !== null) {
    return readFile(fallbackRequest.messageFile, 'utf8');
  }

  return readStdinText();
};

const readFirstOpsEventLine = (messageText) =>
  messageText
    .split(/\r?\n/u)
    .map((messageLine) => messageLine.trim())
    .find((messageLine) => messageLine.startsWith(OPS_EVENT_PREFIX)) ?? null;

const readStdinText = async () => {
  let inputText = '';

  for await (const inputChunk of process.stdin) {
    inputText += inputChunk;
  }

  return inputText;
};

const printEmailFallbackResult = (result) => {
  console.log(`[ops:event-email-fallback] ${formatResult(result)}`);
};

const formatResult = (result) =>
  Object.entries(result)
    .filter(([, resultValue]) => resultValue !== null && resultValue !== undefined)
    .map(
      ([resultKey, resultValue]) =>
        `${resultKey}=${Array.isArray(resultValue) ? resultValue.join(',') : String(resultValue)}`,
    )
    .join(' ');

const readFollowingArgument = (commandArguments, argumentIndex, argumentName) => {
  const argumentValue = commandArguments[argumentIndex + 1];

  if (argumentValue === undefined || argumentValue.trim() === '') {
    throw new Error(`Missing value after ${argumentName}.`);
  }

  return argumentValue;
};

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await runOpsEventEmailFallback();
  } catch (caughtError) {
    reportCommandFailure('ops:event-email-fallback', caughtError);
  }
}
