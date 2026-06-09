import type { ScreepsMemoryState } from '../memory/screeps-memory';
import type { ScreepsTickIO, ScreepsTickRuntime } from '../runtime/screeps-runtime';
import { planInitialWorkerSpawn, type SpawnDecision } from '../spawning/spawn-decision';

export interface TickTelemetry {
  readonly cpuAtTickStart: number;
  readonly gameTime: number;
}

export interface TickExecution {
  readonly memoryState: ScreepsMemoryState;
  readonly spawnDecision: SpawnDecision | null;
  readonly telemetry: TickTelemetry;
}

export const runScreepsTick = (runtime: ScreepsTickRuntime): TickExecution => {
  const memoryState = runtime.readMemoryState();
  const tickExecution = runTick(runtime, memoryState);

  runtime.writeMemoryState(tickExecution.memoryState);

  return tickExecution;
};

export const runTick = (runtime: ScreepsTickIO, memoryState: ScreepsMemoryState): TickExecution => {
  const cpuAtTickStart = runtime.readCpuUsed();
  const spawnDecision = planInitialWorkerSpawn(runtime.readSpawningWorld());

  runtime.writeConsoleLine(`[tick ${runtime.gameTime}] cpu=${cpuAtTickStart.toFixed(2)}`);

  return {
    memoryState,
    spawnDecision,
    telemetry: {
      cpuAtTickStart,
      gameTime: runtime.gameTime,
    },
  };
};
