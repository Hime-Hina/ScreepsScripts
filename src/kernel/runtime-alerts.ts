import {
  BOOTSTRAP_SURVIVAL_WORKER_COUNT,
  classifyBootstrapControllerDowngradeState,
} from '../colony/bootstrap-economy';
import type { DefenseWorldSnapshot } from '../defense/defense-planner';
import { createRuntimeOpsEvent, formatRuntimeOpsEventLine } from '../runtime/ops-event';
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
  readonly shardName: string;
  readonly spawningWorld: SpawningWorldSnapshot;
}

const RUNTIME_ALERT_GROUP_INTERVAL = 100;
const SURVIVAL_WORKER_ALERT_COUNT = BOOTSTRAP_SURVIVAL_WORKER_COUNT;

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
    if (!isControllerDowngradeCritical(spawningRoom)) {
      return [];
    }

    return [
      createAlertDecision({
        emailFallback: true,
        gameTime: alertInput.gameTime,
        kind: 'controller_downgrade_critical',
        metrics: {
          ticksToDowngrade: spawningRoom.ticksToDowngrade,
        },
        recommendedAction: 'prioritize controller upgrade and inspect room survival state',
        roomName: spawningRoom.roomName,
        severity: 'critical',
        shardName: alertInput.shardName,
        summary: `controller downgrade critical in ${spawningRoom.roomName}`,
      }),
    ];
  });

const isControllerDowngradeCritical = (
  spawningRoom: SpawningWorldSnapshot['rooms'][number],
): boolean =>
  classifyBootstrapControllerDowngradeState({
    roomName: spawningRoom.roomName,
    ticksToDowngrade: spawningRoom.ticksToDowngrade,
  }).type === 'controllerDowngradeCritical';

const selectWorkerCountAlerts = (
  alertInput: RuntimeAlertDecisionInput,
): readonly RuntimeAlertDecision[] =>
  alertInput.spawningWorld.rooms.flatMap((spawningRoom) => {
    if (!shouldCreateWorkerCountAlert(alertInput.spawningWorld, spawningRoom)) {
      return [];
    }

    return [
      createAlertDecision({
        emailFallback: true,
        gameTime: alertInput.gameTime,
        kind: 'worker_count_low',
        metrics: {
          survivalFloor: SURVIVAL_WORKER_ALERT_COUNT,
          workers: spawningRoom.workerCreepCount,
        },
        recommendedAction: 'inspect spawn availability and bootstrap worker recovery',
        roomName: spawningRoom.roomName,
        severity: 'critical',
        shardName: alertInput.shardName,
        summary: `worker count below survival floor in ${spawningRoom.roomName}`,
      }),
    ];
  });

const shouldCreateWorkerCountAlert = (
  spawningWorld: SpawningWorldSnapshot,
  spawningRoom: SpawningWorldSnapshot['rooms'][number],
): boolean => {
  if (spawningRoom.workerCreepCount >= SURVIVAL_WORKER_ALERT_COUNT) {
    return false;
  }

  if (spawningRoom.workerCreepCount <= 0) {
    return true;
  }

  if (isControllerDowngradeCritical(spawningRoom)) {
    return true;
  }

  return !isRecoverableOneWorkerDip(spawningWorld, spawningRoom);
};

const isRecoverableOneWorkerDip = (
  spawningWorld: SpawningWorldSnapshot,
  spawningRoom: SpawningWorldSnapshot['rooms'][number],
): boolean =>
  spawningRoom.workerCreepCount === SURVIVAL_WORKER_ALERT_COUNT - 1 &&
  hasAvailableSurvivalWorkerSpawn(spawningWorld, spawningRoom.roomName);

