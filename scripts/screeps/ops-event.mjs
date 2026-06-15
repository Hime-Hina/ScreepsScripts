import { appendFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

export const OPS_EVENT_PREFIX = '[HERMES_EVENT]';
export const OPS_EVENT_SCHEMA = 'screeps.ops.event.v1';

const OPS_EVENT_SEVERITIES = new Set(['info', 'warning', 'actionable', 'critical']);
const SECRET_KEY_PATTERN = /token|password|cookie|secret|authorization/i;

export class ScreepsOpsEventError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ScreepsOpsEventError';
  }
}

export const parseOpsEventLine = (consoleLine) => {
  if (typeof consoleLine !== 'string') {
    throw new ScreepsOpsEventError('Console line must be a string.');
  }

  if (!consoleLine.startsWith(OPS_EVENT_PREFIX)) {
    return null;
  }

  const eventText = decodeScreepsConsoleEntities(consoleLine.slice(OPS_EVENT_PREFIX.length).trim());
  let rawEvent;

  try {
    rawEvent = JSON.parse(eventText);
  } catch {
    throw new ScreepsOpsEventError('Ops event line contains invalid JSON.');
  }

  return decodeOpsEvent(rawEvent);
};

export const decodeOpsEvent = (rawEvent) => {
  if (!isPlainObject(rawEvent)) {
    throw new ScreepsOpsEventError('Ops event must be a JSON object.');
  }

  const schema = readRequiredString(rawEvent, 'schema');

  if (schema !== OPS_EVENT_SCHEMA) {
    throw new ScreepsOpsEventError(`Unsupported ops event schema "${schema}".`);
  }

  const severity = readRequiredString(rawEvent, 'severity');

  if (!OPS_EVENT_SEVERITIES.has(severity)) {
    throw new ScreepsOpsEventError(`Unsupported ops event severity "${severity}".`);
  }

  const event = {
    id: readRequiredString(rawEvent, 'id'),
    kind: readRequiredString(rawEvent, 'kind'),
    schema,
    severity,
    shard: readRequiredString(rawEvent, 'shard'),
    summary: readRequiredString(rawEvent, 'summary'),
    tick: readRequiredNonNegativeInteger(rawEvent, 'tick'),
  };

  if ('dedupeKey' in rawEvent) {
    event.dedupeKey = readOptionalString(rawEvent, 'dedupeKey');
  }

  if ('room' in rawEvent) {
    event.room = readOptionalString(rawEvent, 'room');
  }

  if ('metrics' in rawEvent) {
    event.metrics = redactSensitiveRecord(readOptionalObject(rawEvent, 'metrics'));
  }

  if ('recommendedAction' in rawEvent) {
    event.recommendedAction = readOptionalString(rawEvent, 'recommendedAction');
  }

  if ('cooldownTicks' in rawEvent) {
    event.cooldownTicks = readRequiredNonNegativeInteger(rawEvent, 'cooldownTicks');
  }

  return event;
};

const decodeScreepsConsoleEntities = (eventText) =>
  eventText
    .replaceAll('&#x22;', '"')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&#x27;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&');

export const appendOpsEventToJsonl = async (storePath, opsEvent) => {
  await mkdir(dirname(storePath), { recursive: true });
  await appendFile(storePath, `${JSON.stringify(opsEvent)}\n`, 'utf8');
};

export const createOpsEventPolicyState = () => ({
  lastActiveTickByKey: new Map(),
});

export const decideOpsEventActions = (opsEvent, policyState = createOpsEventPolicyState()) => {
  const activeActions = readActiveActions(opsEvent);

  if (activeActions.length === 0) {
    return {
      actions: ['record'],
      dedupeKey: readOpsEventDedupeKey(opsEvent),
      suppressed: false,
    };
  }

  const dedupeKey = readOpsEventDedupeKey(opsEvent);
  const cooldownTicks = opsEvent.cooldownTicks ?? readDefaultCooldownTicks(opsEvent.severity);
  const previousActiveTick = policyState.lastActiveTickByKey.get(dedupeKey);

  if (
    previousActiveTick !== undefined &&
    opsEvent.tick >= previousActiveTick &&
    opsEvent.tick - previousActiveTick < cooldownTicks
  ) {
    return {
      actions: ['record'],
      dedupeKey,
      suppressed: true,
    };
  }

  policyState.lastActiveTickByKey.set(dedupeKey, opsEvent.tick);

  return {
    actions: ['record', ...activeActions],
    dedupeKey,
    suppressed: false,
  };
};

const readActiveActions = (opsEvent) => {
  if (opsEvent.severity === 'critical') {
    return ['notify', 'wake_hermes'];
  }

  if (opsEvent.severity === 'actionable') {
    return ['wake_hermes'];
  }

  return [];
};

const readDefaultCooldownTicks = (severity) => {
  if (severity === 'critical') {
    return 50;
  }

  return 300;
};

export const readOpsEventDedupeKey = (opsEvent) =>
  opsEvent.dedupeKey ??
  [opsEvent.severity, opsEvent.kind, opsEvent.shard, opsEvent.room ?? '-'].join(':');

const redactSensitiveValue = (recordKey, recordEntry) => {
  if (SECRET_KEY_PATTERN.test(recordKey)) {
    return '[redacted]';
  }

  if (Array.isArray(recordEntry)) {
    return recordEntry.map((arrayEntry) => redactSensitiveValue('', arrayEntry));
  }

  if (isPlainObject(recordEntry)) {
    return redactSensitiveRecord(recordEntry);
  }

  return recordEntry;
};

const redactSensitiveRecord = (recordValue) => {
  const redactedRecord = {};

  for (const [recordKey, recordEntry] of Object.entries(recordValue)) {
    redactedRecord[recordKey] = redactSensitiveValue(recordKey, recordEntry);
  }

  return redactedRecord;
};

const readRequiredString = (rawEvent, fieldName) => {
  const fieldValue = rawEvent[fieldName];

  if (typeof fieldValue !== 'string' || fieldValue.trim() === '') {
    throw new ScreepsOpsEventError(`Ops event field "${fieldName}" must be a non-empty string.`);
  }

  return fieldValue.trim();
};

const readOptionalString = (rawEvent, fieldName) => {
  const fieldValue = rawEvent[fieldName];

  if (typeof fieldValue !== 'string' || fieldValue.trim() === '') {
    throw new ScreepsOpsEventError(`Ops event field "${fieldName}" must be a non-empty string.`);
  }

  return fieldValue.trim();
};

const readRequiredNonNegativeInteger = (rawEvent, fieldName) => {
  const fieldValue = rawEvent[fieldName];

  if (!Number.isInteger(fieldValue) || fieldValue < 0) {
    throw new ScreepsOpsEventError(
      `Ops event field "${fieldName}" must be a non-negative integer.`,
    );
  }

  return fieldValue;
};

const readOptionalObject = (rawEvent, fieldName) => {
  const fieldValue = rawEvent[fieldName];

  if (!isPlainObject(fieldValue)) {
    throw new ScreepsOpsEventError(`Ops event field "${fieldName}" must be an object.`);
  }

  return fieldValue;
};

const isPlainObject = (candidateValue) =>
  typeof candidateValue === 'object' && candidateValue !== null && !Array.isArray(candidateValue);
