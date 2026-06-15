import type { DefenseWorldSnapshot } from '../defense/defense-planner';
import type { SpawningWorldSnapshot } from '../spawning/spawn-decision';
import type { RuntimeCpuSnapshot } from './screeps-runtime';

export const OPS_EVENT_PREFIX = '[HERMES_EVENT]';
export const OPS_EVENT_SCHEMA = 'screeps.ops.event.v1';

export type RuntimeOpsEventSeverity = 'info' | 'warning' | 'actionable' | 'critical';

export type RuntimeOpsEventMetricRecord = Readonly<Record<string, RuntimeOpsEventMetric>>;

export type RuntimeOpsEventMetric =
  | boolean
  | null
  | number
  | string
  | readonly RuntimeOpsEventMetric[]
  | Readonly<Record<string, unknown>>;

export interface RuntimeOpsEvent {
  readonly cooldownTicks?: number;
  readonly dedupeKey: string;
  readonly id: string;
  readonly kind: string;
  readonly metrics?: RuntimeOpsEventMetricRecord;
  readonly recommendedAction?: string;
  readonly room?: string;
  readonly schema: typeof OPS_EVENT_SCHEMA;
  readonly severity: RuntimeOpsEventSeverity;
  readonly shard: string;
  readonly summary: string;
  readonly tick: number;
}

export type RuntimeRoomSummaryMetric = RuntimeOpsEventMetricRecord & {
  readonly constructionSiteCount: number;
  readonly hostileCount: number;
  readonly room: string;
  readonly spawnEnergy: string;
  readonly workerCount: number;
};

export const createRuntimeOpsEvent = (
  eventInput: Omit<RuntimeOpsEvent, 'schema'>,
): RuntimeOpsEvent => ({
  schema: OPS_EVENT_SCHEMA,
  ...eventInput,
});

export const formatRuntimeOpsEventLine = (opsEvent: RuntimeOpsEvent): string =>
  `${OPS_EVENT_PREFIX} ${JSON.stringify(opsEvent)}`;

export const createRuntimeHeartbeatOpsEvent = ({
  cpuSnapshot,
  defenseWorld,
  gameTime,
  shardName,
  spawningWorld,
  tickBudget,
}: {
  readonly cpuSnapshot: RuntimeCpuSnapshot;
  readonly defenseWorld: DefenseWorldSnapshot;
  readonly gameTime: number;
  readonly shardName: string;
  readonly spawningWorld: SpawningWorldSnapshot;
  readonly tickBudget: string;
}): RuntimeOpsEvent => {
  const roomSummaries = createRuntimeRoomSummaryMetrics(spawningWorld, defenseWorld);

  return createRuntimeOpsEvent({
    dedupeKey: `runtime_heartbeat:${shardName}`,
    id: `runtime_heartbeat:${shardName}:${gameTime}`,
    kind: 'runtime_heartbeat',
    metrics: {
      bucket: cpuSnapshot.bucket,
      budget: tickBudget,
      cpu: Number(cpuSnapshot.usedAtTickStart.toFixed(2)),
      limit: cpuSnapshot.limit,
      rooms: roomSummaries,
      tickLimit: cpuSnapshot.tickLimit,
    },
    severity: 'info',
    shard: shardName,
    summary: `runtime heartbeat for ${roomSummaries.length} room(s)`,
    tick: gameTime,
  });
};

export const createRuntimeRoomSummaryMetrics = (
  spawningWorld: SpawningWorldSnapshot,
  defenseWorld: DefenseWorldSnapshot,
): readonly RuntimeRoomSummaryMetric[] =>
  spawningWorld.rooms.map((spawningRoom) => ({
    constructionSiteCount: spawningRoom.constructionSites.length,
    hostileCount: defenseWorld.hostileCreeps.filter(
      (hostileCreep) => hostileCreep.roomName === spawningRoom.roomName,
    ).length,
    room: spawningRoom.roomName,
    spawnEnergy: formatRoomEnergy(spawningRoom.energyStructures),
    workerCount: spawningRoom.workerCreepCount,
  }));

const formatRoomEnergy = (
  energyStructures: SpawningWorldSnapshot['rooms'][number]['energyStructures'],
) => {
  const availableEnergy = energyStructures.reduce(
    (totalEnergy, energyStructure) => totalEnergy + energyStructure.availableEnergy,
    0,
  );
  const energyCapacity = energyStructures.reduce(
    (totalCapacity, energyStructure) => totalCapacity + energyStructure.energyCapacity,
    0,
  );

  return `${availableEnergy}/${energyCapacity}`;
};