const hasAvailableSurvivalWorkerSpawn = (
  spawningWorld: SpawningWorldSnapshot,
  roomName: string,
): boolean => {
  const survivalWorkerEnergyCost =
    spawningWorld.bodyPartCosts.work +
    spawningWorld.bodyPartCosts.carry +
    spawningWorld.bodyPartCosts.move;

  return spawningWorld.spawns.some(
    (spawnSnapshot) =>
      spawnSnapshot.roomName === roomName &&
      !spawnSnapshot.isSpawning &&
      spawnSnapshot.energyCapacity >= survivalWorkerEnergyCost &&
      spawnSnapshot.availableEnergy >= survivalWorkerEnergyCost,
  );
};

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

    const hasSurvivalRisk =
      shouldCreateWorkerCountAlert(alertInput.spawningWorld, spawningRoom) ||
      isControllerDowngradeCritical(spawningRoom);

    if (
      totalEnergyCapacity <= 0 ||
      totalAvailableEnergy >= totalEnergyCapacity ||
      !hasSurvivalRisk
    ) {
      return [];
    }

    return [
      createAlertDecision({
        emailFallback: false,
        gameTime: alertInput.gameTime,
        kind: 'spawn_energy_low',
        metrics: {
          availableEnergy: totalAvailableEnergy,
          energyCapacity: totalEnergyCapacity,
        },
        recommendedAction: 'treat as supporting context for the active survival-risk event',
        roomName: spawningRoom.roomName,
        severity: 'actionable',
        shardName: alertInput.shardName,
        summary: `spawn and extension energy low in ${spawningRoom.roomName}`,
      }),
    ];
  });

const selectHostilePresenceAlerts = (
  alertInput: RuntimeAlertDecisionInput,
): readonly RuntimeAlertDecision[] =>
  alertInput.defenseWorld.hostileCreeps.map((hostileCreep) =>
    createAlertDecision({
      emailFallback: true,
      gameTime: alertInput.gameTime,
      kind: 'hostile_present',
      metrics: {
        hostileId: hostileCreep.id,
        owner: hostileCreep.owner,
      },
      recommendedAction: 'inspect room defense state and safe mode availability',
      roomName: hostileCreep.roomName,
      severity: 'critical',
      shardName: alertInput.shardName,
      summary: `hostile creep present in ${hostileCreep.roomName}`,
    }),
  );

const selectActionFailureAlerts = (
  alertInput: RuntimeAlertDecisionInput,
): readonly RuntimeAlertDecision[] =>
  alertInput.actionFailures.map((actionFailure) => {
    const isCritical = actionFailure.type === 'criticalRuntimeActionFailure';

    return createAlertDecision({
      emailFallback: isCritical,
      gameTime: alertInput.gameTime,
      kind: 'runtime_action_failure',
      metrics: {
        criticality: formatActionFailureCriticality(actionFailure),
        error: actionFailure.errorMessage,
        operation: actionFailure.operation,
      },
      recommendedAction: isCritical
        ? 'inspect runtime failure and prepare rollback if survival path is affected'
        : 'inspect non-critical runtime failure when convenient',
      severity: isCritical ? 'critical' : 'actionable',
      shardName: alertInput.shardName,
      summary: `${formatActionFailureCriticality(actionFailure)} runtime action failure in ${
        actionFailure.operation
      }`,
    });
  });

const formatActionFailureCriticality = (actionFailure: RuntimeActionFailure): string => {
  switch (actionFailure.type) {
    case 'criticalRuntimeActionFailure':
      return 'critical';

    case 'nonCriticalRuntimeActionFailure':
      return 'non-critical';
  }
};

const createAlertDecision = ({
  emailFallback,
  gameTime,
  kind,
  metrics,
  recommendedAction,
  roomName,
  severity,
  shardName,
  summary,
}: {
  readonly emailFallback: boolean;
  readonly gameTime: number;
  readonly kind: string;
  readonly metrics?: Record<string, string | number>;
  readonly recommendedAction: string;
  readonly roomName?: string;
  readonly severity: 'actionable' | 'critical';
  readonly shardName: string;
  readonly summary: string;
}): RuntimeAlertDecision => {
  const roomSegment = roomName ?? 'global';
  const opsEvent = createRuntimeOpsEvent({
    dedupeKey: `${kind}:${shardName}:${roomSegment}`,
    id: `${kind}:${shardName}:${roomSegment}:${gameTime}`,
    kind,
    ...(metrics === undefined ? {} : { metrics }),
    recommendedAction,
    ...(roomName === undefined ? {} : { room: roomName }),
    severity,
    shard: shardName,
    summary,
    tick: gameTime,
  });

  return {
    emailFallback,
    groupInterval: RUNTIME_ALERT_GROUP_INTERVAL,
    message: formatRuntimeOpsEventLine(opsEvent),
    opsEvent,
    type: 'notify',
  };
};
