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
  readonly level: number;
  readonly roomName: string;
  readonly ticksToDowngrade: number;
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

export type ControllerDowngradeState =
  | {
      readonly controllerId: string;
      readonly roomName: string;
      readonly type: 'controllerDowngradeSafe';
    }
  | {
      readonly controllerId: string;
      readonly roomName: string;
      readonly type: 'controllerDowngradeRecovering';
    }
  | {
      readonly controllerId: string;
      readonly roomName: string;
      readonly type: 'controllerDowngradeWarning';
    }
  | {
      readonly controllerId: string;
      readonly roomName: string;
      readonly type: 'controllerDowngradeCritical';
    };

const CONTROLLER_DOWNGRADE_CRITICAL_TICKS = 5000;
const CONTROLLER_DOWNGRADE_WARNING_TICKS = 8000;
const CONTROLLER_DOWNGRADE_SAFE_TICKS = 9000;

export const planBootstrapWorkerActions = (
  workerWorld: WorkerWorldSnapshot,
): readonly WorkerActionDecision[] => {
  const harvestSourceByCreepName = assignHarvestSources(workerWorld);
  const controllerDowngradeStateByRoomName = classifyControllerDowngradeStates(workerWorld);
  const downgradeWorkerByRoomName = selectDowngradeWorkers(workerWorld);

  return sortWorkerCreeps(workerWorld.creeps)
    .map((workerCreep) =>
      planBootstrapWorkerAction(
        workerWorld,
        workerCreep,
        harvestSourceByCreepName,
        controllerDowngradeStateByRoomName,
        downgradeWorkerByRoomName,
      ),
    )
    .filter((workerDecision): workerDecision is WorkerActionDecision => workerDecision !== null);
};

const planBootstrapWorkerAction = (
  workerWorld: WorkerWorldSnapshot,
  workerCreep: WorkerCreepSnapshot,
  harvestSourceByCreepName: ReadonlyMap<string, WorkerSourceSnapshot>,
  controllerDowngradeStateByRoomName: ReadonlyMap<string, ControllerDowngradeState>,
  downgradeWorkerByRoomName: ReadonlyMap<string, string>,
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

  const controllerDowngradeState = controllerDowngradeStateByRoomName.get(workerCreep.roomName);

  if (
    controllerDowngradeState !== undefined &&
    shouldUpgradeControllerBeforeBuild(
      workerCreep,
      controllerDowngradeState,
      downgradeWorkerByRoomName,
    )
  ) {
    return {
      controllerId: controllerDowngradeState.controllerId,
      creepName: workerCreep.name,
      type: 'upgradeController',
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

const shouldUpgradeControllerBeforeBuild = (
  workerCreep: WorkerCreepSnapshot,
  controllerDowngradeState: ControllerDowngradeState,
  downgradeWorkerByRoomName: ReadonlyMap<string, string>,
): boolean => {
  switch (controllerDowngradeState.type) {
    case 'controllerDowngradeCritical':
      return isFullEnergyWorker(workerCreep);

    case 'controllerDowngradeRecovering':
    case 'controllerDowngradeWarning':
      return downgradeWorkerByRoomName.get(workerCreep.roomName) === workerCreep.name;

    case 'controllerDowngradeSafe':
      return false;
  }
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

const classifyControllerDowngradeStates = (
  workerWorld: WorkerWorldSnapshot,
): ReadonlyMap<string, ControllerDowngradeState> => {
  const controllerDowngradeStateByRoomName = new Map<string, ControllerDowngradeState>();

  for (const controllerSnapshot of workerWorld.controllers) {
    controllerDowngradeStateByRoomName.set(
      controllerSnapshot.roomName,
      classifyControllerDowngradeState(controllerSnapshot),
    );
  }

  return controllerDowngradeStateByRoomName;
};

const classifyControllerDowngradeState = (
  controllerSnapshot: WorkerControllerSnapshot,
): ControllerDowngradeState => {
  if (controllerSnapshot.ticksToDowngrade < CONTROLLER_DOWNGRADE_CRITICAL_TICKS) {
    return {
      controllerId: controllerSnapshot.id,
      roomName: controllerSnapshot.roomName,
      type: 'controllerDowngradeCritical',
    };
  }

  if (controllerSnapshot.ticksToDowngrade < CONTROLLER_DOWNGRADE_WARNING_TICKS) {
    return {
      controllerId: controllerSnapshot.id,
      roomName: controllerSnapshot.roomName,
      type: 'controllerDowngradeWarning',
    };
  }

  if (controllerSnapshot.ticksToDowngrade < CONTROLLER_DOWNGRADE_SAFE_TICKS) {
    return {
      controllerId: controllerSnapshot.id,
      roomName: controllerSnapshot.roomName,
      type: 'controllerDowngradeRecovering',
    };
  }

  return {
    controllerId: controllerSnapshot.id,
    roomName: controllerSnapshot.roomName,
    type: 'controllerDowngradeSafe',
  };
};

const selectDowngradeWorkers = (workerWorld: WorkerWorldSnapshot): ReadonlyMap<string, string> => {
  const downgradeWorkerByRoomName = new Map<string, string>();
  const workerRoomNames = Array.from(
    new Set(workerWorld.creeps.map((workerCreep) => workerCreep.roomName)),
  ).sort();

  for (const roomName of workerRoomNames) {
    const roomDowngradeWorker = sortWorkerCreeps(
      workerWorld.creeps.filter(
        (workerCreep) => workerCreep.roomName === roomName && isFullEnergyWorker(workerCreep),
      ),
    )[0];

    if (roomDowngradeWorker !== undefined) {
      downgradeWorkerByRoomName.set(roomName, roomDowngradeWorker.name);
    }
  }

  return downgradeWorkerByRoomName;
};

const isFullEnergyWorker = (workerCreep: WorkerCreepSnapshot): boolean =>
  workerCreep.energy > 0 && workerCreep.freeCapacity === 0;

const sortWorkerCreeps = (
  workerCreeps: readonly WorkerCreepSnapshot[],
): readonly WorkerCreepSnapshot[] =>
  [...workerCreeps].sort((leftCreep, rightCreep) => {
    const roomNameComparison = leftCreep.roomName.localeCompare(rightCreep.roomName);

    if (roomNameComparison !== 0) {
      return roomNameComparison;
    }

    return leftCreep.name.localeCompare(rightCreep.name);
  });

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
