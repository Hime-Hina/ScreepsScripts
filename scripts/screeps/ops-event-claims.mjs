import { createHash } from 'node:crypto';
import { mkdir, open, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { readOpsEventDedupeKey } from './ops-event.mjs';

export const DEFAULT_CLAIM_STORE_PATH = '.screeps/ops-claims';

export const readDefaultClaimStorePath = () => DEFAULT_CLAIM_STORE_PATH;

export const claimOpsEvent = async ({
  actions,
  claimStorePath = DEFAULT_CLAIM_STORE_PATH,
  clock = new Date(),
  opsEvent,
  source,
}) => {
  if (!hasActiveActions(actions)) {
    return {
      claimed: false,
      duplicate: false,
      path: null,
      reason: 'no-active-actions',
    };
  }

  const dedupeKey = readOpsEventDedupeKey(opsEvent);
  const claimPath = join(claimStorePath, `${hashDedupeKey(dedupeKey)}.json`);
  const claimRecord = {
    actions,
    claimedAt: clock.toISOString(),
    dedupeKey,
    eventId: opsEvent.id,
    kind: opsEvent.kind,
    room: opsEvent.room ?? null,
    severity: opsEvent.severity,
    shard: opsEvent.shard,
    source,
    tick: opsEvent.tick,
  };

  await mkdir(claimStorePath, { recursive: true });

  let claimFile;

  try {
    claimFile = await open(claimPath, 'wx');
    await claimFile.writeFile(`${JSON.stringify(claimRecord)}\n`, 'utf8');

    return {
      claimed: true,
      duplicate: false,
      owner: claimRecord,
      path: claimPath,
    };
  } catch (caughtError) {
    if (caughtError?.code !== 'EEXIST') {
      throw caughtError;
    }

    return {
      claimed: false,
      duplicate: true,
      owner: await readClaimRecord(claimPath),
      path: claimPath,
      reason: 'already-claimed',
    };
  } finally {
    await claimFile?.close();
  }
};

export const applyOpsEventClaim = async ({ claimStorePath, clock, decision, opsEvent, source }) => {
  if (decision.suppressed || !hasActiveActions(decision.actions) || claimStorePath === null) {
    return {
      ...decision,
      claim: {
        claimed: false,
        duplicate: false,
        path: null,
        reason: decision.suppressed ? 'cooldown-suppressed' : 'inactive-or-disabled',
      },
    };
  }

  const claim = await claimOpsEvent({
    actions: decision.actions,
    claimStorePath,
    clock,
    opsEvent,
    source,
  });

  if (!claim.duplicate) {
    return {
      ...decision,
      claim,
    };
  }

  return {
    ...decision,
    actions: ['record'],
    claim,
    suppressed: true,
  };
};

export const hasActiveActions = (actions) => actions.some((action) => action !== 'record');

const readClaimRecord = async (claimPath) => {
  try {
    return JSON.parse(await readFile(claimPath, 'utf8'));
  } catch {
    return {
      readError: true,
    };
  }
};

const hashDedupeKey = (dedupeKey) => createHash('sha256').update(dedupeKey).digest('hex');
