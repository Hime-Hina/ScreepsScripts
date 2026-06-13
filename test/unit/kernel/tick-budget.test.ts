import { describe, expect, it } from 'vitest';

import { selectTickBudgetDecision } from '../../../src/kernel/tick-budget';
import type { RuntimeCpuSnapshot } from '../../../src/runtime/screeps-runtime';

const createCpuSnapshot = (bucket: number): RuntimeCpuSnapshot => ({
  bucket,
  limit: 20,
  tickLimit: 500,
  usedAtTickStart: 1.25,
});

describe('tick budget decision', () => {
  it('uses survival-only budget below the documented bucket floor', () => {
    expect(selectTickBudgetDecision(createCpuSnapshot(1999))).toEqual({
      type: 'survivalOnlyTickBudget',
    });
  });

  it('uses the full budget at the documented bucket floor', () => {
    expect(selectTickBudgetDecision(createCpuSnapshot(2000))).toEqual({
      type: 'fullTickBudget',
    });
  });
});
