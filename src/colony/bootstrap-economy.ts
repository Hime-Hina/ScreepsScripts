import type { RoomDefenseState } from '../defense/defense-planner';

export const BOOTSTRAP_SURVIVAL_WORKER_COUNT = 3;
const RCL2_DEVELOPMENT_WORKER_MAX = 10;
const SOURCE_ENERGY_PER_TICK = 10;
const WORKER_UPTIME_RATIO = 0.8;
const ENERGY_SPEND_PER_WORK_PART = 1.1;
const BUILD_POWER_PER_WORK_PART = 5;
const BUILD_DUTY_RATIO = 0.65;
const BACKLOG_CLEAR_TICKS = 2500;

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
      readonly targetWorkerCount: number;
      readonly type: 'rcl2DevelopmentWorkerDemand';
    };

export interface BootstrapWorkerDemandInput {
  readonly constructionBacklogEnergy: number;
  readonly controllerDowngradeState: BootstrapControllerDowngradeState;
  readonly controllerLevel: number;
  readonly energyState: SpawnExtensionEnergyState;
  readonly plannedWorkerWorkParts: number;
  readonly sourceCount: number;
  readonly workerCreepCount: number;
  readonly workerCreepWorkParts: number;
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
    demandInput.controllerLevel < 2 ||
    demandInput.controllerDowngradeState.type !== 'controllerDowngradeSafe'
  ) {
    return survivalWorkerDemand;
  }

  return {
    targetWorkerCount: calculateRcl2DevelopmentWorkerTarget(demandInput),
    type: 'rcl2DevelopmentWorkerDemand',
  };
};

const calculateRcl2DevelopmentWorkerTarget = (demandInput: BootstrapWorkerDemandInput): number => {
  const effectiveWorkerWorkParts = calculateEffectiveWorkerWorkParts(demandInput);
  const sourceSaturationWorkerTarget = calculateSourceSaturationWorkerTarget(
    demandInput.sourceCount,
    effectiveWorkerWorkParts,
  );
  const constructionBacklogWorkerTarget = calculateConstructionBacklogWorkerTarget(
    demandInput.constructionBacklogEnergy,
    effectiveWorkerWorkParts,
  );

  return clampWorkerTarget(
    Math.max(
      BOOTSTRAP_SURVIVAL_WORKER_COUNT,
      sourceSaturationWorkerTarget,
      constructionBacklogWorkerTarget,
    ),
  );
};

const calculateEffectiveWorkerWorkParts = (demandInput: BootstrapWorkerDemandInput): number => {
  const currentAverageWorkerWorkParts =
    demandInput.workerCreepCount > 0
      ? Math.ceil(demandInput.workerCreepWorkParts / demandInput.workerCreepCount)
      : 0;

  return Math.max(demandInput.plannedWorkerWorkParts, currentAverageWorkerWorkParts, 1);
};

const calculateSourceSaturationWorkerTarget = (
  sourceCount: number,
  effectiveWorkerWorkParts: number,
): number => {
  if (sourceCount <= 0) {
    return BOOTSTRAP_SURVIVAL_WORKER_COUNT;
  }

  return Math.ceil(
    (sourceCount * SOURCE_ENERGY_PER_TICK) /
      (effectiveWorkerWorkParts * ENERGY_SPEND_PER_WORK_PART * WORKER_UPTIME_RATIO),
  );
};

const calculateConstructionBacklogWorkerTarget = (
  constructionBacklogEnergy: number,
  effectiveWorkerWorkParts: number,
): number => {
  if (constructionBacklogEnergy <= 0) {
    return BOOTSTRAP_SURVIVAL_WORKER_COUNT;
  }

  return (
    BOOTSTRAP_SURVIVAL_WORKER_COUNT +
    Math.ceil(
      constructionBacklogEnergy /
        (BUILD_POWER_PER_WORK_PART *
          effectiveWorkerWorkParts *
          BUILD_DUTY_RATIO *
          BACKLOG_CLEAR_TICKS),
    )
  );
};

const clampWorkerTarget = (targetWorkerCount: number): number =>
  Math.min(
    Math.max(targetWorkerCount, BOOTSTRAP_SURVIVAL_WORKER_COUNT),
    RCL2_DEVELOPMENT_WORKER_MAX,
  );

const survivalWorkerDemand: BootstrapWorkerDemand = {
  targetWorkerCount: BOOTSTRAP_SURVIVAL_WORKER_COUNT,
  type: 'survivalWorkerDemand',
};
