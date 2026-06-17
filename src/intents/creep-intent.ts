export interface CreepIntent<TDecision> {
  readonly creepName: string;
  readonly decision: TDecision;
  readonly priority: number;
  /** Human-readable explanation; not used for resolver ordering. */
  readonly reason: string;
  readonly source: string;
}

export type RejectedCreepIntentReason = 'lowerPriority' | 'tieBreak';

export interface RejectedCreepIntent<TDecision> {
  readonly intent: CreepIntent<TDecision>;
  readonly reason: RejectedCreepIntentReason;
}

export interface ResolvedCreepIntent<TDecision> {
  readonly creepName: string;
  readonly decision: TDecision;
  readonly rejectedIntents: readonly RejectedCreepIntent<TDecision>[];
  readonly selectedIntent: CreepIntent<TDecision>;
}

export const resolveCreepIntents = <TDecision>(
  intents: readonly CreepIntent<TDecision>[],
): readonly ResolvedCreepIntent<TDecision>[] => {
  const intentsByCreepName = groupCreepIntentsByCreepName(intents);

  return [...intentsByCreepName.entries()]
    .sort(([leftCreepName], [rightCreepName]) => leftCreepName.localeCompare(rightCreepName))
    .map(([creepName, creepIntents]) => resolveSingleCreepIntent(creepName, creepIntents));
};

const groupCreepIntentsByCreepName = <TDecision>(
  intents: readonly CreepIntent<TDecision>[],
): ReadonlyMap<string, readonly CreepIntent<TDecision>[]> => {
  const intentsByCreepName = new Map<string, CreepIntent<TDecision>[]>();

  for (const intent of intents) {
    const creepIntents = intentsByCreepName.get(intent.creepName) ?? [];
    creepIntents.push(intent);
    intentsByCreepName.set(intent.creepName, creepIntents);
  }

  return intentsByCreepName;
};

const resolveSingleCreepIntent = <TDecision>(
  creepName: string,
  intents: readonly CreepIntent<TDecision>[],
): ResolvedCreepIntent<TDecision> => {
  const rankedIntents = intents
    .map((intent, inputIndex) => ({ inputIndex, intent }))
    .sort(compareRankedCreepIntentPriority)
    .map(({ intent }) => intent);
  const [selectedIntent, ...rejectedIntents] = rankedIntents;

  if (selectedIntent === undefined) {
    throw new Error(`Cannot resolve creep intents for ${creepName}: no intents provided`);
  }

  return {
    creepName,
    decision: selectedIntent.decision,
    rejectedIntents: rejectedIntents.map((rejectedIntent) => ({
      intent: rejectedIntent,
      reason: rejectedIntent.priority < selectedIntent.priority ? 'lowerPriority' : 'tieBreak',
    })),
    selectedIntent,
  };
};

const compareRankedCreepIntentPriority = <TDecision>(
  left: { readonly inputIndex: number; readonly intent: CreepIntent<TDecision> },
  right: { readonly inputIndex: number; readonly intent: CreepIntent<TDecision> },
): number => {
  const intentComparison = compareCreepIntentPriority(left.intent, right.intent);

  if (intentComparison !== 0) {
    return intentComparison;
  }

  return left.inputIndex - right.inputIndex;
};

const compareCreepIntentPriority = <TDecision>(
  left: CreepIntent<TDecision>,
  right: CreepIntent<TDecision>,
): number => {
  const priorityComparison = right.priority - left.priority;

  if (priorityComparison !== 0) {
    return priorityComparison;
  }

  const sourceComparison = left.source.localeCompare(right.source);

  if (sourceComparison !== 0) {
    return sourceComparison;
  }

  return 0;
};
