export const SCREEPS_MEMORY_ROOT_KEY = 'screepsScripts';
export const SCREEPS_MEMORY_SCHEMA_VERSION = 1;

export interface ScreepsMemoryState {
  readonly schemaVersion: typeof SCREEPS_MEMORY_SCHEMA_VERSION;
}

export class ScreepsMemoryError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'ScreepsMemoryError';
  }
}

export const createEmptyScreepsMemoryState = (): ScreepsMemoryState => ({
  schemaVersion: SCREEPS_MEMORY_SCHEMA_VERSION,
});

export const readScreepsMemoryState = (rawMemory: unknown): ScreepsMemoryState => {
  const rawMemoryRecord = readMemoryRecord(rawMemory);
  const rawProjectMemory = rawMemoryRecord[SCREEPS_MEMORY_ROOT_KEY];

  if (rawProjectMemory === undefined) {
    return createEmptyScreepsMemoryState();
  }

  const projectMemoryRecord = readProjectMemoryRecord(rawProjectMemory);
  const schemaVersion = readSchemaVersion(projectMemoryRecord);

  enforceCurrentSchemaVersion(schemaVersion);
  enforceCurrentProjectMemoryFields(projectMemoryRecord);

  return createEmptyScreepsMemoryState();
};

export const writeScreepsMemoryState = (
  rawMemory: unknown,
  memoryState: ScreepsMemoryState,
): void => {
  const rawMemoryRecord = readMemoryRecord(rawMemory);

  rawMemoryRecord[SCREEPS_MEMORY_ROOT_KEY] = {
    schemaVersion: memoryState.schemaVersion,
  };
};

const readMemoryRecord = (rawMemory: unknown): Record<string, unknown> => {
  if (!isPlainObject(rawMemory)) {
    throw new ScreepsMemoryError('Screeps Memory must be an object.');
  }

  return rawMemory;
};

const readProjectMemoryRecord = (rawProjectMemory: unknown): Record<string, unknown> => {
  if (!isPlainObject(rawProjectMemory)) {
    throw new ScreepsMemoryError('Screeps memory root must be an object.');
  }

  return rawProjectMemory;
};

const readSchemaVersion = (projectMemoryRecord: Record<string, unknown>) => {
  const schemaVersion = projectMemoryRecord['schemaVersion'];

  if (typeof schemaVersion !== 'number' || !Number.isInteger(schemaVersion)) {
    throw new ScreepsMemoryError('Screeps memory root schemaVersion must be an integer.');
  }

  return schemaVersion;
};

const enforceCurrentSchemaVersion = (schemaVersion: number) => {
  if (schemaVersion > SCREEPS_MEMORY_SCHEMA_VERSION) {
    throw new ScreepsMemoryError(
      `Screeps memory schema version ${schemaVersion} is newer than supported version ${SCREEPS_MEMORY_SCHEMA_VERSION}.`,
    );
  }

  if (schemaVersion < SCREEPS_MEMORY_SCHEMA_VERSION) {
    throw new ScreepsMemoryError(
      `Screeps memory schema version ${schemaVersion} is not supported.`,
    );
  }
};

const enforceCurrentProjectMemoryFields = (projectMemoryRecord: Record<string, unknown>) => {
  for (const projectMemoryFieldName of Object.keys(projectMemoryRecord)) {
    if (projectMemoryFieldName !== 'schemaVersion') {
      throw new ScreepsMemoryError(
        `Screeps memory root field "${projectMemoryFieldName}" is not part of schema version ${SCREEPS_MEMORY_SCHEMA_VERSION}.`,
      );
    }
  }
};

const isPlainObject = (candidateValue: unknown): candidateValue is Record<string, unknown> =>
  typeof candidateValue === 'object' && candidateValue !== null && !Array.isArray(candidateValue);
