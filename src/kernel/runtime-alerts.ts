import {
  BOOTSTRAP_SURVIVAL_WORKER_COUNT,
  classifyBootstrapControllerDowngradeState,
} from '../colony/bootstrap-economy';
import {
  planRoomDefense,
  type DefenseHostileClassification,
  type DefenseWorldSnapshot,
} from '../defense/defense-planner';
import { createRuntimeOpsEvent, formatRuntimeOpsEventLine } from '../runtime/ops-event';
import type { RuntimeAlertDecision } from '../runtime/screeps-runtime';
import type { SpawnCreepRole, SpawningWorldSnapshot } from '../spawning/spawn-decision';

export type RuntimeActionFailure =
  | {
      readonly errorMessage: string;
      readonly operation: 'construction' | 'workerNonCritical';
      readonly type: 'nonCriticalRuntimeActionFailure';
    }
  | {
      readonly errorMessage: string;
      readonly operation: 'defense' | 'spawn' | 'tower' | 'workerCritical';
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
  ...selectRoleCompositionDriftAlerts(alertInput),
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

const selectRoleCompositionDriftAlerts = (
  alertInput: RuntimeAlertDecisionInput,
): readonly RuntimeAlertDecision[] =>
  alertInput.spawningWorld.rooms.flatMap((spawningRoom) => {
    const driftSummary = summarizeRoleCompositionDrift(spawningRoom);

    if (driftSummary === null) {
      return [];
    }

    return [
      createAlertDecision({
        emailFallback: false,
        gameTime: alertInput.gameTime,
        kind: 'role_composition_drift',
        metrics: driftSummary,
        recommendedAction:
          'inspect role-specific spawn recovery; surplus miners should age out while missing roles recover',
        roomName: spawningRoom.roomName,
        severity: 'actionable',
        shardName: alertInput.shardName,
        summary: `role composition drift in ${spawningRoom.roomName}`,
      }),
    ];
  });

const summarizeRoleCompositionDrift = (
  spawningRoom: SpawningWorldSnapshot['rooms'][number],
): Record<string, number> | null => {
  const roleCounts = countWorkerRoles(spawningRoom);

  if (!hasRoleSpecificWorkerCreeps(roleCounts)) {
    return null;
  }

  const constructionBacklogEnergy = sumConstructionBacklogEnergy(spawningRoom);
  const minerTarget = Math.min(spawningRoom.sourceCount, spawningRoom.sourceContainerCount ?? 0);
  const minerSurplus = roleCounts.miner - minerTarget;

  if (minerTarget <= 0 || minerSurplus < 3) {
    return null;
  }

  const haulerTarget = calculateRoleDriftHaulerTarget(spawningRoom);
  const builderTarget = calculateRoleDriftBuilderTarget(constructionBacklogEnergy);
  const upgraderTarget = calculateRoleDriftUpgraderTarget(spawningRoom);
  const haulerGap = Math.max(haulerTarget - roleCounts.hauler, 0);
  const builderGap = Math.max(builderTarget - roleCounts.builder, 0);
  const upgraderGap = Math.max(upgraderTarget - roleCounts.upgrader, 0);

  if (haulerGap + builderGap + upgraderGap <= 0) {
    return null;
  }

  return {
    builderCount: roleCounts.builder,
    builderGap,
    builderTarget,
    constructionBacklogEnergy,
    haulerCount: roleCounts.hauler,
    haulerGap,
    haulerTarget,
    minerCount: roleCounts.miner,
    minerSurplus,
    minerTarget,
    sourceContainerEnergyAvailable: spawningRoom.sourceContainerEnergyAvailable ?? 0,
    upgraderCount: roleCounts.upgrader,
    upgraderGap,
    upgraderTarget,
    workerCount: spawningRoom.workerCreepCount,
  };
};

const countWorkerRoles = (
  spawningRoom: SpawningWorldSnapshot['rooms'][number],
): Record<SpawnCreepRole, number> => {
  const roleCounts: Record<SpawnCreepRole, number> = {
    builder: 0,
    hauler: 0,
    miner: 0,
    upgrader: 0,
    worker: 0,
  };

  for (const workerCreep of spawningRoom.workerCreeps ?? []) {
    if (workerCreep.role !== undefined) {
      roleCounts[workerCreep.role] += 1;
    }
  }

  return roleCounts;
};

const hasRoleSpecificWorkerCreeps = (roleCounts: Record<SpawnCreepRole, number>): boolean =>
  roleCounts.miner + roleCounts.hauler + roleCounts.builder + roleCounts.upgrader > 0;

const sumConstructionBacklogEnergy = (
  spawningRoom: SpawningWorldSnapshot['rooms'][number],
): number =>
  spawningRoom.constructionSites.reduce(
    (totalBacklogEnergy, constructionSite) =>
      totalBacklogEnergy + Math.max(constructionSite.remainingWork, 0),
    0,
  );

const calculateRoleDriftHaulerTarget = (
  spawningRoom: SpawningWorldSnapshot['rooms'][number],
): number => {
  if ((spawningRoom.sourceContainerCount ?? 0) <= 0) {
    return 0;
  }

  return 1 + (hasBackloggedSourceEnergy(spawningRoom) && hasEnergySink(spawningRoom) ? 1 : 0);
};

const hasBackloggedSourceEnergy = (spawningRoom: SpawningWorldSnapshot['rooms'][number]): boolean =>
  (spawningRoom.sourceContainerEnergyAvailable ?? 0) >= 800;

const hasEnergySink = (spawningRoom: SpawningWorldSnapshot['rooms'][number]): boolean =>
  spawningRoom.energyStructures.some(
    (energyStructure) => energyStructure.availableEnergy < energyStructure.energyCapacity,
  ) ||
  (spawningRoom.controllerEnergyAvailable !== undefined &&
    spawningRoom.controllerEnergyAvailable < 200);

const calculateRoleDriftBuilderTarget = (constructionBacklogEnergy: number): number => {
  if (constructionBacklogEnergy >= 6000) {
    return 2;
  }

  return constructionBacklogEnergy > 0 ? 1 : 0;
};

const calculateRoleDriftUpgraderTarget = (
  spawningRoom: SpawningWorldSnapshot['rooms'][number],
): number => {
  if (isControllerDowngradeCritical(spawningRoom)) {
    return 2;
  }

  if (
    classifyBootstrapControllerDowngradeState({
      roomName: spawningRoom.roomName,
      ticksToDowngrade: spawningRoom.ticksToDowngrade,
    }).type === 'controllerDowngradeWarning'
  ) {
    return 1;
  }

  return (spawningRoom.sourceContainerCount ?? 0) > 0 ||
    (spawningRoom.controllerEnergyAvailable ?? 0) > 0
    ? 1
    : 0;
};

const selectHostilePresenceAlerts = (
  alertInput: RuntimeAlertDecisionInput,
): readonly RuntimeAlertDecision[] => {
  const hostileClassifications = planRoomDefense(alertInput.defenseWorld).hostileClassifications;

  return alertInput.defenseWorld.hostileCreeps.map((hostileCreep) => {
    const hostileClassification = selectHostileClassification(
      hostileClassifications,
      hostileCreep.id,
    );
    const isCriticalHostile = isCriticalHostilePresence(hostileClassification);

    return createAlertDecision({
      emailFallback: isCriticalHostile,
      gameTime: alertInput.gameTime,
      kind: 'hostile_present',
      metrics: {
        canDamage: hostileClassification?.canDamage ?? false,
        canDismantle: hostileClassification?.canDismantle ?? false,
        hostileId: hostileCreep.id,
        nearCore: hostileClassification?.nearCore ?? false,
        owner: hostileCreep.owner,
      },
      recommendedAction: isCriticalHostile
        ? 'inspect room defense state and safe mode availability'
        : 'record transient hostile observation; inspect if repeated or paired with room damage',
      roomName: hostileCreep.roomName,
      severity: isCriticalHostile ? 'critical' : 'warning',
      shardName: alertInput.shardName,
      summary: isCriticalHostile
        ? `dangerous hostile near core structures in ${hostileCreep.roomName}`
        : `hostile creep observed in ${hostileCreep.roomName}`,
    });
  });
};

const selectHostileClassification = (
  hostileClassifications: readonly DefenseHostileClassification[],
  hostileCreepId: string,
): DefenseHostileClassification | undefined =>
  hostileClassifications.find(
    (hostileClassification) => hostileClassification.hostileCreepId === hostileCreepId,
  );

const isCriticalHostilePresence = (
  hostileClassification: DefenseHostileClassification | undefined,
): boolean =>
  hostileClassification !== undefined &&
  hostileClassification.nearCore &&
  (hostileClassification.canDamage || hostileClassification.canDismantle);

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
  readonly metrics?: Record<string, boolean | number | string>;
  readonly recommendedAction: string;
  readonly roomName?: string;
  readonly severity: 'actionable' | 'critical' | 'warning';
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
