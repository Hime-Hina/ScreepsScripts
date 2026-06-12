import type { RoomDefenseState } from '../defense/defense-planner';

export const BOOTSTRAP_SURVIVAL_WORKER_COUNT = 3;
export const RCL2_CONSTRUCTION_WORKER_COUNT = 5;

export interface BootstrapControllerSnapshot {
  readonly roomName: string;
  readonly ticksToDowngrade: number;
}

export type BootstrapControllerDowngradeState =
  | {
      readonly roomName: string;
      readonly type: 'controllerDowngradeSafe';
    }
  | {
      readonly roomName: string;
      readonly type: 'controllerDowngradeRecovering';
    }
  | {
      readonly roomName: string;
      readonly type: 'controllerDowngradeWarning';
    }
  | {
      readonly roomName: string;
      readonly type: 'controllerDowngradeCritical';
    };

export type SpawnExtensionEnergyState =
  | {
      readonly roomName: string;
      readonly type: 'spawnExtensionEnergyStable';
    }
  | {
      readonly roomName: string;
      readonly type: 'spawnExtensionEnergyUnstable';
    };

export type BootstrapSpawnAvailability =
  | {
      readonly roomName: string;
      readonly type: 'spawnAvailable';
    }
  | {
      readonly roomName: string;
      readonly type: 'spawnAlreadySpawning';
    };

export type BootstrapWorkerPopulationState =
  | {
      readonly roomName: string;
      readonly type: 'survivalWorkerPopulationStable';
    }
  | {
      readonly roomName: string;
      readonly type: 'survivalWorkerPopulationUnstable';
    };

export type RoomConstructionEligibility =
  | {
      readonly roomName: string;
      readonly type: 'constructionAllowed';
    }
  | {
      readonly roomName: string;
      readonly type: 'constructionDeferredForSurvival';
    }
  | {
      readonly roomName: string;
      readonly type: 'constructionDeferredForDefense';
    };

export type BootstrapWorkerDemand =
  | {
      readonly targetWorkerCount: typeof BOOTSTRAP_SURVIVAL_WORKER_COUNT;
      readonly type: 'survivalWorkerDemand';
    }
  | {
      readonly targetWorkerCount: typeof RCL2_CONSTRUCTION_WORKER_COUNT;
      readonly type: 'rcl2ConstructionWorkerDemand';
    };

export interface BootstrapWorkerDemandInput {
  readonly constructionBacklogEnergy: number;
  readonly controllerDowngradeState: BootstrapControllerDowngradeState;
  readonly controllerLevel: number;
  readonly energyState: SpawnExtensionEnergyState;
  readonly spawnAvailability: BootstrapSpawnAvailability;
  readonly workerCreepCount: number;
}

export interface SpawnExtensionEnergySnapshot {
  readonly availableEnergy: number;
  readonly energyCapacity: number;
}

export interface SpawnExtensionEnergyInput {
  readonly energyStructures: readonly SpawnExtensionEnergySnapshot[];
  readonly roomName: string;
}

export interface BootstrapWorkerPopulationInput {
  readonly roomName: string;
  readonly workerCreepCount: number;
}

export interface RoomConstructionEligibilityInput {
  readonly controllerDowngradeState: BootstrapControllerDowngradeState;
  readonly energyState: SpawnExtensionEnergyState;
  readonly roomDefenseState: RoomDefenseState;
  readonly roomName: string;
  readonly workerPopulationState: BootstrapWorkerPopulationState;
}

const CONTROLLER_DOWNGRADE_CRITICAL_TICKS = 5000;
const CONTROLLER_DOWNGRADE_WARNING_TICKS = 8000;
const CONTROLLER_DOWNGRADE_SAFE_TICKS = 9000;

