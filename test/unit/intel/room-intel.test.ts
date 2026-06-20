import { describe, expect, it } from 'vitest';

import {
  scoreRemoteMiningCandidates,
  selectExpansionReadiness,
  selectExpansionRemoteMiningCandidates,
  type ExpansionReadinessSnapshot,
  type RemoteMiningCandidateSnapshot,
  type RoomIntelWorldSnapshot,
} from '../../../src/intel/room-intel';

const createCandidate = ({
  roomName,
  ...candidate
}: Partial<RemoteMiningCandidateSnapshot> &
  Pick<RemoteMiningCandidateSnapshot, 'roomName'>): RemoteMiningCandidateSnapshot => ({
  controllerState: 'neutral',
  hostileRisk: {
    hostileCreepCount: 0,
    hostileStructureCount: 0,
    invaderCoreLevel: 0,
  },
  keeperRisk: 'none',
  roomName,
  routeDistance: 2,
  sourceCount: 2,
  ...candidate,
});

const createUnknownIntelCandidate = (roomName: string): RemoteMiningCandidateSnapshot => ({
  controllerState: 'neutral',
  hostileRisk: {
    hostileCreepCount: 0,
    hostileStructureCount: 0,
    invaderCoreLevel: 0,
  },
  keeperRisk: 'none',
  roomName,
});

const scoreCandidates = (
  candidates: readonly RemoteMiningCandidateSnapshot[],
  world: Partial<RoomIntelWorldSnapshot> = {},
) =>
  scoreRemoteMiningCandidates({
    candidates,
    homeRoomName: 'W1N1',
    unknownRoomPolicy: 'penalize',
    ...world,
  });

const createExpansionReadiness = (
  readinessSnapshot: Partial<ExpansionReadinessSnapshot> = {},
): ExpansionReadinessSnapshot => ({
  controllerLevel: 4,
  logisticsStable: true,
  monitoringStable: true,
  scoutIntelAge: 100,
  storageBuilt: true,
  storageEnergyCapacity: 1000000,
  ttlReplacementEnabled: true,
  ...readinessSnapshot,
});

