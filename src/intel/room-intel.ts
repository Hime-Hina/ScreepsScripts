export type UnknownRoomPolicy = 'exclude' | 'penalize';

export type RemoteMiningControllerState =
  | 'neutral'
  | 'reservedByMe'
  | 'reservedByOther'
  | 'ownedByMe'
  | 'ownedByOther'
  | 'noController'
  | 'unknown';

export type RemoteMiningKeeperRisk = 'none' | 'keeperRoom' | 'unknown';

export interface RemoteMiningHostileRiskSnapshot {
  readonly hostileCreepCount?: number;
  readonly hostileStructureCount?: number;
  readonly invaderCoreLevel?: number;
}

export interface RemoteMiningCandidateSnapshot {
  readonly controllerState: RemoteMiningControllerState;
  readonly hostileRisk?: RemoteMiningHostileRiskSnapshot;
  readonly keeperRisk: RemoteMiningKeeperRisk;
  readonly linearDistance?: number;
  readonly roomName: string;
  readonly routeDistance?: number;
  readonly sourceCount?: number;
}

export interface RoomIntelWorldSnapshot {
  readonly candidates: readonly RemoteMiningCandidateSnapshot[];
  readonly homeRoomName: string;
  readonly unknownRoomPolicy?: UnknownRoomPolicy;
}

export interface ExpansionReadinessSnapshot {
  readonly controllerLevel: number;
  readonly logisticsStable: boolean;
  readonly maxScoutIntelAge?: number;
  readonly monitoringStable: boolean;
  readonly scoutIntelAge: number;
  readonly storageBuilt: boolean;
  readonly storageEnergyCapacity: number;
  readonly ttlReplacementEnabled: boolean;
}

export interface ExpansionReadiness {
  readonly blockerReasons: readonly string[];
  readonly ready: boolean;
}

export interface ExpansionRemoteMiningSelection {
  readonly candidates: readonly RemoteMiningCandidateScore[];
  readonly readiness: ExpansionReadiness;
}

export interface RemoteMiningCandidateScoreBreakdown {
  readonly controllerPenalty: number;
  readonly distancePenalty: number;
  readonly hostilePenalty: number;
  readonly keeperPenalty: number;
  readonly sourceScore: number;
  readonly totalScore: number | null;
  readonly unknownPenalty: number;
  readonly usedDistance: {
    readonly type: 'linear' | 'route' | 'unknown';
    readonly value: number | null;
  };
}

export interface RemoteMiningCandidateScore {
  readonly accepted: boolean;
  readonly controllerState: RemoteMiningControllerState;
  readonly homeRoomName: string;
  readonly rank: number;
  readonly rejectionReasons: readonly string[];
  readonly roomName: string;
  readonly score: number | null;
  readonly scoreBreakdown: RemoteMiningCandidateScoreBreakdown;
  readonly sourceCount: number | null;
  readonly warningReasons: readonly string[];
}

const SOURCE_SCORE_PER_SOURCE = 100;
const DISTANCE_PENALTY_PER_ROOM = 15;
const RESERVED_BY_ME_PENALTY = 15;
const RESERVED_BY_OTHER_PENALTY = 120;
const UNKNOWN_CONTROLLER_PENALTY = 40;
const UNKNOWN_SOURCE_COUNT_PENALTY = 70;
const UNKNOWN_DISTANCE_PENALTY = 30;
const UNKNOWN_KEEPER_RISK_PENALTY = 40;
const HOSTILE_CREEP_PENALTY = 35;
const HOSTILE_STRUCTURE_PENALTY = 50;
const INVADER_CORE_LEVEL_PENALTY = 25;
const KEEPER_ROOM_EXCLUSION_PENALTY = 200;
const DEFAULT_MAX_SCOUT_INTEL_AGE = 1500;

