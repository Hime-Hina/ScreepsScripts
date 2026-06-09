export type SpawnBodyPart = 'work' | 'carry' | 'move';

export interface SpawnSnapshot {
  readonly availableEnergy: number;
  readonly isSpawning: boolean;
  readonly name: string;
}

export interface SpawningWorldSnapshot {
  readonly creepCount: number;
  readonly spawns: readonly SpawnSnapshot[];
}

export interface SpawnDecision {
  readonly body: readonly SpawnBodyPart[];
  readonly creepName: string;
  readonly spawnName: string;
}

const INITIAL_WORKER_BODY = ['work', 'carry', 'move'] as const satisfies readonly SpawnBodyPart[];
const INITIAL_WORKER_COST = 200;
const INITIAL_WORKER_NAME = 'Worker1';

export const planInitialWorkerSpawn = (
  spawningWorld: SpawningWorldSnapshot,
): SpawnDecision | null => {
  if (spawningWorld.creepCount > 0) {
    return null;
  }

  const readySpawn = spawningWorld.spawns.find(
    (spawnSnapshot) =>
      !spawnSnapshot.isSpawning && spawnSnapshot.availableEnergy >= INITIAL_WORKER_COST,
  );

  if (readySpawn === undefined) {
    return null;
  }

  return {
    body: INITIAL_WORKER_BODY,
    creepName: INITIAL_WORKER_NAME,
    spawnName: readySpawn.name,
  };
};
