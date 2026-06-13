import type { RuntimeCpuSnapshot } from '../runtime/screeps-runtime';

export type TickBudgetDecision =
  | {
      readonly type: 'fullTickBudget';
    }
  | {
      readonly type: 'survivalOnlyTickBudget';
    };

export const SURVIVAL_ONLY_BUCKET_FLOOR = 2000;

export const selectTickBudgetDecision = (cpuSnapshot: RuntimeCpuSnapshot): TickBudgetDecision => {
  if (cpuSnapshot.bucket < SURVIVAL_ONLY_BUCKET_FLOOR) {
    return {
      type: 'survivalOnlyTickBudget',
    };
  }

  return {
    type: 'fullTickBudget',
  };
};
