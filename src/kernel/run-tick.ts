import {
  planRoomConstruction,
  type ConstructionDecision,
} from '../construction/construction-planner';
import { planBootstrapWorkerActions, type WorkerActionDecision } from '../creeps/worker-decision';
import { planRoomDefense, type DefenseDecision } from '../defense/defense-planner';
import type { ScreepsMemoryState } from '../memory/screeps-memory';
import type {
  RuntimeCpuSnapshot,
  ScreepsTickIO,
  ScreepsTickRuntime,
} from '../runtime/screeps-runtime';
import {
  planBootstrapSurvivalWorkerSpawn,
  planBootstrapWorkerSpawn,
  type SpawnDecision,
} from '../spawning/spawn-decision';
import { selectRuntimeAlertDecisions, type RuntimeActionFailure } from './runtime-alerts';
import { selectTickBudgetDecision, type TickBudgetDecision } from './tick-budget';

export interface TickTelemetry {
  readonly cpuSnapshot: RuntimeCpuSnapshot;
  readonly gameTime: number;
  readonly tickBudgetDecision: TickBudgetDecision;
}

export interface TickExecution {
  readonly constructionDecisions: readonly ConstructionDecision[];
  readonly defenseDecisions: readonly DefenseDecision[];
  readonly memoryState: ScreepsMemoryState;
  readonly spawnDecision: SpawnDecision | null;
  readonly telemetry: TickTelemetry;
  readonly workerDecisions: readonly WorkerActionDecision[];
}

export const runScreepsTick = (runtime: ScreepsTickRuntime): TickExecution => {
  runtime.cleanStaleCreepMemory();

  const memoryState = runtime.readMemoryState();
  const tickExecution = runTick(runtime, memoryState);

  runtime.writeMemoryState(tickExecution.memoryState);

  return tickExecution;
};

export const runTick = (runtime: ScreepsTickIO, memoryState: ScreepsMemoryState): TickExecution => {
  const cpuSnapshot = runtime.readCpuSnapshot();
  const tickBudgetDecision = selectTickBudgetDecision(cpuSnapshot);
  const defenseWorld = runtime.readDefenseWorld();
  const defensePlan = planRoomDefense(defenseWorld);
  const constructionDecisions =
    tickBudgetDecision.type === 'fullTickBudget'
      ? planRoomConstruction(runtime.readConstructionWorld())
      : [];
  const spawningWorld =
    tickBudgetDecision.type === 'fullTickBudget'
      ? runtime.readSpawningWorld()
      : runtime.readSurvivalSpawningWorld();
  const spawnDecision =
    tickBudgetDecision.type === 'fullTickBudget'
      ? planBootstrapWorkerSpawn(spawningWorld)
      : planBootstrapSurvivalWorkerSpawn(spawningWorld);
  const workerDecisions = planBootstrapWorkerActions(
    tickBudgetDecision.type === 'fullTickBudget'
      ? runtime.readWorkerWorld(defensePlan.roomDefenseStates)
      : runtime.readSurvivalWorkerWorld(defensePlan.roomDefenseStates),
  );
  const actionFailures: RuntimeActionFailure[] = [];
  const alertContext: RuntimeAlertContext = {
    defenseWorld,
    runtime,
    spawningWorld,
  };

  executeCriticalRuntimeOperation(alertContext, actionFailures, 'defense', () =>
    runtime.executeDefenseDecisions(defensePlan.decisions),
  );
  executeNonCriticalRuntimeOperation(actionFailures, 'construction', () =>
    runtime.executeConstructionDecisions(constructionDecisions),
  );

  if (spawnDecision !== null) {
    executeCriticalRuntimeOperation(alertContext, actionFailures, 'spawn', () =>
      runtime.executeSpawnDecision(spawnDecision),
    );
  }

  const criticalWorkerDecisions = workerDecisions.filter(isCriticalWorkerActionDecision);
  const nonCriticalWorkerDecisions = workerDecisions.filter(
    (workerDecision) => !isCriticalWorkerActionDecision(workerDecision),
  );

  if (criticalWorkerDecisions.length > 0) {
    executeCriticalRuntimeOperation(alertContext, actionFailures, 'workerCritical', () =>
      runtime.executeWorkerActions(criticalWorkerDecisions),
    );
  }

  if (nonCriticalWorkerDecisions.length > 0) {
    executeNonCriticalRuntimeOperation(actionFailures, 'workerNonCritical', () =>
      runtime.executeWorkerActions(nonCriticalWorkerDecisions),
    );
  }

  sendRuntimeAlerts(alertContext, actionFailures);

  runtime.writeConsoleLine(
    `[tick ${runtime.gameTime}] cpu=${cpuSnapshot.usedAtTickStart.toFixed(2)} bucket=${
      cpuSnapshot.bucket
    } limit=${cpuSnapshot.limit} tickLimit=${cpuSnapshot.tickLimit} budget=${formatTickBudgetDecision(
      tickBudgetDecision,
    )} rooms=${formatRuntimeRoomSummaries(spawningWorld, defenseWorld)}`,
  );

  return {
    constructionDecisions,
    defenseDecisions: defensePlan.decisions,
    memoryState,
    spawnDecision,
    telemetry: {
      cpuSnapshot,
      gameTime: runtime.gameTime,
      tickBudgetDecision,
    },
    workerDecisions,
  };
};

