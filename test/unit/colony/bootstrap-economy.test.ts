import { describe, expect, it } from 'vitest';

import {
  classifyBootstrapControllerDowngradeState,
  classifyBootstrapWorkerPopulation,
  classifySpawnExtensionEnergyState,
  selectBootstrapWorkerDemand,
  selectRoomConstructionEligibility,
  type BootstrapWorkerDemandInput,
} from '../../../src/colony/bootstrap-economy';

const SAFE_CONTROLLER_STATE = {
  roomName: 'W1N1',
  type: 'controllerDowngradeSafe',
} as const;

const WARNING_CONTROLLER_STATE = {
  roomName: 'W1N1',
  type: 'controllerDowngradeWarning',
} as const;

const STABLE_ENERGY_STATE = {
  roomName: 'W1N1',
  type: 'spawnExtensionEnergyStable',
} as const;

const UNSTABLE_ENERGY_STATE = {
  roomName: 'W1N1',
  type: 'spawnExtensionEnergyUnstable',
} as const;

const STABLE_POPULATION_STATE = {
  roomName: 'W1N1',
  type: 'survivalWorkerPopulationStable',
} as const;

const SAFE_ROOM_DEFENSE_STATE = {
  roomName: 'W1N1',
  type: 'roomSafe',
} as const;

const UNSAFE_ROOM_DEFENSE_STATE = {
  roomName: 'W1N1',
  type: 'roomUnsafe',
} as const;

const createDemandInput = (
  overrides: Partial<BootstrapWorkerDemandInput> = {},
): BootstrapWorkerDemandInput => ({
  constructionBacklogEnergy: 0,
  controllerDowngradeState: SAFE_CONTROLLER_STATE,
  controllerLevel: 2,
  energyState: STABLE_ENERGY_STATE,
  plannedWorkerWorkParts: 2,
  sourceCount: 2,
  workerCreepCount: 4,
  workerCreepWorkParts: 8,
  ...overrides,
});

