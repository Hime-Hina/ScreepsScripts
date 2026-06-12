export interface WorkerCreepSnapshot {
  readonly energy: number;
  readonly freeCapacity: number;
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

export interface WorkerConstructionSiteSnapshot {
  readonly id: string;
  readonly roomName: string;
}

export interface WorkerEnergyStructureSnapshot {
  readonly availableEnergy: number;
  readonly energyCapacity: number;
  readonly id: string;
  readonly roomName: string;
}

export interface WorkerWorldSnapshot {
  readonly constructionSites: readonly WorkerConstructionSiteSnapshot[];
  readonly controllers: readonly WorkerControllerSnapshot[];
  readonly creeps: readonly WorkerCreepSnapshot[];
  readonly energyStructures: readonly WorkerEnergyStructureSnapshot[];
  readonly sources: readonly WorkerSourceSnapshot[];
}

export type WorkerActionDecision =
  | HarvestSourceDecision
  | RefillEnergyStructureDecision
  | BuildConstructionSiteDecision
  | UpgradeControllerDecision;

export interface HarvestSourceDecision {
  readonly creepName: string;
  readonly sourceId: string;
  readonly type: 'harvestSource';
}

export interface RefillEnergyStructureDecision {
  readonly creepName: string;
  readonly structureId: string;
  readonly type: 'refillEnergyStructure';
}

export interface BuildConstructionSiteDecision {
  readonly constructionSiteId: string;
  readonly creepName: string;
  readonly type: 'buildConstructionSite';
}

export interface UpgradeControllerDecision {
  readonly controllerId: string;
  readonly creepName: string;
  readonly type: 'upgradeController';
}

export const planBootstrapWorkerActions = (
  workerWorld: WorkerWorldSnapshot,
): readonly WorkerActionDecision[] => {
  const harvestSourceByCreepName = assignHarvestSources(workerWorld);

  return workerWorld.creeps
    .map((workerCreep) =>
      planBootstrapWorkerAction(workerWorld, workerCreep, harvestSourceByCreepName),
    )
    .filter((workerDecision): workerDecision is WorkerActionDecision => workerDecision !== null);
};

const planBootstrapWorkerAction = (
  workerWorld: WorkerWorldSnapshot,
  workerCreep: WorkerCreepSnapshot,
  harvestSourceByCreepName: ReadonlyMap<string, WorkerSourceSnapshot>,
): WorkerActionDecision | null => {
  if (workerCreep.freeCapacity > 0) {
    const roomSource = harvestSourceByCreepName.get(workerCreep.name);

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

  const depletedEnergyStructure = selectDepletedEnergyStructure(workerWorld, workerCreep.roomName);

  if (depletedEnergyStructure !== undefined) {
    return {
      creepName: workerCreep.name,
      structureId: depletedEnergyStructure.id,
      type: 'refillEnergyStructure',
    };
  }

  const constructionSite = selectConstructionSite(workerWorld, workerCreep.roomName);

  if (constructionSite !== undefined) {
    return {
      constructionSiteId: constructionSite.id,
      creepName: workerCreep.name,
      type: 'buildConstructionSite',
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

const selectDepletedEnergyStructure = (
  workerWorld: WorkerWorldSnapshot,
  roomName: string,
): WorkerEnergyStructureSnapshot | undefined =>
  workerWorld.energyStructures
    .filter(
      (energyStructureSnapshot) =>
        energyStructureSnapshot.roomName === roomName &&
        energyStructureSnapshot.availableEnergy < energyStructureSnapshot.energyCapacity,
    )
    .sort((leftEnergyStructure, rightEnergyStructure) =>
      leftEnergyStructure.id.localeCompare(rightEnergyStructure.id),
    )[0];

const selectConstructionSite = (
  workerWorld: WorkerWorldSnapshot,
  roomName: string,
): WorkerConstructionSiteSnapshot | undefined =>
  workerWorld.constructionSites
    .filter((constructionSiteSnapshot) => constructionSiteSnapshot.roomName === roomName)
    .sort((leftConstructionSite, rightConstructionSite) =>
      leftConstructionSite.id.localeCompare(rightConstructionSite.id),
    )[0];

const assignHarvestSources = (
  workerWorld: WorkerWorldSnapshot,
): ReadonlyMap<string, WorkerSourceSnapshot> => {
  const harvestSourceByCreepName = new Map<string, WorkerSourceSnapshot>();
  const sourceRoomNames = Array.from(
    new Set(workerWorld.sources.map((sourceSnapshot) => sourceSnapshot.roomName)),
  ).sort();

  for (const roomName of sourceRoomNames) {
    const roomSources = workerWorld.sources
      .filter((sourceSnapshot) => sourceSnapshot.roomName === roomName)
      .sort((leftSource, rightSource) => leftSource.id.localeCompare(rightSource.id));
    const roomCreeps = workerWorld.creeps
      .filter((workerCreep) => workerCreep.roomName === roomName)
      .sort((leftCreep, rightCreep) => leftCreep.name.localeCompare(rightCreep.name));

    for (const [roomCreepIndex, roomCreep] of roomCreeps.entries()) {
      const assignedSource = roomSources[roomCreepIndex % roomSources.length];

      harvestSourceByCreepName.set(roomCreep.name, assignedSource);
    }
  }

  return harvestSourceByCreepName;
};
