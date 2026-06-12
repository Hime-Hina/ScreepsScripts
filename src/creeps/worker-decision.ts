export interface WorkerCreepSnapshot {
  readonly energy: number;
  readonly freeCapacity: number;
  readonly name: string;
  readonly roomName: string;
}

export interface WorkerSpawnSnapshot {
  readonly availableEnergy: number;
  readonly energyCapacity: number;
  readonly name: string;
  readonly roomName: string;
}

export interface WorkerSourceSnapshot {
  readonly id: string;
  readonly roomName: string;
}

export interface WorkerControllerSnapshot {
  readonly id: string;
  readonly roomName: string;
}

export interface WorkerWorldSnapshot {
  readonly controllers: readonly WorkerControllerSnapshot[];
  readonly creeps: readonly WorkerCreepSnapshot[];
  readonly sources: readonly WorkerSourceSnapshot[];
  readonly spawns: readonly WorkerSpawnSnapshot[];
}

export type WorkerActionDecision =
  | HarvestSourceDecision
  | RefillSpawnDecision
  | UpgradeControllerDecision;

export interface HarvestSourceDecision {
  readonly creepName: string;
  readonly sourceId: string;
  readonly type: 'harvestSource';
}

export interface RefillSpawnDecision {
  readonly creepName: string;
  readonly spawnName: string;
  readonly type: 'refillSpawn';
}

export interface UpgradeControllerDecision {
  readonly controllerId: string;
  readonly creepName: string;
  readonly type: 'upgradeController';
}

export const planBootstrapWorkerActions = (
  workerWorld: WorkerWorldSnapshot,
): readonly WorkerActionDecision[] =>
  workerWorld.creeps
    .map((workerCreep) => planBootstrapWorkerAction(workerWorld, workerCreep))
    .filter((workerDecision): workerDecision is WorkerActionDecision => workerDecision !== null);

const planBootstrapWorkerAction = (
  workerWorld: WorkerWorldSnapshot,
  workerCreep: WorkerCreepSnapshot,
): WorkerActionDecision | null => {
  if (workerCreep.freeCapacity > 0) {
    const roomSource = workerWorld.sources.find(
      (sourceSnapshot) => sourceSnapshot.roomName === workerCreep.roomName,
    );

    if (roomSource === undefined) {
      return null;
    }

    return {
      creepName: workerCreep.name,
      sourceId: roomSource.id,
      type: 'harvestSource',
    };
  }

  if (workerCreep.energy <= 0) {
    return null;
  }

  const depletedSpawn = workerWorld.spawns.find(
    (spawnSnapshot) =>
      spawnSnapshot.roomName === workerCreep.roomName &&
      spawnSnapshot.availableEnergy < spawnSnapshot.energyCapacity,
  );

  if (depletedSpawn !== undefined) {
    return {
      creepName: workerCreep.name,
      spawnName: depletedSpawn.name,
      type: 'refillSpawn',
    };
  }

  const roomController = workerWorld.controllers.find(
    (controllerSnapshot) => controllerSnapshot.roomName === workerCreep.roomName,
  );

  if (roomController === undefined) {
    return null;
  }

  return {
    controllerId: roomController.id,
    creepName: workerCreep.name,
    type: 'upgradeController',
  };
};
