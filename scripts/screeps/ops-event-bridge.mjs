#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import { reportCommandFailure } from './command-failure.mjs';
import {
  appendOpsEventToJsonl,
  createOpsEventPolicyState,
  decideOpsEventActions,
  parseOpsEventLine,
} from './ops-event.mjs';

const DEFAULT_EVENT_STORE_PATH = '.screeps/events/live.jsonl';

export const runOpsEventBridgeDryRun = async (commandArguments = process.argv.slice(2)) => {
  const dryRunRequest = parseDryRunArguments(commandArguments);
  const policyState = createOpsEventPolicyState();
  const inputLines = await readDryRunLines(dryRunRequest);
  const decisions = [];

  for (const inputLine of inputLines) {
    const opsEvent = parseOpsEventLine(inputLine);

    if (opsEvent === null) {
      continue;
    }

    if (dryRunRequest.storePath !== null) {
      await appendOpsEventToJsonl(dryRunRequest.storePath, opsEvent);
    }

    const decision = decideOpsEventActions(opsEvent, policyState);
    decisions.push({
      actions: decision.actions,
      dedupeKey: decision.dedupeKey,
      eventId: opsEvent.id,
      kind: opsEvent.kind,
      severity: opsEvent.severity,
      suppressed: decision.suppressed,
    });
  }

  console.log(`[ops:event-bridge] dryRunEvents=${decisions.length}`);

  for (const decision of decisions) {
    console.log(`[ops:event-bridge] decision=${JSON.stringify(decision)}`);
  }

  return decisions;
};

export const parseDryRunArguments = (commandArguments) => {
  let inputFile = null;
  let inputLine = null;
  let storePath = null;

  for (let argumentIndex = 0; argumentIndex < commandArguments.length; argumentIndex += 1) {
    const commandArgument = commandArguments[argumentIndex];

    if (commandArgument === '--') {
      continue;
    }

    if (commandArgument === '--dry-run-line') {
      inputLine = readFollowingArgument(commandArguments, argumentIndex, '--dry-run-line');
      argumentIndex += 1;
      continue;
    }

    if (commandArgument === '--dry-run-file') {
      inputFile = readFollowingArgument(commandArguments, argumentIndex, '--dry-run-file');
      argumentIndex += 1;
      continue;
    }

    if (commandArgument === '--store') {
      storePath = readFollowingArgument(commandArguments, argumentIndex, '--store');
      argumentIndex += 1;
      continue;
    }

    if (commandArgument === '--store-default') {
      storePath = DEFAULT_EVENT_STORE_PATH;
      continue;
    }

    throw new Error(`Unknown argument "${commandArgument}".`);
  }

  if ((inputLine === null && inputFile === null) || (inputLine !== null && inputFile !== null)) {
    throw new Error('Specify exactly one of --dry-run-line or --dry-run-file.');
  }

  return {
    inputFile,
    inputLine,
    storePath,
  };
};

const readDryRunLines = async (dryRunRequest) => {
  if (dryRunRequest.inputLine !== null) {
    return [dryRunRequest.inputLine];
  }

  const inputText = await readFile(dryRunRequest.inputFile, 'utf8');

  return inputText.split(/\r?\n/).filter((inputLine) => inputLine.trim() !== '');
};

const readFollowingArgument = (commandArguments, argumentIndex, argumentName) => {
  const argumentValue = commandArguments[argumentIndex + 1];

  if (argumentValue === undefined || argumentValue.trim() === '') {
    throw new Error(`Missing value after ${argumentName}.`);
  }

  return argumentValue;
};

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await runOpsEventBridgeDryRun();
  } catch (caughtError) {
    reportCommandFailure('ops:event-bridge', caughtError);
  }
}
