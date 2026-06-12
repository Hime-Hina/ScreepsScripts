import {
  planRoomConstruction,
  type ConstructionDecision,
} from '../construction/construction-planner';
import { planBootstrapWorkerActions, type WorkerActionDecision } from '../creeps/worker-decision';
import type { ScreepsMemoryState } from '../memory/screeps-memory';
import type { ScreepsTickIO, ScreepsTickRuntime } from '../runtime/screeps-runtime';
import { planBootstrapWorkerSpawn, type SpawnDecision } from '../spawning/spawn-decision';

export interface TickTelemetry {
  readonly cpuAtTickStart: number;
  readonly gameTime: number;
}

export interface TickExecution {
  readonly constructionDecisions: readonly ConstructionDecision[];
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
  const constructionDecisions = planRoomConstruction(runtime.readConstructionWorld());
  const spawnDecision = planBootstrapWorkerSpawn(runtime.readSpawningWorld());
  const workerDecisions = planBootstrapWorkerActions(runtime.readWorkerWorld());

  runtime.executeConstructionDecisions(constructionDecisions);

  if (spawnDecision !== null) {
    runtime.executeSpawnDecision(spawnDecision);
  }

  runtime.executeWorkerActions(workerDecisions);

  runtime.writeConsoleLine(`[tick ${runtime.gameTime}] cpu=${cpuAtTickStart.toFixed(2)}`);

  return {
    constructionDecisions,
    memoryState,
    spawnDecision,
    telemetry: {
      cpuAtTickStart,
      gameTime: runtime.gameTime,
    },
    workerDecisions,
  };
};
