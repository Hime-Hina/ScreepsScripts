import { describe, expect, it } from 'vitest';

import {
  SCREEPS_MEMORY_ROOT_KEY,
  SCREEPS_MEMORY_SCHEMA_VERSION,
  cleanStaleCreepMemory,
  createEmptyScreepsMemoryState,
  readScreepsMemoryState,
  writeScreepsMemoryState,
} from '../../../src/memory/screeps-memory';

describe('Screeps memory boundary', () => {
  it('decodes current memory from the project root', () => {
    const rawMemory = {
      [SCREEPS_MEMORY_ROOT_KEY]: {
        schemaVersion: SCREEPS_MEMORY_SCHEMA_VERSION,
      },
    };

    expect(readScreepsMemoryState(rawMemory)).toEqual({
      schemaVersion: SCREEPS_MEMORY_SCHEMA_VERSION,
    });
  });

  it('creates current empty state when the project root is missing', () => {
    expect(readScreepsMemoryState({})).toEqual(createEmptyScreepsMemoryState());
  });

  it('rejects future schema versions before exposing internal state', () => {
    const rawMemory = {
      [SCREEPS_MEMORY_ROOT_KEY]: {
        schemaVersion: SCREEPS_MEMORY_SCHEMA_VERSION + 1,
      },
    };

    expect(() => readScreepsMemoryState(rawMemory)).toThrow(
      'Screeps memory schema version 2 is newer than supported version 1.',
    );
  });

  it('rejects undocumented fields in the current schema', () => {
    const rawMemory = {
      [SCREEPS_MEMORY_ROOT_KEY]: {
        creeps: {},
        schemaVersion: SCREEPS_MEMORY_SCHEMA_VERSION,
      },
    };

    expect(() => readScreepsMemoryState(rawMemory)).toThrow(
      'Screeps memory root field "creeps" is not part of schema version 1.',
    );
  });

  it('writes current state back through the project root', () => {
    const rawMemory: Record<string, unknown> = {};

    writeScreepsMemoryState(rawMemory, createEmptyScreepsMemoryState());

    expect(rawMemory).toEqual({
      [SCREEPS_MEMORY_ROOT_KEY]: {
        schemaVersion: SCREEPS_MEMORY_SCHEMA_VERSION,
      },
    });
  });

  it('deletes stale top-level creep memory and keeps live creep memory', () => {
    const rawMemory = {
      creeps: {
        DeadWorker: {
          role: 'worker',
        },
        LiveWorker: {
          role: 'worker',
        },
      },
      [SCREEPS_MEMORY_ROOT_KEY]: {
        schemaVersion: SCREEPS_MEMORY_SCHEMA_VERSION,
      },
    };

    cleanStaleCreepMemory(rawMemory, new Set(['LiveWorker']));

    expect(rawMemory).toEqual({
      creeps: {
        LiveWorker: {
          role: 'worker',
        },
      },
      [SCREEPS_MEMORY_ROOT_KEY]: {
        schemaVersion: SCREEPS_MEMORY_SCHEMA_VERSION,
      },
    });
  });
});
