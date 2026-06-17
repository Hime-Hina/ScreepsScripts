import { describe, expect, it } from 'vitest';

import { resolveCreepIntents, type CreepIntent } from '../../../src/intents/creep-intent';

interface TestCreepDecision {
  readonly targetId: string;
  readonly type: 'build' | 'flee' | 'upgrade';
}

const intent = (
  partial: Omit<CreepIntent<TestCreepDecision>, 'reason'> & { readonly reason?: string },
): CreepIntent<TestCreepDecision> => ({
  reason: 'test intent',
  ...partial,
});

describe('creep intent resolver', () => {
  it('selects the highest-priority intent for each creep', () => {
    const resolvedIntents = resolveCreepIntents([
      intent({
        creepName: 'Worker1',
        decision: {
          targetId: 'site-1',
          type: 'build',
        },
        priority: 50,
        source: 'construction',
      }),
      intent({
        creepName: 'Worker1',
        decision: {
          targetId: 'exit-1',
          type: 'flee',
        },
        priority: 100,
        source: 'defense',
      }),
      intent({
        creepName: 'Worker2',
        decision: {
          targetId: 'controller-1',
          type: 'upgrade',
        },
        priority: 10,
        source: 'controller',
      }),
    ]);

    expect(
      resolvedIntents.map((resolvedIntent) => ({
        creepName: resolvedIntent.creepName,
        rejected: resolvedIntent.rejectedIntents.map((rejectedIntent) => ({
          reason: rejectedIntent.reason,
          source: rejectedIntent.intent.source,
        })),
        selectedSource: resolvedIntent.selectedIntent.source,
        selectedType: resolvedIntent.decision.type,
      })),
    ).toEqual([
      {
        creepName: 'Worker1',
        rejected: [
          {
            reason: 'lowerPriority',
            source: 'construction',
          },
        ],
        selectedSource: 'defense',
        selectedType: 'flee',
      },
      {
        creepName: 'Worker2',
        rejected: [],
        selectedSource: 'controller',
        selectedType: 'upgrade',
      },
    ]);
  });

  it('uses source name as a deterministic tie-breaker for equal priority', () => {
    const resolvedIntents = resolveCreepIntents([
      intent({
        creepName: 'Worker1',
        decision: {
          targetId: 'site-1',
          type: 'build',
        },
        priority: 50,
        source: 'construction',
      }),
      intent({
        creepName: 'Worker1',
        decision: {
          targetId: 'controller-1',
          type: 'upgrade',
        },
        priority: 50,
        source: 'controller',
      }),
    ]);

    expect(resolvedIntents).toHaveLength(1);
    expect(resolvedIntents[0]?.selectedIntent.source).toBe('construction');
    expect(resolvedIntents[0]?.decision.type).toBe('build');
    expect(resolvedIntents[0]?.rejectedIntents).toEqual([
      {
        intent: intent({
          creepName: 'Worker1',
          decision: {
            targetId: 'controller-1',
            type: 'upgrade',
          },
          priority: 50,
          source: 'controller',
        }),
        reason: 'tieBreak',
      },
    ]);
  });
});
