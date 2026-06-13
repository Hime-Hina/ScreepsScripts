import type { DefenseWorldSnapshot } from '../defense/defense-planner';
import type { RuntimeAlertDecision } from '../runtime/screeps-runtime';
import type { SpawningWorldSnapshot } from '../spawning/spawn-decision';

export type RuntimeActionFailure =
  | {
      readonly errorMessage: string;
      readonly operation: 'construction' | 'workerNonCritical';
      readonly type: 'nonCriticalRuntimeActionFailure';
    }
  | {
      readonly errorMessage: string;
      readonly operation: 'defense' | 'spawn' | 'workerCritical';
      readonly type: 'criticalRuntimeActionFailure';
    };

export interface RuntimeAlertDecisionInput {
  readonly actionFailures: readonly RuntimeActionFailure[];
  readonly defenseWorld: DefenseWorldSnapshot;
  readonly gameTime: number;
  readonly spawningWorld: SpawningWorldSnapshot;
}

const RUNTIME_ALERT_GROUP_INTERVAL = 100;
const CONTROLLER_DOWNGRADE_ALERT_TICKS = 5000;
const SURVIVAL_WORKER_ALERT_COUNT = 3;

export const selectRuntimeAlertDecisions = (
  alertInput: RuntimeAlertDecisionInput,
): readonly RuntimeAlertDecision[] => [
  ...selectControllerDowngradeAlerts(alertInput),
  ...selectWorkerCountAlerts(alertInput),
  ...selectSpawnEnergyAlerts(alertInput),
  ...selectHostilePresenceAlerts(alertInput),
  ...selectActionFailureAlerts(alertInput),
];

const selectControllerDowngradeAlerts = (
  alertInput: RuntimeAlertDecisionInput,
): readonly RuntimeAlertDecision[] =>
  alertInput.spawningWorld.rooms.flatMap((spawningRoom) => {
    if (spawningRoom.ticksToDowngrade >= CONTROLLER_DOWNGRADE_ALERT_TICKS) {
      return [];
    }

    return [
      createNotifyDecision(
        `alert=controller-downgrade-critical room=${spawningRoom.roomName} ticksToDowngrade=${spawningRoom.ticksToDowngrade}`,
      ),
    ];
  });

const selectWorkerCountAlerts = (
  alertInput: RuntimeAlertDecisionInput,
): readonly RuntimeAlertDecision[] =>
  alertInput.spawningWorld.rooms.flatMap((spawningRoom) => {
    if (spawningRoom.workerCreepCount >= SURVIVAL_WORKER_ALERT_COUNT) {
      return [];
    }

    return [
      createNotifyDecision(
        `alert=worker-count-low room=${spawningRoom.roomName} workers=${spawningRoom.workerCreepCount}`,
      ),
    ];
  });

const selectSpawnEnergyAlerts = (
  alertInput: RuntimeAlertDecisionInput,
): readonly RuntimeAlertDecision[] =>
  alertInput.spawningWorld.rooms.flatMap((spawningRoom) => {
    const totalEnergyCapacity = spawningRoom.energyStructures.reduce(
      (totalCapacity, energyStructure) => totalCapacity + energyStructure.energyCapacity,
      0,
    );
    const totalAvailableEnergy = spawningRoom.energyStructures.reduce(
      (totalEnergy, energyStructure) => totalEnergy + energyStructure.availableEnergy,
      0,
    );

    if (totalEnergyCapacity <= 0 || totalAvailableEnergy >= totalEnergyCapacity) {
      return [];
    }

    return [
      createNotifyDecision(
        `alert=spawn-energy-low room=${spawningRoom.roomName} energy=${totalAvailableEnergy}/${totalEnergyCapacity}`,
      ),
    ];
  });

const selectHostilePresenceAlerts = (
  alertInput: RuntimeAlertDecisionInput,
): readonly RuntimeAlertDecision[] =>
  alertInput.defenseWorld.hostileCreeps.map((hostileCreep) =>
    createNotifyDecision(
      `alert=hostile-present room=${hostileCreep.roomName} hostile=${hostileCreep.id} owner=${hostileCreep.owner}`,
    ),
  );

const selectActionFailureAlerts = (
  alertInput: RuntimeAlertDecisionInput,
): readonly RuntimeAlertDecision[] =>
  alertInput.actionFailures.map((actionFailure) =>
    createNotifyDecision(
      `alert=runtime-action-failure operation=${actionFailure.operation} criticality=${formatActionFailureCriticality(
        actionFailure,
      )} error=${actionFailure.errorMessage}`,
    ),
  );

const formatActionFailureCriticality = (actionFailure: RuntimeActionFailure): string => {
  switch (actionFailure.type) {
    case 'criticalRuntimeActionFailure':
      return 'critical';

    case 'nonCriticalRuntimeActionFailure':
      return 'non-critical';
  }
};

const createNotifyDecision = (message: string): RuntimeAlertDecision => ({
  groupInterval: RUNTIME_ALERT_GROUP_INTERVAL,
  message,
  type: 'notify',
});
