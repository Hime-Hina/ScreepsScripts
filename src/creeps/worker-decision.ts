import {
  classifyBootstrapControllerDowngradeState,
  type BootstrapControllerDowngradeState,
  type RoomConstructionEligibility,
} from '../colony/bootstrap-economy';

export type WorkerEnergyMode = 'harvesting' | 'working';

export interface WorkerCreepSnapshot {
  readonly energy: number;
  readonly energyMode: WorkerEnergyMode;
  readonly freeCapacity: number;
  readonly name: string;
  readonly roomName: string;
  readonly x?: number;
  readonly y?: number;
}

export interface WorkerSourceSnapshot {
  readonly id: string;
  readonly roomName: string;
  readonly x?: number;
  readonly y?: number;
}

export interface WorkerControllerSnapshot {
  readonly id: string;
  readonly level: number;
  readonly roomName: string;
  readonly ticksToDowngrade: number;
}

export interface WorkerConstructionSiteSnapshot {
  readonly id: string;
  readonly progress?: number;
  readonly progressTotal?: number;
  readonly roomName: string;
  readonly structureType?: string;
  readonly x?: number;
  readonly y?: number;
}

export interface WorkerEnergyStructureSnapshot {
  readonly availableEnergy: number;
  readonly energyCapacity: number;
  readonly id: string;
  readonly roomName: string;
  readonly structureType?: 'extension' | 'spawn' | 'tower';
  readonly x?: number;
  readonly y?: number;
}

export interface WorkerEnergyPickupSnapshot {
  readonly amount: number;
  readonly id: string;
  readonly roomName: string;
  readonly x?: number;
  readonly y?: number;
}

export type WorkerEnergyWithdrawTargetType =
  | 'container'
  | 'ruin'
  | 'storage'
  | 'structure'
  | 'terminal'
  | 'tombstone';

export interface WorkerEnergyWithdrawSnapshot {
  readonly availableEnergy: number;
  readonly id: string;
  readonly roomName: string;
  readonly targetType?: WorkerEnergyWithdrawTargetType;
  readonly x?: number;
  readonly y?: number;
}

export type WorkerRepairStructureType = 'container' | 'extension' | 'road' | 'spawn';

export interface WorkerRepairTargetSnapshot {
  readonly hits: number;
  readonly hitsMax: number;
  readonly id: string;
  readonly roomName: string;
  readonly structureType: WorkerRepairStructureType;
  readonly x: number;
  readonly y: number;
}

export interface WorkerWorldSnapshot {
  readonly constructionEligibilities: readonly RoomConstructionEligibility[];
  readonly constructionSites: readonly WorkerConstructionSiteSnapshot[];
  readonly controllers: readonly WorkerControllerSnapshot[];
  readonly creeps: readonly WorkerCreepSnapshot[];
  readonly energyPickups: readonly WorkerEnergyPickupSnapshot[];
  readonly energyWithdrawals: readonly WorkerEnergyWithdrawSnapshot[];
  readonly energyStructures: readonly WorkerEnergyStructureSnapshot[];
  readonly repairTargets: readonly WorkerRepairTargetSnapshot[];
  readonly sources: readonly WorkerSourceSnapshot[];
}

export type WorkerActionDecision =
  | HarvestSourceDecision
  | PickupEnergyDecision
  | WithdrawEnergyDecision
  | RefillEnergyStructureDecision
  | RepairStructureDecision
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

export interface PickupEnergyDecision {
  readonly creepName: string;
  readonly resourceId: string;
  readonly type: 'pickupEnergy';
}

export interface WithdrawEnergyDecision {
  readonly creepName: string;
  readonly structureId: string;
  readonly type: 'withdrawEnergy';
}

export interface BuildConstructionSiteDecision {
  readonly constructionSiteId: string;
  readonly creepName: string;
  readonly type: 'buildConstructionSite';
}

export interface RepairStructureDecision {
  readonly creepName: string;
  readonly structureId: string;
  readonly type: 'repairStructure';
}

export interface UpgradeControllerDecision {
  readonly controllerId: string;
  readonly creepName: string;
  readonly type: 'upgradeController';
}

export type ControllerDowngradeState = BootstrapControllerDowngradeState & {
  readonly controllerId: string;
};

const CONTAINER_CRITICAL_HITS_RATIO = 0.25;
const ROAD_CRITICAL_HITS_RATIO = 0.2;
const SOURCE_LOCAL_CONSTRUCTION_RANGE = 5;

