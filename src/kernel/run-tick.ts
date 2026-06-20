import {
  planRoomConstruction,
  type ConstructionDecision,
} from '../construction/construction-planner';
import { planBootstrapWorkerActions, type WorkerActionDecision } from '../creeps/worker-decision';
import { planRoomDefense, type DefenseDecision } from '../defense/defense-planner';
import { planTowerActions, type TowerActionDecision } from '../defense/tower-planner';
import type { ScreepsMemoryState } from '../memory/screeps-memory';
import { createRuntimeHeartbeatOpsEvent, formatRuntimeOpsEventLine } from '../runtime/ops-event';
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
  readonly towerDecisions: readonly TowerActionDecision[];
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
  runtime.installGmConsoleTools?.();

  const cpuSnapshot = runtime.readCpuSnapshot();
  const tickBudgetDecision = selectTickBudgetDecision(cpuSnapshot);
  const defenseWorld = runtime.readDefenseWorld();
  const defensePlan = planRoomDefense(defenseWorld);
  const towerDecisions = planTowerActions(runtime.readTowerWorld());
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
  executeCriticalRuntimeOperation(alertContext, actionFailures, 'tower', () =>
    runtime.executeTowerActions(towerDecisions),
  );
  executeNonCriticalRuntimeOperation(actionFailures, 'construction', () =>
    runtime.executeConstructionDecisions(constructionDecisions),
  );

  if (spawnDecision !== null) {
    executeCriticalRuntimeOperation(alertContext, actionFailures, 'spawn', () =>
      runtime.executeSpawnDecision(spawnDecision),
    );
  }

  const manualCreepNames = new Set(runtime.applyGmFlagDirectives?.() ?? []);
  const executableWorkerDecisions = workerDecisions.filter(
    (workerDecision) => !manualCreepNames.has(workerDecision.creepName),
  );
  const criticalWorkerDecisions = executableWorkerDecisions.filter(isCriticalWorkerActionDecision);
  const nonCriticalWorkerDecisions = executableWorkerDecisions.filter(
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
    formatRuntimeOpsEventLine(
      createRuntimeHeartbeatOpsEvent({
        cpuSnapshot,
        defenseWorld,
        gameTime: runtime.gameTime,
        shardName: runtime.shardName,
        spawningWorld,
        tickBudget: formatTickBudgetDecision(tickBudgetDecision),
      }),
    ),
  );
  runtime.runGmConsoleWatches?.();

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
    towerDecisions,
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
  operation: 'defense' | 'spawn' | 'tower' | 'workerCritical',
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
    shardName: alertContext.runtime.shardName,
    spawningWorld: alertContext.spawningWorld,
  });

  for (const alertDecision of alertDecisions) {
    alertContext.runtime.writeConsoleLine(alertDecision.message);

    if (alertDecision.emailFallback) {
      alertContext.runtime.sendRuntimeAlert(alertDecision);
    }
  }
};

const readCaughtErrorMessage = (caughtError: unknown): string => {
  if (caughtError instanceof Error) {
    return caughtError.message;
  }

  return String(caughtError);
};

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
