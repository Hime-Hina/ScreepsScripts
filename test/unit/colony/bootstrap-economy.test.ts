import { describe, expect, it } from 'vitest';

import {
  classifyBootstrapControllerDowngradeState,
  classifyBootstrapWorkerPopulation,
  classifySpawnExtensionEnergyState,
  selectBootstrapWorkerDemand,
  selectRoomConstructionEligibility,
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

const AVAILABLE_SPAWN_STATE = {
  roomName: 'W1N1',
  type: 'spawnAvailable',
} as const;

const SPAWNING_SPAWN_STATE = {
  roomName: 'W1N1',
  type: 'spawnAlreadySpawning',
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

  it('defers construction when controller safety or refill stability is unsafe', () => {
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
      type: 'constructionDeferredForSurvival',
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

  it('selects RCL2 construction demand only when the room economy is safe', () => {
    expect(
      selectBootstrapWorkerDemand({
        constructionBacklogEnergy: 3000,
        controllerDowngradeState: SAFE_CONTROLLER_STATE,
        controllerLevel: 2,
        energyState: STABLE_ENERGY_STATE,
        spawnAvailability: AVAILABLE_SPAWN_STATE,
        workerCreepCount: 4,
      }),
    ).toEqual({
      targetWorkerCount: 5,
      type: 'rcl2ConstructionWorkerDemand',
    });

    expect(
      selectBootstrapWorkerDemand({
        constructionBacklogEnergy: 3000,
        controllerDowngradeState: SAFE_CONTROLLER_STATE,
        controllerLevel: 2,
        energyState: STABLE_ENERGY_STATE,
        spawnAvailability: SPAWNING_SPAWN_STATE,
        workerCreepCount: 4,
      }),
    ).toEqual({
      targetWorkerCount: 3,
      type: 'survivalWorkerDemand',
    });
  });
});