describe('remote mining candidate scoring', () => {
  it('rejects already owned rooms and keeps neutral rooms ahead of them', () => {
    const rankedCandidates = scoreCandidates([
      createCandidate({
        controllerState: 'ownedByOther',
        roomName: 'W1N2',
      }),
      createCandidate({
        roomName: 'W1N3',
      }),
    ]);

    expect(rankedCandidates.map((candidate) => candidate.roomName)).toEqual(['W1N3', 'W1N2']);
    expect(rankedCandidates[0]).toMatchObject({
      accepted: true,
      controllerState: 'neutral',
      rank: 1,
      roomName: 'W1N3',
    });
    expect(rankedCandidates[1]).toMatchObject({
      accepted: false,
      controllerState: 'ownedByOther',
      rank: 2,
      roomName: 'W1N2',
      score: null,
    });
    expect(rankedCandidates[1]?.rejectionReasons).toContain('room is already owned');
  });

  it('penalizes hostile rooms and excludes source keeper rooms', () => {
    const rankedCandidates = scoreCandidates([
      createCandidate({
        hostileRisk: {
          hostileCreepCount: 2,
          hostileStructureCount: 1,
          invaderCoreLevel: 1,
        },
        roomName: 'W1N2',
      }),
      createCandidate({
        keeperRisk: 'keeperRoom',
        roomName: 'W1N3',
      }),
      createCandidate({
        roomName: 'W1N4',
      }),
    ]);

    expect(rankedCandidates.map((candidate) => candidate.roomName)).toEqual([
      'W1N4',
      'W1N2',
      'W1N3',
    ]);
    expect(rankedCandidates[0]?.score).toBeGreaterThan(
      rankedCandidates[1]?.score ?? Number.NEGATIVE_INFINITY,
    );
    expect(rankedCandidates[1]).toMatchObject({
      accepted: true,
      roomName: 'W1N2',
    });
    expect(rankedCandidates[1]?.warningReasons).toEqual(
      expect.arrayContaining(['hostile activity raises remote mining risk']),
    );
    expect(rankedCandidates[2]).toMatchObject({
      accepted: false,
      roomName: 'W1N3',
      score: null,
    });
    expect(rankedCandidates[2]?.rejectionReasons).toContain('source keeper rooms are excluded');
  });

  it('prefers more sources when distance and risk are otherwise equal', () => {
    const rankedCandidates = scoreCandidates([
      createCandidate({
        roomName: 'W1N2',
        sourceCount: 1,
      }),
      createCandidate({
        roomName: 'W1N3',
        sourceCount: 2,
      }),
    ]);

    expect(rankedCandidates.map((candidate) => candidate.roomName)).toEqual(['W1N3', 'W1N2']);
    expect(rankedCandidates[0]?.scoreBreakdown.sourceScore).toBeGreaterThan(
      rankedCandidates[1]?.scoreBreakdown.sourceScore ?? Number.NEGATIVE_INFINITY,
    );
  });

  it('uses shorter distance as the next ranking signal', () => {
    const rankedCandidates = scoreCandidates([
      createCandidate({
        roomName: 'W1N2',
        routeDistance: 4,
      }),
      createCandidate({
        roomName: 'W1N3',
        routeDistance: 2,
      }),
    ]);

    expect(rankedCandidates.map((candidate) => candidate.roomName)).toEqual(['W1N3', 'W1N2']);
    expect(rankedCandidates[0]?.score).toBeGreaterThan(
      rankedCandidates[1]?.score ?? Number.NEGATIVE_INFINITY,
    );
    expect(rankedCandidates[0]?.scoreBreakdown.distancePenalty).toBeLessThan(
      rankedCandidates[1]?.scoreBreakdown.distancePenalty ?? Number.POSITIVE_INFINITY,
    );
  });

  it('falls back to deterministic room-name ordering when scores tie', () => {
    const rankedCandidates = scoreCandidates([
      createCandidate({ roomName: 'W1N9' }),
      createCandidate({ roomName: 'W1N2' }),
      createCandidate({ roomName: 'W1N5' }),
    ]);

    expect(rankedCandidates.map((candidate) => candidate.roomName)).toEqual([
      'W1N2',
      'W1N5',
      'W1N9',
    ]);
    expect(rankedCandidates.map((candidate) => candidate.score)).toEqual([170, 170, 170]);
  });

  it('makes unknown-data policy explicit by allowing penalty or exclusion', () => {
    const penalizedCandidates = scoreCandidates([
      createUnknownIntelCandidate('W1N2'),
      createCandidate({
        roomName: 'W1N3',
      }),
    ]);

    expect(penalizedCandidates.map((candidate) => candidate.roomName)).toEqual(['W1N3', 'W1N2']);
    expect(penalizedCandidates[1]).toMatchObject({
      accepted: true,
      roomName: 'W1N2',
    });
    expect(penalizedCandidates[1]?.warningReasons).toEqual(
      expect.arrayContaining(['missing source count uses unknown-room penalty']),
    );

    const unknownControllerCandidate = scoreCandidates([
      createCandidate({
        controllerState: 'unknown',
        roomName: 'W1N4',
      }),
    ])[0];

    expect(unknownControllerCandidate?.scoreBreakdown).toMatchObject({
      controllerPenalty: 0,
      unknownPenalty: 40,
    });
    expect(unknownControllerCandidate?.warningReasons).toContain(
      'unknown controller state uses unknown-room penalty',
    );

    const excludedCandidates = scoreCandidates([createUnknownIntelCandidate('W1N2')], {
      unknownRoomPolicy: 'exclude',
    });

    expect(excludedCandidates[0]).toMatchObject({
      accepted: false,
      roomName: 'W1N2',
      score: null,
    });
    expect(excludedCandidates[0]?.rejectionReasons).toEqual(
      expect.arrayContaining(['room is missing required intel for strict scoring']),
    );
  });

  it('treats invalid numeric intel as unknown instead of producing unstable scores', () => {
    const [invalidCandidate] = scoreCandidates([
      createCandidate({
        linearDistance: Number.NaN,
        roomName: 'W1N2',
        routeDistance: Number.NaN,
        sourceCount: Number.NaN,
      }),
    ]);

    expect(invalidCandidate).toMatchObject({
      accepted: true,
      scoreBreakdown: {
        distancePenalty: 0,
        sourceScore: 0,
        unknownPenalty: 100,
        usedDistance: {
          type: 'unknown',
          value: null,
        },
      },
      sourceCount: null,
    });
  });
});

describe('expansion readiness gates', () => {
  it('blocks expansion before RCL4 storage and stable logistics prerequisites', () => {
    expect(
      selectExpansionReadiness(
        createExpansionReadiness({
          controllerLevel: 3,
          logisticsStable: false,
          monitoringStable: false,
          scoutIntelAge: 2000,
          storageBuilt: false,
          storageEnergyCapacity: 0,
          ttlReplacementEnabled: false,
        }),
      ),
    ).toEqual({
      blockerReasons: [
        'controller below RCL4',
        'storage unavailable',
        'storage has no usable energy capacity',
        'role logistics unstable',
        'ttl replacement not enabled',
        'monitoring unstable',
        'scout intel stale',
      ],
      ready: false,
    });
  });

  it('allows remote scoring consumption only after readiness is open', () => {
    const worldSnapshot: RoomIntelWorldSnapshot = {
      candidates: [createCandidate({ roomName: 'W1N2' })],
      homeRoomName: 'W1N1',
      unknownRoomPolicy: 'penalize',
    };

    expect(
      selectExpansionRemoteMiningCandidates({
        readinessSnapshot: createExpansionReadiness({ controllerLevel: 3 }),
        worldSnapshot,
      }),
    ).toEqual({
      candidates: [],
      readiness: {
        blockerReasons: ['controller below RCL4'],
        ready: false,
      },
    });

    const readySelection = selectExpansionRemoteMiningCandidates({
      readinessSnapshot: createExpansionReadiness(),
      worldSnapshot,
    });

    expect(readySelection.readiness).toEqual({
      blockerReasons: [],
      ready: true,
    });
    expect(readySelection.candidates).toHaveLength(1);
    expect(readySelection.candidates[0]).toMatchObject({
      accepted: true,
      rank: 1,
      roomName: 'W1N2',
    });
  });
});
