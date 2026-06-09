import type { ScreepsTickRuntime } from '../runtime/screeps-runtime';

export interface TickTelemetry {
  readonly cpuAtTickStart: number;
  readonly gameTime: number;
}

export const runTick = (runtime: ScreepsTickRuntime): TickTelemetry => {
  const cpuAtTickStart = runtime.readCpuUsed();

  runtime.writeConsoleLine(`[tick ${runtime.gameTime}] cpu=${cpuAtTickStart.toFixed(2)}`);

  return {
    cpuAtTickStart,
    gameTime: runtime.gameTime,
  };
};
