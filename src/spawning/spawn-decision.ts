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
const EARLY_WORKER_BODIES = [
  ['work', 'carry', 'carry', 'move', 'move'],
  INITIAL_WORKER_BODY,
] as const satisfies readonly (readonly SpawnBodyPart[])[];
const SPAWN_BODY_PART_COSTS: Record<SpawnBodyPart, number> = {
  carry: 50,
  move: 50,
  work: 100,
};
const BOOTSTRAP_WORKER_COUNT = 3;

export const planBootstrapWorkerSpawn = (
  spawningWorld: SpawningWorldSnapshot,
): SpawnDecision | null => {
  if (spawningWorld.workerCreepCount >= BOOTSTRAP_WORKER_COUNT) {
    return null;
  }

  for (const readySpawn of spawningWorld.spawns) {
    if (readySpawn.isSpawning) {
      continue;
    }

    const workerBody = selectEarlyWorkerBody(readySpawn);

    if (workerBody === null) {
      continue;
    }

    return {
      body: workerBody,
      creepName: `${readySpawn.name}-worker-${spawningWorld.gameTime}`,
      spawnName: readySpawn.name,
    };
  }

  return null;
};

const selectEarlyWorkerBody = (spawnSnapshot: SpawnSnapshot): readonly SpawnBodyPart[] | null => {
  for (const workerBody of EARLY_WORKER_BODIES) {
    const workerBodyCost = calculateSpawnBodyCost(workerBody);

    if (
      spawnSnapshot.energyCapacity >= workerBodyCost &&
      spawnSnapshot.availableEnergy >= workerBodyCost
    ) {
      return workerBody;
    }
  }

  return null;
};

const calculateSpawnBodyCost = (spawnBody: readonly SpawnBodyPart[]): number =>
  spawnBody.reduce(
    (totalSpawnBodyCost, spawnBodyPart) =>
      totalSpawnBodyCost + SPAWN_BODY_PART_COSTS[spawnBodyPart],
    0,
  );
