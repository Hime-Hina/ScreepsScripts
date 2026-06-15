#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

import { reportCommandFailure } from './command-failure.mjs';

const DEFAULT_NOTIFY_TARGET = 'telegram';
const DEFAULT_HERMES_COMMAND = 'hermes';

export const runOpsEventNotifier = async ({
  env = process.env,
  inputText,
  sendMessage = sendHermesMessage,
} = {}) => {
  const payload = parseHookPayload(inputText ?? (await readStandardInput()));
  const message = formatOpsEventNotification(payload);
  const target = env.SCREEPS_OPS_NOTIFY_TARGET ?? DEFAULT_NOTIFY_TARGET;
  const hermesCommand = env.HERMES_BIN ?? DEFAULT_HERMES_COMMAND;

  await sendMessage({ hermesCommand, message, target });

  return { target };
};

export const formatOpsEventNotification = (payload) => {
  const opsEvent = payload.event ?? {};
  const decision = payload.decision ?? {};
  const roomText = typeof opsEvent.room === 'string' ? ` room=${opsEvent.room}` : '';
  const tickText = Number.isFinite(opsEvent.tick) ? ` tick=${opsEvent.tick}` : '';
  const shardText = typeof opsEvent.shard === 'string' ? ` shard=${opsEvent.shard}` : '';
  const severity = readText(opsEvent.severity, 'unknown');
  const kind = readText(opsEvent.kind, 'unknown');
  const summary = readText(opsEvent.summary, '(no summary)');
  const dedupeKey = readText(decision.dedupeKey, '-');
  const actions = Array.isArray(decision.actions) ? decision.actions.join(',') : '-';
  const observedAt = readText(payload.observedAt, '-');

  return [
    `Screeps ${severity}: ${kind}`,
    `${summary}`,
    `scope:${shardText}${roomText}${tickText}`,
    `dedupeKey=${dedupeKey}`,
    `actions=${actions}`,
    `observedAt=${observedAt}`,
  ].join('\n');
};

const parseHookPayload = (inputText) => {
  try {
    return JSON.parse(inputText);
  } catch {
    throw new Error('Invalid ops notify hook payload JSON.');
  }
};

const readText = (candidateValue, fallbackValue) =>
  typeof candidateValue === 'string' && candidateValue.trim() !== ''
    ? candidateValue
    : fallbackValue;

const readStandardInput = async () => {
  let inputText = '';

  for await (const inputChunk of process.stdin) {
    inputText += inputChunk;
  }

  return inputText;
};

const sendHermesMessage = ({ hermesCommand, message, target }) =>
  new Promise((resolve, reject) => {
    const sendProcess = spawn(hermesCommand, ['send', '--to', target, '--file', '-', '--quiet'], {
      stdio: ['pipe', 'ignore', 'pipe'],
    });
    let errorText = '';

    sendProcess.stderr.on('data', (errorChunk) => {
      errorText += errorChunk;
    });
    sendProcess.on('error', reject);
    sendProcess.on('close', (exitCode) => {
      if (exitCode === 0) {
        resolve();
        return;
      }

      reject(new Error(`hermes send failed with exit code ${exitCode}: ${errorText.trim()}`));
    });
    sendProcess.stdin.end(`${message}\n`, 'utf8');
  });

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await runOpsEventNotifier();
  } catch (caughtError) {
    reportCommandFailure('ops:event-notify', caughtError);
  }
}