export const classifyBootstrapControllerDowngradeState = (
  controllerSnapshot: BootstrapControllerSnapshot,
): BootstrapControllerDowngradeState => {
  if (controllerSnapshot.ticksToDowngrade < CONTROLLER_DOWNGRADE_CRITICAL_TICKS) {
    return {
      roomName: controllerSnapshot.roomName,
      type: 'controllerDowngradeCritical',
    };
  }

  if (controllerSnapshot.ticksToDowngrade < CONTROLLER_DOWNGRADE_WARNING_TICKS) {
    return {
      roomName: controllerSnapshot.roomName,
      type: 'controllerDowngradeWarning',
    };
  }

  if (controllerSnapshot.ticksToDowngrade < CONTROLLER_DOWNGRADE_SAFE_TICKS) {
    return {
      roomName: controllerSnapshot.roomName,
      type: 'controllerDowngradeRecovering',
    };
  }

  return {
    roomName: controllerSnapshot.roomName,
    type: 'controllerDowngradeSafe',
  };
};

export const classifySpawnExtensionEnergyState = (
  energyInput: SpawnExtensionEnergyInput,
): SpawnExtensionEnergyState => {
  const hasDepletedEnergyStructure = energyInput.energyStructures.some(
    (energyStructure) => energyStructure.availableEnergy < energyStructure.energyCapacity,
  );

  if (hasDepletedEnergyStructure) {
    return {
      roomName: energyInput.roomName,
      type: 'spawnExtensionEnergyUnstable',
    };
  }

  return {
    roomName: energyInput.roomName,
    type: 'spawnExtensionEnergyStable',
  };
};

export const classifyBootstrapWorkerPopulation = (
  populationInput: BootstrapWorkerPopulationInput,
): BootstrapWorkerPopulationState => {
  if (populationInput.workerCreepCount >= BOOTSTRAP_SURVIVAL_WORKER_COUNT) {
    return {
      roomName: populationInput.roomName,
      type: 'survivalWorkerPopulationStable',
    };
  }

  return {
    roomName: populationInput.roomName,
    type: 'survivalWorkerPopulationUnstable',
  };
};

export const selectRoomConstructionEligibility = (
  eligibilityInput: RoomConstructionEligibilityInput,
): RoomConstructionEligibility => {
  if (eligibilityInput.roomDefenseState.type === 'roomUnsafe') {
    return {
      roomName: eligibilityInput.roomName,
      type: 'constructionDeferredForDefense',
    };
  }

  if (
    eligibilityInput.controllerDowngradeState.type === 'controllerDowngradeSafe' &&
    eligibilityInput.energyState.type === 'spawnExtensionEnergyStable' &&
    eligibilityInput.workerPopulationState.type === 'survivalWorkerPopulationStable'
  ) {
    return {
      roomName: eligibilityInput.roomName,
      type: 'constructionAllowed',
    };
  }

  return {
    roomName: eligibilityInput.roomName,
    type: 'constructionDeferredForSurvival',
  };
};

export const selectBootstrapWorkerDemand = (
  demandInput: BootstrapWorkerDemandInput,
): BootstrapWorkerDemand => {
  if (demandInput.workerCreepCount < BOOTSTRAP_SURVIVAL_WORKER_COUNT) {
    return survivalWorkerDemand;
  }

  if (
    demandInput.controllerLevel === 2 &&
    demandInput.controllerDowngradeState.type === 'controllerDowngradeSafe' &&
    demandInput.energyState.type === 'spawnExtensionEnergyStable' &&
    demandInput.spawnAvailability.type === 'spawnAvailable' &&
    demandInput.constructionBacklogEnergy > 0
  ) {
    return rcl2ConstructionWorkerDemand;
  }

  return survivalWorkerDemand;
};

const survivalWorkerDemand: BootstrapWorkerDemand = {
  targetWorkerCount: BOOTSTRAP_SURVIVAL_WORKER_COUNT,
  type: 'survivalWorkerDemand',
};

const rcl2ConstructionWorkerDemand: BootstrapWorkerDemand = {
  targetWorkerCount: RCL2_CONSTRUCTION_WORKER_COUNT,
  type: 'rcl2ConstructionWorkerDemand',
};
