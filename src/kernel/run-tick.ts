import {
  planRoomConstruction,
  type ConstructionDecision,
} from '../construction/construction-planner';
import { planBootstrapWorkerActions, type WorkerActionDecision } from '../creeps/worker-decision';
import { planRoomDefense, type DefenseDecision } from '../defense/defense-planner';
import type { ScreepsMemoryState } from '../memory/screeps-memory';
import type { ScreepsTickIO, ScreepsTickRuntime } from '../runtime/screeps-runtime';
import { planBootstrapWorkerSpawn, type SpawnDecision } from '../spawning/spawn-decision';

export interface TickTelemetry {
  readonly cpuAtTickStart: number;
  readonly gameTime: number;
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
  const cpuAtTickStart = runtime.readCpuUsed();
  const defensePlan = planRoomDefense(runtime.readDefenseWorld());
  const constructionDecisions = planRoomConstruction(runtime.readConstructionWorld());
  const spawnDecision = planBootstrapWorkerSpawn(runtime.readSpawningWorld());
  const workerDecisions = planBootstrapWorkerActions(
    runtime.readWorkerWorld(defensePlan.roomDefenseStates),
  );

  runtime.executeDefenseDecisions(defensePlan.decisions);
  runtime.executeConstructionDecisions(constructionDecisions);

  if (spawnDecision !== null) {
    runtime.executeSpawnDecision(spawnDecision);
  }

  runtime.executeWorkerActions(workerDecisions);

  runtime.writeConsoleLine(`[tick ${runtime.gameTime}] cpu=${cpuAtTickStart.toFixed(2)}`);

  return {
    constructionDecisions,
    defenseDecisions: defensePlan.decisions,
    memoryState,
    spawnDecision,
    telemetry: {
      cpuAtTickStart,
      gameTime: runtime.gameTime,
    },
    workerDecisions,
  };
};