export const isWorkerRepairStructureType = (
  structureType: string,
): structureType is WorkerRepairStructureType => {
  switch (structureType) {
    case 'container':
    case 'extension':
    case 'road':
    case 'spawn':
      return true;

    default:
      return false;
  }
};

export const planBootstrapWorkerActions = (
  workerWorld: WorkerWorldSnapshot,
): readonly WorkerActionDecision[] => {
  const harvestSourceByCreepName = assignHarvestSources(workerWorld);
  const controllerDowngradeStateByRoomName = classifyControllerDowngradeStates(workerWorld);
  const downgradeWorkerByRoomName = selectDowngradeWorkers(workerWorld);
  const reservedPickupEnergyById = new Map<string, number>();
  const reservedWithdrawEnergyById = new Map<string, number>();
  const reservedRefillEnergyById = new Map<string, number>();
  const reservedConstructionWorkById = new Map<string, number>();
  const reservedRepairStructureIds = new Set<string>();

  return sortWorkerCreeps(workerWorld.creeps)
    .map((workerCreep) =>
      planBootstrapWorkerAction(
        workerWorld,
        workerCreep,
        harvestSourceByCreepName,
        controllerDowngradeStateByRoomName,
        downgradeWorkerByRoomName,
        reservedPickupEnergyById,
        reservedWithdrawEnergyById,
        reservedRefillEnergyById,
        reservedConstructionWorkById,
        reservedRepairStructureIds,
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
  reservedPickupEnergyById: Map<string, number>,
  reservedWithdrawEnergyById: Map<string, number>,
  reservedRefillEnergyById: Map<string, number>,
  reservedConstructionWorkById: Map<string, number>,
  reservedRepairStructureIds: Set<string>,
): WorkerActionDecision | null => {
  if (selectWorkerEnergyMode(workerCreep) === 'harvesting') {
    const energyPickup = selectEnergyPickup(
      workerWorld,
      workerCreep,
      workerCreep.freeCapacity,
      reservedPickupEnergyById,
    );

    if (energyPickup !== undefined) {
      reserveTargetEnergy(energyPickup.id, workerCreep.freeCapacity, reservedPickupEnergyById);

      return {
        creepName: workerCreep.name,
        resourceId: energyPickup.id,
        type: 'pickupEnergy',
      };
    }

    const energyWithdrawal = selectEnergyWithdrawal(
      workerWorld,
      workerCreep,
      workerCreep.freeCapacity,
      reservedWithdrawEnergyById,
    );

    if (energyWithdrawal !== undefined) {
      reserveTargetEnergy(
        energyWithdrawal.id,
        workerCreep.freeCapacity,
        reservedWithdrawEnergyById,
      );

      return {
        creepName: workerCreep.name,
        structureId: energyWithdrawal.id,
        type: 'withdrawEnergy',
      };
    }

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

  const depletedEnergyStructure = selectDepletedEnergyStructure(
    workerWorld,
    workerCreep,
    reservedRefillEnergyById,
    isPrimaryEnergyStructure,
  );

  if (depletedEnergyStructure !== undefined) {
    reserveTargetEnergy(depletedEnergyStructure.id, workerCreep.energy, reservedRefillEnergyById);

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

  const repairTarget = selectCriticalRepairTarget(
    workerWorld,
    workerCreep,
    reservedRepairStructureIds,
  );

  if (repairTarget !== undefined) {
    reservedRepairStructureIds.add(repairTarget.id);

    return {
      creepName: workerCreep.name,
      structureId: repairTarget.id,
      type: 'repairStructure',
    };
  }

  const depletedTower = selectDepletedEnergyStructure(
    workerWorld,
    workerCreep,
    reservedRefillEnergyById,
    isTowerEnergyStructure,
  );

  if (depletedTower !== undefined) {
    reserveTargetEnergy(depletedTower.id, workerCreep.energy, reservedRefillEnergyById);

    return {
      creepName: workerCreep.name,
      structureId: depletedTower.id,
      type: 'refillEnergyStructure',
    };
  }

  const constructionEligibility = selectConstructionEligibility(workerWorld, workerCreep.roomName);
  const constructionSite =
    constructionEligibility?.type === 'constructionAllowed'
      ? selectConstructionSite(
          workerWorld,
          workerCreep,
          reservedConstructionWorkById,
          harvestSourceByCreepName.get(workerCreep.name),
        )
      : undefined;

  if (constructionSite !== undefined) {
    reserveConstructionWork(constructionSite, workerCreep, reservedConstructionWorkById);

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

const selectWorkerEnergyMode = (workerCreep: WorkerCreepSnapshot): WorkerEnergyMode => {
  if (workerCreep.energy <= 0) {
    return 'harvesting';
  }

  if (workerCreep.freeCapacity <= 0) {
    return 'working';
  }

  return workerCreep.energyMode;
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
  workerCreep: WorkerCreepSnapshot,
  reservedRefillEnergyById: ReadonlyMap<string, number>,
  shouldIncludeEnergyStructure: (energyStructure: WorkerEnergyStructureSnapshot) => boolean,
): WorkerEnergyStructureSnapshot | undefined =>
  workerWorld.energyStructures
    .filter(
      (energyStructureSnapshot) =>
        energyStructureSnapshot.roomName === workerCreep.roomName &&
        shouldIncludeEnergyStructure(energyStructureSnapshot) &&
        measureRemainingRefillEnergy(energyStructureSnapshot, reservedRefillEnergyById) > 0,
    )
    .sort((leftEnergyStructure, rightEnergyStructure) =>
      compareEnergyStructuresForRefill(
        leftEnergyStructure,
        rightEnergyStructure,
        workerCreep,
        reservedRefillEnergyById,
      ),
    )[0];

const isPrimaryEnergyStructure = (energyStructure: WorkerEnergyStructureSnapshot): boolean =>
  energyStructure.structureType !== 'tower';

const isTowerEnergyStructure = (energyStructure: WorkerEnergyStructureSnapshot): boolean =>
  energyStructure.structureType === 'tower';

const selectEnergyPickup = (
  workerWorld: WorkerWorldSnapshot,
  workerCreep: WorkerCreepSnapshot,
  creepFreeCapacity: number,
  reservedPickupEnergyById: ReadonlyMap<string, number>,
): WorkerEnergyPickupSnapshot | undefined =>
  workerWorld.energyPickups
    .filter(
      (energyPickup) =>
        energyPickup.roomName === workerCreep.roomName &&
        energyPickup.amount - (reservedPickupEnergyById.get(energyPickup.id) ?? 0) > 0 &&
        creepFreeCapacity > 0,
    )
    .sort((leftPickup, rightPickup) =>
      compareEnergyPickupsForPickup(leftPickup, rightPickup, workerCreep, reservedPickupEnergyById),
    )[0];

const selectEnergyWithdrawal = (
  workerWorld: WorkerWorldSnapshot,
  workerCreep: WorkerCreepSnapshot,
  creepFreeCapacity: number,
  reservedWithdrawEnergyById: ReadonlyMap<string, number>,
): WorkerEnergyWithdrawSnapshot | undefined =>
  workerWorld.energyWithdrawals
    .filter(
      (energyWithdrawal) =>
        energyWithdrawal.roomName === workerCreep.roomName &&
        energyWithdrawal.availableEnergy -
          (reservedWithdrawEnergyById.get(energyWithdrawal.id) ?? 0) >
          0 &&
        creepFreeCapacity > 0,
    )
    .sort((leftWithdrawal, rightWithdrawal) =>
      compareEnergyWithdrawalsForWithdraw(
        leftWithdrawal,
        rightWithdrawal,
        workerCreep,
        reservedWithdrawEnergyById,
      ),
    )[0];

const reserveTargetEnergy = (
  targetId: string,
  workerFreeCapacity: number,
  reservedEnergyById: Map<string, number>,
): void => {
  const currentReservedEnergy = reservedEnergyById.get(targetId) ?? 0;

  reservedEnergyById.set(targetId, currentReservedEnergy + workerFreeCapacity);
};

const compareEnergyStructuresForRefill = (
  leftEnergyStructure: WorkerEnergyStructureSnapshot,
  rightEnergyStructure: WorkerEnergyStructureSnapshot,
  workerCreep: WorkerCreepSnapshot,
  reservedRefillEnergyById: ReadonlyMap<string, number>,
): number => {
  const leftTypePriority = measureEnergyStructureRefillPriority(leftEnergyStructure);
  const rightTypePriority = measureEnergyStructureRefillPriority(rightEnergyStructure);

  if (leftTypePriority !== rightTypePriority) {
    return leftTypePriority - rightTypePriority;
  }

  const leftRemainingEnergy = measureRemainingRefillEnergy(
    leftEnergyStructure,
    reservedRefillEnergyById,
  );
  const rightRemainingEnergy = measureRemainingRefillEnergy(
    rightEnergyStructure,
    reservedRefillEnergyById,
  );

  if (leftRemainingEnergy !== rightRemainingEnergy) {
    return rightRemainingEnergy - leftRemainingEnergy;
  }

  return compareTargetRangeThenId(leftEnergyStructure, rightEnergyStructure, workerCreep);
};

const measureRemainingRefillEnergy = (
  energyStructure: WorkerEnergyStructureSnapshot,
  reservedRefillEnergyById: ReadonlyMap<string, number>,
): number =>
  energyStructure.energyCapacity -
  energyStructure.availableEnergy -
  (reservedRefillEnergyById.get(energyStructure.id) ?? 0);

const measureEnergyStructureRefillPriority = (
  energyStructure: WorkerEnergyStructureSnapshot,
): number => {
  switch (energyStructure.structureType) {
    case 'spawn':
      return 0;

    case 'extension':
      return 1;

    case 'tower':
      return 2;

    case undefined:
    default:
      return 3;
  }
};

const compareEnergyPickupsForPickup = (
  leftPickup: WorkerEnergyPickupSnapshot,
  rightPickup: WorkerEnergyPickupSnapshot,
  workerCreep: WorkerCreepSnapshot,
  reservedPickupEnergyById: ReadonlyMap<string, number>,
): number => {
  const leftRemainingEnergy =
    leftPickup.amount - (reservedPickupEnergyById.get(leftPickup.id) ?? 0);
  const rightRemainingEnergy =
    rightPickup.amount - (reservedPickupEnergyById.get(rightPickup.id) ?? 0);

  if (leftRemainingEnergy !== rightRemainingEnergy) {
    return rightRemainingEnergy - leftRemainingEnergy;
  }

  return compareTargetRangeThenId(leftPickup, rightPickup, workerCreep);
};

const compareEnergyWithdrawalsForWithdraw = (
  leftWithdrawal: WorkerEnergyWithdrawSnapshot,
  rightWithdrawal: WorkerEnergyWithdrawSnapshot,
  workerCreep: WorkerCreepSnapshot,
  reservedWithdrawEnergyById: ReadonlyMap<string, number>,
): number => {
  const leftTypePriority = measureEnergyWithdrawalPriority(leftWithdrawal);
  const rightTypePriority = measureEnergyWithdrawalPriority(rightWithdrawal);

  if (leftTypePriority !== rightTypePriority) {
    return leftTypePriority - rightTypePriority;
  }

  const leftRemainingEnergy =
    leftWithdrawal.availableEnergy - (reservedWithdrawEnergyById.get(leftWithdrawal.id) ?? 0);
  const rightRemainingEnergy =
    rightWithdrawal.availableEnergy - (reservedWithdrawEnergyById.get(rightWithdrawal.id) ?? 0);

  if (leftRemainingEnergy !== rightRemainingEnergy) {
    return rightRemainingEnergy - leftRemainingEnergy;
  }

  return compareTargetRangeThenId(leftWithdrawal, rightWithdrawal, workerCreep);
};

const measureEnergyWithdrawalPriority = (
  energyWithdrawal: WorkerEnergyWithdrawSnapshot,
): number => {
  switch (energyWithdrawal.targetType) {
    case 'container':
      return 0;

    case 'storage':
    case 'terminal':
      return 1;

    case 'structure':
      return 2;

    case 'tombstone':
      return 3;

    case 'ruin':
      return 4;

    case undefined:
    default:
      return 5;
  }
};

const compareRepairTargetsForRepair = (
  leftRepairTarget: WorkerRepairTargetSnapshot,
  rightRepairTarget: WorkerRepairTargetSnapshot,
  workerCreep: WorkerCreepSnapshot,
): number => {
  const leftTypePriority = measureRepairTargetPriority(leftRepairTarget);
  const rightTypePriority = measureRepairTargetPriority(rightRepairTarget);

  if (leftTypePriority !== rightTypePriority) {
    return leftTypePriority - rightTypePriority;
  }

  const leftHitsRatio = leftRepairTarget.hits / leftRepairTarget.hitsMax;
  const rightHitsRatio = rightRepairTarget.hits / rightRepairTarget.hitsMax;

  if (leftHitsRatio !== rightHitsRatio) {
    return leftHitsRatio - rightHitsRatio;
  }

  return compareTargetRangeThenId(leftRepairTarget, rightRepairTarget, workerCreep);
};

const measureRepairTargetPriority = (repairTarget: WorkerRepairTargetSnapshot): number => {
  switch (repairTarget.structureType) {
    case 'container':
    case 'extension':
    case 'spawn':
      return 0;

    case 'road':
      return 1;
  }
};

const compareTargetRangeThenId = (
  leftTarget: { readonly id: string; readonly x?: number; readonly y?: number },
  rightTarget: { readonly id: string; readonly x?: number; readonly y?: number },
  workerCreep: WorkerCreepSnapshot,
): number => {
  const leftRange = measureOptionalRange(workerCreep, leftTarget);
  const rightRange = measureOptionalRange(workerCreep, rightTarget);

  if (leftRange !== rightRange) {
    return leftRange - rightRange;
  }

  return leftTarget.id.localeCompare(rightTarget.id);
};

const measureOptionalRange = (
  leftPosition: { readonly x?: number; readonly y?: number },
  rightPosition: { readonly x?: number; readonly y?: number },
): number =>
  leftPosition.x === undefined ||
  leftPosition.y === undefined ||
  rightPosition.x === undefined ||
  rightPosition.y === undefined
    ? Number.POSITIVE_INFINITY
    : measureRange(
        { x: leftPosition.x, y: leftPosition.y },
        { x: rightPosition.x, y: rightPosition.y },
      );

const selectCriticalRepairTarget = (
  workerWorld: WorkerWorldSnapshot,
  workerCreep: WorkerCreepSnapshot,
  reservedRepairStructureIds: ReadonlySet<string>,
): WorkerRepairTargetSnapshot | undefined =>
  workerWorld.repairTargets
    .filter(
      (repairTarget) =>
        repairTarget.roomName === workerCreep.roomName &&
        !reservedRepairStructureIds.has(repairTarget.id) &&
        isCriticalRepairTarget(repairTarget),
    )
    .sort((leftRepairTarget, rightRepairTarget) =>
      compareRepairTargetsForRepair(leftRepairTarget, rightRepairTarget, workerCreep),
    )[0];

const isCriticalRepairTarget = (repairTarget: WorkerRepairTargetSnapshot): boolean => {
  switch (repairTarget.structureType) {
    case 'container':
      return isBelowRepairRatio(repairTarget, CONTAINER_CRITICAL_HITS_RATIO);

    case 'road':
      return isBelowRepairRatio(repairTarget, ROAD_CRITICAL_HITS_RATIO);

    case 'extension':
    case 'spawn':
      return repairTarget.hits < repairTarget.hitsMax;
  }
};

const isBelowRepairRatio = (
  repairTarget: WorkerRepairTargetSnapshot,
  criticalHitsRatio: number,
): boolean => repairTarget.hits < Math.ceil(repairTarget.hitsMax * criticalHitsRatio);

const selectConstructionSite = (
  workerWorld: WorkerWorldSnapshot,
  workerCreep: WorkerCreepSnapshot,
  reservedConstructionWorkById: ReadonlyMap<string, number>,
  assignedSource: WorkerSourceSnapshot | undefined,
): WorkerConstructionSiteSnapshot | undefined => {
  const candidateConstructionSites = workerWorld.constructionSites.filter(
    (constructionSiteSnapshot) =>
      constructionSiteSnapshot.roomName === workerCreep.roomName &&
      measureRemainingConstructionWork(constructionSiteSnapshot, reservedConstructionWorkById) > 0,
  );
  const sourceLocalitySource = candidateConstructionSites.some((constructionSite) =>
    isSourceLocalConstructionSiteAssignedToSource(workerWorld, constructionSite, assignedSource),
  )
    ? assignedSource
    : undefined;

  return candidateConstructionSites.sort(
    compareConstructionSitesForBuild(workerWorld, sourceLocalitySource),
  )[0];
};

const reserveConstructionWork = (
  constructionSite: WorkerConstructionSiteSnapshot,
  workerCreep: WorkerCreepSnapshot,
  reservedConstructionWorkById: Map<string, number>,
): void => {
  const currentReservedWork = reservedConstructionWorkById.get(constructionSite.id) ?? 0;

  reservedConstructionWorkById.set(
    constructionSite.id,
    currentReservedWork + estimateWorkerConstructionWork(workerCreep),
  );
};

const measureRemainingConstructionWork = (
  constructionSite: WorkerConstructionSiteSnapshot,
  reservedConstructionWorkById: ReadonlyMap<string, number>,
): number =>
  constructionSite.progressTotal === undefined
    ? Number.POSITIVE_INFINITY
    : constructionSite.progressTotal -
      (constructionSite.progress ?? 0) -
      (reservedConstructionWorkById.get(constructionSite.id) ?? 0);

const estimateWorkerConstructionWork = (workerCreep: WorkerCreepSnapshot): number =>
  Math.max(workerCreep.energy, 0);

const compareConstructionSitesForBuild =
  (workerWorld: WorkerWorldSnapshot, assignedSource: WorkerSourceSnapshot | undefined) =>
  (
    leftConstructionSite: WorkerConstructionSiteSnapshot,
    rightConstructionSite: WorkerConstructionSiteSnapshot,
  ): number => {
    const leftPriority = measureConstructionSiteBuildPriority(
      workerWorld,
      leftConstructionSite,
      assignedSource,
    );
    const rightPriority = measureConstructionSiteBuildPriority(
      workerWorld,
      rightConstructionSite,
      assignedSource,
    );

    if (leftPriority.structurePriority !== rightPriority.structurePriority) {
      return leftPriority.structurePriority - rightPriority.structurePriority;
    }

    if (leftPriority.assignedSourceLocality !== rightPriority.assignedSourceLocality) {
      return leftPriority.assignedSourceLocality - rightPriority.assignedSourceLocality;
    }

    if (leftPriority.nearestSourceRange !== rightPriority.nearestSourceRange) {
      return leftPriority.nearestSourceRange - rightPriority.nearestSourceRange;
    }

    if (leftPriority.progress !== rightPriority.progress) {
      return rightPriority.progress - leftPriority.progress;
    }

    return compareConstructionSitePosition(leftConstructionSite, rightConstructionSite);
  };

const measureConstructionSiteBuildPriority = (
  workerWorld: WorkerWorldSnapshot,
  constructionSite: WorkerConstructionSiteSnapshot,
  assignedSource: WorkerSourceSnapshot | undefined,
): {
  readonly assignedSourceLocality: number;
  readonly nearestSourceRange: number;
  readonly progress: number;
  readonly structurePriority: number;
} => ({
  assignedSourceLocality: measureAssignedSourceLocality(
    workerWorld,
    constructionSite,
    assignedSource,
  ),
  nearestSourceRange:
    constructionSite.structureType === 'road'
      ? measureNearestSourceRange(workerWorld, constructionSite)
      : 0,
  progress: constructionSite.progress ?? 0,
  structurePriority: measureConstructionSiteStructurePriority(constructionSite),
});

const measureConstructionSiteStructurePriority = (
  constructionSite: WorkerConstructionSiteSnapshot,
): number => {
  switch (constructionSite.structureType) {
    case 'extension':
    case 'container':
      return 0;

    case 'road':
      return 1;

    case undefined:
    default:
      return 2;
  }
};

const measureAssignedSourceLocality = (
  workerWorld: WorkerWorldSnapshot,
  constructionSite: WorkerConstructionSiteSnapshot,
  assignedSource: WorkerSourceSnapshot | undefined,
): number =>
  assignedSource !== undefined &&
  isSourceLocalConstructionSite(workerWorld, constructionSite) &&
  selectNearestSource(workerWorld, constructionSite)?.id !== assignedSource.id
    ? 1
    : 0;

const isSourceLocalConstructionSiteAssignedToSource = (
  workerWorld: WorkerWorldSnapshot,
  constructionSite: WorkerConstructionSiteSnapshot,
  assignedSource: WorkerSourceSnapshot | undefined,
): boolean =>
  assignedSource !== undefined &&
  isSourceLocalConstructionSite(workerWorld, constructionSite) &&
  selectNearestSource(workerWorld, constructionSite)?.id === assignedSource.id;

const isSourceLocalConstructionSite = (
  workerWorld: WorkerWorldSnapshot,
  constructionSite: WorkerConstructionSiteSnapshot,
): boolean =>
  (constructionSite.structureType === 'container' || constructionSite.structureType === 'road') &&
  measureNearestSourceRange(workerWorld, constructionSite) <= SOURCE_LOCAL_CONSTRUCTION_RANGE;

const selectNearestSource = (
  workerWorld: WorkerWorldSnapshot,
  constructionSite: WorkerConstructionSiteSnapshot,
): WorkerSourceSnapshot | undefined => {
  if (constructionSite.x === undefined || constructionSite.y === undefined) {
    return undefined;
  }

  return workerWorld.sources
    .filter((sourceSnapshot) => sourceSnapshot.roomName === constructionSite.roomName)
    .flatMap((sourceSnapshot) =>
      sourceSnapshot.x === undefined || sourceSnapshot.y === undefined
        ? []
        : [
            {
              range: measureRange(
                { x: constructionSite.x!, y: constructionSite.y! },
                { x: sourceSnapshot.x, y: sourceSnapshot.y },
              ),
              sourceSnapshot,
            },
          ],
    )
    .sort((leftSourceDistance, rightSourceDistance) => {
      if (leftSourceDistance.range !== rightSourceDistance.range) {
        return leftSourceDistance.range - rightSourceDistance.range;
      }

      return leftSourceDistance.sourceSnapshot.id.localeCompare(
        rightSourceDistance.sourceSnapshot.id,
      );
    })[0]?.sourceSnapshot;
};

const measureNearestSourceRange = (
  workerWorld: WorkerWorldSnapshot,
  constructionSite: WorkerConstructionSiteSnapshot,
): number => {
  if (constructionSite.x === undefined || constructionSite.y === undefined) {
    return Number.POSITIVE_INFINITY;
  }

  const sourceRanges = workerWorld.sources
    .filter(
      (sourceSnapshot) =>
        sourceSnapshot.roomName === constructionSite.roomName &&
        sourceSnapshot.x !== undefined &&
        sourceSnapshot.y !== undefined,
    )
    .map((sourceSnapshot) =>
      measureRange(
        { x: constructionSite.x!, y: constructionSite.y! },
        { x: sourceSnapshot.x!, y: sourceSnapshot.y! },
      ),
    );

  return Math.min(...sourceRanges, Number.POSITIVE_INFINITY);
};

const compareConstructionSitePosition = (
  leftConstructionSite: WorkerConstructionSiteSnapshot,
  rightConstructionSite: WorkerConstructionSiteSnapshot,
): number => {
  if (leftConstructionSite.y !== rightConstructionSite.y) {
    return (
      (leftConstructionSite.y ?? Number.POSITIVE_INFINITY) -
      (rightConstructionSite.y ?? Number.POSITIVE_INFINITY)
    );
  }

  if (leftConstructionSite.x !== rightConstructionSite.x) {
    return (
      (leftConstructionSite.x ?? Number.POSITIVE_INFINITY) -
      (rightConstructionSite.x ?? Number.POSITIVE_INFINITY)
    );
  }

  return leftConstructionSite.id.localeCompare(rightConstructionSite.id);
};

const compareSourcePositions = (
  leftSource: WorkerSourceSnapshot,
  rightSource: WorkerSourceSnapshot,
): number => {
  if (leftSource.y !== rightSource.y) {
    return (leftSource.y ?? Number.POSITIVE_INFINITY) - (rightSource.y ?? Number.POSITIVE_INFINITY);
  }

  if (leftSource.x !== rightSource.x) {
    return (leftSource.x ?? Number.POSITIVE_INFINITY) - (rightSource.x ?? Number.POSITIVE_INFINITY);
  }

  return leftSource.id.localeCompare(rightSource.id);
};

const selectConstructionEligibility = (
  workerWorld: WorkerWorldSnapshot,
  roomName: string,
): RoomConstructionEligibility | undefined =>
  workerWorld.constructionEligibilities.find(
    (constructionEligibility) => constructionEligibility.roomName === roomName,
  );

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
): ControllerDowngradeState => ({
  ...classifyBootstrapControllerDowngradeState(controllerSnapshot),
  controllerId: controllerSnapshot.id,
});

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

const measureRange = (
  leftPosition: { readonly x: number; readonly y: number },
  rightPosition: { readonly x: number; readonly y: number },
): number =>
  Math.max(Math.abs(leftPosition.x - rightPosition.x), Math.abs(leftPosition.y - rightPosition.y));

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
      .sort(compareSourcePositions);
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
