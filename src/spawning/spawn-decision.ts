export type SpawnBodyPart = 'work' | 'carry' | 'move';

export interface SpawnSnapshot {
  readonly availableEnergy: number;
  readonly energyCapacity: number;
  readonly isSpawning: boolean;
  readonly name: string;
}

export interface SpawningWorldSnapshot {
  readonly gameTime: number;
  readonly spawns: readonly SpawnSnapshot[];
  readonly workerCreepCount: number;
}

export interface SpawnDecision {
  readonly body: readonly SpawnBodyPart[];
  readonly creepName: string;
  readonly spawnName: string;
}

const INITIAL_WORKER_BODY = ['work', 'carry', 'move'] as const satisfies readonly SpawnBodyPart[];
const INITIAL_WORKER_COST = 200;
const BOOTSTRAP_WORKER_COUNT = 3;

export const planBootstrapWorkerSpawn = (
  spawningWorld: SpawningWorldSnapshot,
): SpawnDecision | null => {
  if (spawningWorld.workerCreepCount >= BOOTSTRAP_WORKER_COUNT) {
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
    creepName: `${readySpawn.name}-worker-${spawningWorld.gameTime}`,
    spawnName: readySpawn.name,
  };
};
