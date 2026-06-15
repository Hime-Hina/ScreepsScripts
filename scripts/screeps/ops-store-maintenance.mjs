import { readdir, readFile, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const CLAIM_STORE_FILE_PATTERN = /^[a-f0-9]{64}\.json$/u;
const EVENT_STORE_FILE_PATTERN = /^(?<date>\d{4}-\d{2}-\d{2})\.jsonl$/u;

export const DEFAULT_EVENT_STORE_RETENTION_DAYS = 14;
export const DEFAULT_CLAIM_STORE_RETENTION_DAYS = 2;

export const cleanupOpsDataStores = async ({
  claimRetentionDays = DEFAULT_CLAIM_STORE_RETENTION_DAYS,
  claimStorePath = null,
  clock = new Date(),
  eventRetentionDays = DEFAULT_EVENT_STORE_RETENTION_DAYS,
  eventStoreDirectory = null,
} = {}) => {
  const eventCleanup = await cleanupEventStoreDirectory({
    clock,
    eventRetentionDays,
    eventStoreDirectory,
  });
  const claimCleanup = await cleanupClaimStore({
    claimRetentionDays,
    claimStorePath,
    clock,
  });

  return {
    claimFilesRemoved: claimCleanup.filesRemoved,
    eventFilesRemoved: eventCleanup.filesRemoved,
  };
};

export const cleanupEventStoreDirectory = async ({
  clock = new Date(),
  eventRetentionDays = DEFAULT_EVENT_STORE_RETENTION_DAYS,
  eventStoreDirectory,
}) => {
  if (eventStoreDirectory === null) {
    return { filesRemoved: 0 };
  }

  const cutoffMs = clock.getTime() - eventRetentionDays * MS_PER_DAY;
  let filesRemoved = 0;

  for (const directoryEntry of await readDirectoryEntries(eventStoreDirectory)) {
    if (!directoryEntry.isFile()) {
      continue;
    }

    const fileDateMs = readEventStoreFileDateMs(directoryEntry.name);

    if (fileDateMs === null || fileDateMs >= cutoffMs) {
      continue;
    }

    await rm(join(eventStoreDirectory, directoryEntry.name), { force: true });
    filesRemoved += 1;
  }

  return { filesRemoved };
};

export const cleanupClaimStore = async ({
  claimRetentionDays = DEFAULT_CLAIM_STORE_RETENTION_DAYS,
  claimStorePath,
  clock = new Date(),
}) => {
  if (claimStorePath === null) {
    return { filesRemoved: 0 };
  }

  const cutoffMs = clock.getTime() - claimRetentionDays * MS_PER_DAY;
  let filesRemoved = 0;

  for (const directoryEntry of await readDirectoryEntries(claimStorePath)) {
    if (!directoryEntry.isFile() || !CLAIM_STORE_FILE_PATTERN.test(directoryEntry.name)) {
      continue;
    }

    const claimPath = join(claimStorePath, directoryEntry.name);
    const claimRecordMs = await readClaimRecordTimeMs(claimPath);

    if (claimRecordMs === null || claimRecordMs >= cutoffMs) {
      continue;
    }

    await rm(claimPath, { force: true });
    filesRemoved += 1;
  }

  return { filesRemoved };
};

const readDirectoryEntries = async (directoryPath) => {
  try {
    return await readdir(directoryPath, { withFileTypes: true });
  } catch (caughtError) {
    if (caughtError?.code === 'ENOENT') {
      return [];
    }

    throw caughtError;
  }
};

const readEventStoreFileDateMs = (fileName) => {
  const match = EVENT_STORE_FILE_PATTERN.exec(fileName);

  if (match?.groups?.date === undefined) {
    return null;
  }

  const fileDateMs = Date.parse(`${match.groups.date}T00:00:00.000Z`);

  if (Number.isNaN(fileDateMs)) {
    return null;
  }

  return fileDateMs;
};

const readClaimRecordTimeMs = async (claimPath) => {
  const claimedAtMs = await readClaimedAtMs(claimPath);

  if (claimedAtMs !== null) {
    return claimedAtMs;
  }

  try {
    return (await stat(claimPath)).mtimeMs;
  } catch (caughtError) {
    if (caughtError?.code === 'ENOENT') {
      return null;
    }

    throw caughtError;
  }
};

const readClaimedAtMs = async (claimPath) => {
  try {
    const claimRecord = JSON.parse(await readFile(claimPath, 'utf8'));
    const claimedAt = claimRecord?.claimedAt;

    if (typeof claimedAt !== 'string') {
      return null;
    }

    const claimedAtMs = Date.parse(claimedAt);

    if (Number.isNaN(claimedAtMs)) {
      return null;
    }

    return claimedAtMs;
  } catch (caughtError) {
    if (caughtError?.code === 'ENOENT') {
      return null;
    }

    return null;
  }
};
