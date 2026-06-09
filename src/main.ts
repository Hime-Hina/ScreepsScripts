import { runScreepsTick } from './kernel/run-tick';
import { captureScreepsTickRuntime } from './runtime/screeps-runtime';

export const loop = (): void => {
  runScreepsTick(captureScreepsTickRuntime());
};