export const selectExpansionReadiness = (
  readinessSnapshot: ExpansionReadinessSnapshot,
): ExpansionReadiness => {
  const blockerReasons: string[] = [];
  const maxScoutIntelAge = readinessSnapshot.maxScoutIntelAge ?? DEFAULT_MAX_SCOUT_INTEL_AGE;

  if (readinessSnapshot.controllerLevel < 4) {
    blockerReasons.push('controller below RCL4');
  }

  if (!readinessSnapshot.storageBuilt) {
    blockerReasons.push('storage unavailable');
  }

  if (readinessSnapshot.storageEnergyCapacity <= 0) {
    blockerReasons.push('storage has no usable energy capacity');
  }

  if (!readinessSnapshot.logisticsStable) {
    blockerReasons.push('role logistics unstable');
  }

  if (!readinessSnapshot.ttlReplacementEnabled) {
    blockerReasons.push('ttl replacement not enabled');
  }

  if (!readinessSnapshot.monitoringStable) {
    blockerReasons.push('monitoring unstable');
  }

  if (readinessSnapshot.scoutIntelAge > maxScoutIntelAge) {
    blockerReasons.push('scout intel stale');
  }

  return {
    blockerReasons,
    ready: blockerReasons.length === 0,
  };
};

export const selectExpansionRemoteMiningCandidates = ({
  readinessSnapshot,
  worldSnapshot,
}: {
  readonly readinessSnapshot: ExpansionReadinessSnapshot;
  readonly worldSnapshot: RoomIntelWorldSnapshot;
}): ExpansionRemoteMiningSelection => {
  const readiness = selectExpansionReadiness(readinessSnapshot);

  return {
    candidates: readiness.ready ? scoreRemoteMiningCandidates(worldSnapshot) : [],
    readiness,
  };
};

export const scoreRemoteMiningCandidates = (
  worldSnapshot: RoomIntelWorldSnapshot,
): readonly RemoteMiningCandidateScore[] => {
  const unknownRoomPolicy = worldSnapshot.unknownRoomPolicy ?? 'penalize';

  return worldSnapshot.candidates
    .map((candidate) =>
      scoreRemoteMiningCandidate(worldSnapshot.homeRoomName, candidate, unknownRoomPolicy),
    )
    .sort(compareRemoteMiningCandidates)
    .map((candidate, index) => ({
      ...candidate,
      rank: index + 1,
    }));
};