interface RuntimeAlertContext {
  readonly defenseWorld: ReturnType<ScreepsTickIO['readDefenseWorld']>;
  readonly runtime: ScreepsTickIO;
  readonly spawningWorld: ReturnType<ScreepsTickIO['readSpawningWorld']>;
}

const executeCriticalRuntimeOperation = (
  alertContext: RuntimeAlertContext,
  actionFailures: RuntimeActionFailure[],
  operation: 'defense' | 'spawn' | 'workerCritical',
  executeRuntimeOperation: () => void,
): void => {
  try {
    executeRuntimeOperation();
  } catch (caughtError) {
    const actionFailure: RuntimeActionFailure = {
      errorMessage: readCaughtErrorMessage(caughtError),
      operation,
      type: 'criticalRuntimeActionFailure',
    };

    actionFailures.push(actionFailure);
    sendRuntimeAlerts(alertContext, [actionFailure]);
    throw caughtError;
  }
};

const executeNonCriticalRuntimeOperation = (
  actionFailures: RuntimeActionFailure[],
  operation: 'construction' | 'workerNonCritical',
  executeRuntimeOperation: () => void,
): void => {
  try {
    executeRuntimeOperation();
  } catch (caughtError) {
    actionFailures.push({
      errorMessage: readCaughtErrorMessage(caughtError),
      operation,
      type: 'nonCriticalRuntimeActionFailure',
    });
  }
};

const sendRuntimeAlerts = (
  alertContext: RuntimeAlertContext,
  actionFailures: readonly RuntimeActionFailure[],
): void => {
  const alertDecisions = selectRuntimeAlertDecisions({
    actionFailures,
    defenseWorld: alertContext.defenseWorld,
    gameTime: alertContext.runtime.gameTime,
    spawningWorld: alertContext.spawningWorld,
  });

  for (const alertDecision of alertDecisions) {
    alertContext.runtime.sendRuntimeAlert(alertDecision);
  }
};

const readCaughtErrorMessage = (caughtError: unknown): string => {
  if (caughtError instanceof Error) {
    return caughtError.message;
  }

  return String(caughtError);
};

const formatRuntimeRoomSummaries = (
  spawningWorld: ReturnType<ScreepsTickIO['readSpawningWorld']>,
  defenseWorld: ReturnType<ScreepsTickIO['readDefenseWorld']>,
): string => {
  if (spawningWorld.rooms.length === 0) {
    return '-';
  }

  return spawningWorld.rooms
    .map((spawningRoom) =>
      [
        spawningRoom.roomName,
        `workers=${spawningRoom.workerCreepCount}`,
        `spawnEnergy=${formatRoomEnergy(spawningRoom.energyStructures)}`,
        `construction=${spawningRoom.constructionSites.length}`,
        `hostiles=${countRoomHostiles(defenseWorld, spawningRoom.roomName)}`,
      ].join(':'),
    )
    .join(',');
};

const formatRoomEnergy = (
  energyStructures: ReturnType<
    ScreepsTickIO['readSpawningWorld']
  >['rooms'][number]['energyStructures'],
): string => {
  const availableEnergy = energyStructures.reduce(
    (totalEnergy, energyStructure) => totalEnergy + energyStructure.availableEnergy,
    0,
  );
  const energyCapacity = energyStructures.reduce(
    (totalCapacity, energyStructure) => totalCapacity + energyStructure.energyCapacity,
    0,
  );

  return `${availableEnergy}/${energyCapacity}`;
};

const countRoomHostiles = (
  defenseWorld: ReturnType<ScreepsTickIO['readDefenseWorld']>,
  roomName: string,
): number =>
  defenseWorld.hostileCreeps.filter((hostileCreep) => hostileCreep.roomName === roomName).length;

const isCriticalWorkerActionDecision = (workerDecision: WorkerActionDecision): boolean => {
  switch (workerDecision.type) {
    case 'buildConstructionSite':
    case 'repairStructure':
      return false;

    case 'harvestSource':
    case 'pickupEnergy':
    case 'refillEnergyStructure':
    case 'upgradeController':
    case 'withdrawEnergy':
      return true;
  }
};

const formatTickBudgetDecision = (tickBudgetDecision: TickBudgetDecision): string => {
  switch (tickBudgetDecision.type) {
    case 'fullTickBudget':
      return 'full';

    case 'survivalOnlyTickBudget':
      return 'survival-only';
  }
};