describe('bootstrap economy contract', () => {
  it('classifies controller downgrade safety from project policy thresholds', () => {
    expect(
      classifyBootstrapControllerDowngradeState({
        roomName: 'W1N1',
        ticksToDowngrade: 4999,
      }),
    ).toEqual({
      roomName: 'W1N1',
      type: 'controllerDowngradeCritical',
    });
    expect(
      classifyBootstrapControllerDowngradeState({
        roomName: 'W1N1',
        ticksToDowngrade: 7999,
      }),
    ).toEqual(WARNING_CONTROLLER_STATE);
    expect(
      classifyBootstrapControllerDowngradeState({
        roomName: 'W1N1',
        ticksToDowngrade: 8999,
      }),
    ).toEqual({
      roomName: 'W1N1',
      type: 'controllerDowngradeRecovering',
    });
    expect(
      classifyBootstrapControllerDowngradeState({
        roomName: 'W1N1',
        ticksToDowngrade: 9000,
      }),
    ).toEqual(SAFE_CONTROLLER_STATE);
  });

  it('classifies spawn and extension refill stability', () => {
    expect(
      classifySpawnExtensionEnergyState({
        energyStructures: [
          {
            availableEnergy: 300,
            energyCapacity: 300,
          },
          {
            availableEnergy: 50,
            energyCapacity: 50,
          },
        ],
        roomName: 'W1N1',
      }),
    ).toEqual(STABLE_ENERGY_STATE);

    expect(
      classifySpawnExtensionEnergyState({
        energyStructures: [
          {
            availableEnergy: 250,
            energyCapacity: 300,
          },
        ],
        roomName: 'W1N1',
      }),
    ).toEqual(UNSTABLE_ENERGY_STATE);
  });

  it('requires the survival floor before construction is eligible', () => {
    expect(
      classifyBootstrapWorkerPopulation({
        roomName: 'W1N1',
        workerCreepCount: 2,
      }),
    ).toEqual({
      roomName: 'W1N1',
      type: 'survivalWorkerPopulationUnstable',
    });

    expect(
      selectRoomConstructionEligibility({
        controllerDowngradeState: SAFE_CONTROLLER_STATE,
        energyState: STABLE_ENERGY_STATE,
        roomDefenseState: SAFE_ROOM_DEFENSE_STATE,
        roomName: 'W1N1',
        workerPopulationState: STABLE_POPULATION_STATE,
      }),
    ).toEqual({
      roomName: 'W1N1',
      type: 'constructionAllowed',
    });
  });

  it('defers construction when controller safety is unsafe but permits safe refill recovery', () => {
    expect(
      selectRoomConstructionEligibility({
        controllerDowngradeState: WARNING_CONTROLLER_STATE,
        energyState: STABLE_ENERGY_STATE,
        roomDefenseState: SAFE_ROOM_DEFENSE_STATE,
        roomName: 'W1N1',
        workerPopulationState: STABLE_POPULATION_STATE,
      }),
    ).toEqual({
      roomName: 'W1N1',
      type: 'constructionDeferredForSurvival',
    });

    expect(
      selectRoomConstructionEligibility({
        controllerDowngradeState: SAFE_CONTROLLER_STATE,
        energyState: UNSTABLE_ENERGY_STATE,
        roomDefenseState: SAFE_ROOM_DEFENSE_STATE,
        roomName: 'W1N1',
        workerPopulationState: STABLE_POPULATION_STATE,
      }),
    ).toEqual({
      roomName: 'W1N1',
      type: 'constructionAllowed',
    });
  });

  it('defers construction when room defense is unsafe', () => {
    expect(
      selectRoomConstructionEligibility({
        controllerDowngradeState: SAFE_CONTROLLER_STATE,
        energyState: STABLE_ENERGY_STATE,
        roomDefenseState: UNSAFE_ROOM_DEFENSE_STATE,
        roomName: 'W1N1',
        workerPopulationState: STABLE_POPULATION_STATE,
      }),
    ).toEqual({
      roomName: 'W1N1',
      type: 'constructionDeferredForDefense',
    });
  });

  it('selects source-throughput RCL2 development demand when the room economy is safe', () => {
    expect(selectBootstrapWorkerDemand(createDemandInput())).toEqual({
      targetWorkerCount: 10,
      type: 'rcl2DevelopmentWorkerDemand',
    });
  });

  it('keeps safe RCL3 development demand visible when one extension is not refilled', () => {
    expect(
      selectBootstrapWorkerDemand(
        createDemandInput({
          constructionBacklogEnergy: 12776,
          controllerLevel: 3,
          energyState: UNSTABLE_ENERGY_STATE,
          workerCreepCount: 5,
          workerCreepWorkParts: 10,
        }),
      ),
    ).toEqual({
      targetWorkerCount: 10,
      type: 'rcl2DevelopmentWorkerDemand',
    });
  });

  it('keeps safe RCL2 development demand near the cap without spawn-availability gating', () => {
    expect(
      selectBootstrapWorkerDemand(
        createDemandInput({
          constructionBacklogEnergy: 0,
          workerCreepCount: 9,
        }),
      ),
    ).toEqual({
      targetWorkerCount: 10,
      type: 'rcl2DevelopmentWorkerDemand',
    });
  });

  it('uses construction backlog to demand more than the survival floor when source demand is lower', () => {
    expect(
      selectBootstrapWorkerDemand(
        createDemandInput({
          constructionBacklogEnergy: 33509,
          sourceCount: 0,
          workerCreepCount: 5,
          workerCreepWorkParts: 10,
        }),
      ),
    ).toEqual({
      targetWorkerCount: 6,
      type: 'rcl2DevelopmentWorkerDemand',
    });
  });

  it('uses planned body WORK parts when estimating source saturation demand', () => {
    expect(
      selectBootstrapWorkerDemand(
        createDemandInput({
          plannedWorkerWorkParts: 2,
          sourceCount: 1,
          workerCreepCount: 4,
          workerCreepWorkParts: 8,
        }),
      ),
    ).toEqual({
      targetWorkerCount: 6,
      type: 'rcl2DevelopmentWorkerDemand',
    });

    expect(
      selectBootstrapWorkerDemand(
        createDemandInput({
          plannedWorkerWorkParts: 1,
          sourceCount: 1,
          workerCreepCount: 4,
          workerCreepWorkParts: 4,
        }),
      ),
    ).toEqual({
      targetWorkerCount: 10,
      type: 'rcl2DevelopmentWorkerDemand',
    });
  });

  it('keeps worker demand at the survival floor when expansion safeguards are not met', () => {
    expect(
      selectBootstrapWorkerDemand(
        createDemandInput({
          controllerDowngradeState: WARNING_CONTROLLER_STATE,
        }),
      ),
    ).toEqual({
      targetWorkerCount: 3,
      type: 'survivalWorkerDemand',
    });

    expect(
      selectBootstrapWorkerDemand(
        createDemandInput({
          controllerLevel: 1,
        }),
      ),
    ).toEqual({
      targetWorkerCount: 3,
      type: 'survivalWorkerDemand',
    });

    expect(
      selectBootstrapWorkerDemand(
        createDemandInput({
          workerCreepCount: 2,
          workerCreepWorkParts: 2,
        }),
      ),
    ).toEqual({
      targetWorkerCount: 3,
      type: 'survivalWorkerDemand',
    });
  });
});