const scoreRemoteMiningCandidate = (
  homeRoomName: string,
  candidate: RemoteMiningCandidateSnapshot,
  unknownRoomPolicy: UnknownRoomPolicy,
): RemoteMiningCandidateScore => {
  const rejectionReasons: string[] = [];
  const warningReasons: string[] = [];
  const sourceCount = readNonNegativeIntegerOrNull(candidate.sourceCount);
  const usedDistance = selectDistance(candidate);
  const hostileRisk = candidate.hostileRisk ?? {};
  let unknownPenalty = 0;

  if (candidate.roomName === homeRoomName) {
    rejectionReasons.push('room is already the home room');
  }

  if (candidate.controllerState === 'ownedByMe' || candidate.controllerState === 'ownedByOther') {
    rejectionReasons.push('room is already owned');
  }

  if (candidate.controllerState === 'noController') {
    rejectionReasons.push('room has no controller');
  }

  if (candidate.keeperRisk === 'keeperRoom') {
    rejectionReasons.push('source keeper rooms are excluded');
  }

  if (sourceCount === null) {
    if (unknownRoomPolicy === 'exclude') {
      rejectionReasons.push('room is missing required intel for strict scoring');
    } else {
      unknownPenalty += UNKNOWN_SOURCE_COUNT_PENALTY;
      warningReasons.push('missing source count uses unknown-room penalty');
    }
  }

  if (usedDistance.type === 'unknown') {
    if (unknownRoomPolicy === 'exclude') {
      rejectionReasons.push('room is missing required intel for strict scoring');
    } else {
      unknownPenalty += UNKNOWN_DISTANCE_PENALTY;
      warningReasons.push('missing distance uses unknown-room penalty');
    }
  }

  if (candidate.controllerState === 'unknown') {
    if (unknownRoomPolicy === 'exclude') {
      rejectionReasons.push('room is missing required intel for strict scoring');
    } else {
      unknownPenalty += UNKNOWN_CONTROLLER_PENALTY;
      warningReasons.push('unknown controller state uses unknown-room penalty');
    }
  }

  if (candidate.keeperRisk === 'unknown') {
    if (unknownRoomPolicy === 'exclude') {
      rejectionReasons.push('room is missing required intel for strict scoring');
    } else {
      unknownPenalty += UNKNOWN_KEEPER_RISK_PENALTY;
      warningReasons.push('unknown keeper risk uses unknown-room penalty');
    }
  }

  const sourceScore = (sourceCount ?? 0) * SOURCE_SCORE_PER_SOURCE;
  const distancePenalty = (usedDistance.value ?? 0) * DISTANCE_PENALTY_PER_ROOM;
  const controllerPenalty = readControllerPenalty(candidate.controllerState);
  const hostilePenalty =
    readNonNegativeInteger(hostileRisk.hostileCreepCount) * HOSTILE_CREEP_PENALTY +
    readNonNegativeInteger(hostileRisk.hostileStructureCount) * HOSTILE_STRUCTURE_PENALTY +
    readNonNegativeInteger(hostileRisk.invaderCoreLevel) * INVADER_CORE_LEVEL_PENALTY;
  const keeperPenalty = candidate.keeperRisk === 'keeperRoom' ? KEEPER_ROOM_EXCLUSION_PENALTY : 0;

  if (hostilePenalty > 0) {
    warningReasons.push('hostile activity raises remote mining risk');
  }

  const accepted = rejectionReasons.length === 0;
  const totalScore = accepted
    ? sourceScore -
      distancePenalty -
      controllerPenalty -
      hostilePenalty -
      keeperPenalty -
      unknownPenalty
    : null;

  return {
    accepted,
    controllerState: candidate.controllerState,
    homeRoomName,
    rank: 0,
    rejectionReasons: [...new Set(rejectionReasons)].sort(),
    roomName: candidate.roomName,
    score: totalScore,
    scoreBreakdown: {
      controllerPenalty,
      distancePenalty,
      hostilePenalty,
      keeperPenalty,
      sourceScore,
      totalScore,
      unknownPenalty,
      usedDistance,
    },
    sourceCount,
    warningReasons: [...new Set(warningReasons)].sort(),
  };
};

const selectDistance = (
  candidate: RemoteMiningCandidateSnapshot,
): RemoteMiningCandidateScoreBreakdown['usedDistance'] => {
  if (typeof candidate.routeDistance === 'number' && Number.isFinite(candidate.routeDistance)) {
    return {
      type: 'route',
      value: Math.max(0, candidate.routeDistance),
    };
  }

  if (typeof candidate.linearDistance === 'number' && Number.isFinite(candidate.linearDistance)) {
    return {
      type: 'linear',
      value: Math.max(0, candidate.linearDistance),
    };
  }

  return {
    type: 'unknown',
    value: null,
  };
};

const readControllerPenalty = (controllerState: RemoteMiningControllerState): number => {
  switch (controllerState) {
    case 'neutral':
    case 'ownedByMe':
    case 'ownedByOther':
    case 'noController':
      return 0;
    case 'reservedByMe':
      return RESERVED_BY_ME_PENALTY;
    case 'reservedByOther':
      return RESERVED_BY_OTHER_PENALTY;
    case 'unknown':
      return 0;
  }
};

const readNonNegativeIntegerOrNull = (value: number | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : null;

const readNonNegativeInteger = (value: number | undefined): number =>
  readNonNegativeIntegerOrNull(value) ?? 0;

const compareRemoteMiningCandidates = (
  leftCandidate: RemoteMiningCandidateScore,
  rightCandidate: RemoteMiningCandidateScore,
): number => {
  if (leftCandidate.accepted !== rightCandidate.accepted) {
    return leftCandidate.accepted ? -1 : 1;
  }

  const leftScore = leftCandidate.score ?? Number.NEGATIVE_INFINITY;
  const rightScore = rightCandidate.score ?? Number.NEGATIVE_INFINITY;

  if (leftScore !== rightScore) {
    return rightScore - leftScore;
  }

  return leftCandidate.roomName.localeCompare(rightCandidate.roomName);
};
