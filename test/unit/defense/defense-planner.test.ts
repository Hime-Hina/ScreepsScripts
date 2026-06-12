import { describe, expect, it } from 'vitest';

import { planRoomDefense, type DefenseWorldSnapshot } from '../../../src/defense/defense-planner';

const TEST_BODY_PART_CONSTANTS = {
  attack: 'attack',
  heal: 'heal',
  move: 'move',
  rangedAttack: 'ranged_attack',
  work: 'work',
};

const TEST_BODY_PART_POWERS = {
  attack: 30,
  dismantle: 50,
  heal: 12,
  rangedAttack: 10,
};

const createDefenseWorld = (
  defenseWorld: Omit<DefenseWorldSnapshot, 'bodyPartConstants' | 'bodyPartPowers' | 'roomNames'> &
    Partial<Pick<DefenseWorldSnapshot, 'roomNames'>>,
): DefenseWorldSnapshot => ({
  bodyPartConstants: TEST_BODY_PART_CONSTANTS,
  bodyPartPowers: TEST_BODY_PART_POWERS,
  roomNames: ['W1N1'],
  ...defenseWorld,
});

const createSafeModeController = (
  controllerSnapshot: Partial<DefenseWorldSnapshot['controllers'][number]> = {},
): DefenseWorldSnapshot['controllers'][number] => ({
  id: 'controller-1',
  roomName: 'W1N1',
  safeModeAvailable: 1,
  ...controllerSnapshot,
});

const createSpawnCoreStructure = (
  coreStructureSnapshot: Partial<DefenseWorldSnapshot['coreStructures'][number]> = {},
): DefenseWorldSnapshot['coreStructures'][number] => ({
  id: 'spawn-1',
  roomName: 'W1N1',
  structureType: 'spawn',
  x: 10,
  y: 10,
  ...coreStructureSnapshot,
});

describe('room defense planner', () => {
  it('keeps a harmless hostile scout from activating safe mode', () => {
    const defensePlan = planRoomDefense(
      createDefenseWorld({
        controllers: [createSafeModeController()],
        coreStructures: [createSpawnCoreStructure()],
        hostileCreeps: [
          {
            bodyParts: [
              {
                hits: 100,
                type: TEST_BODY_PART_CONSTANTS.move,
              },
            ],
            hits: 100,
            id: 'hostile-scout',
            owner: 'Invader',
            roomName: 'W1N1',
            x: 11,
            y: 10,
          },
        ],
      }),
    );

    expect(defensePlan.decisions).toEqual([]);
    expect(defensePlan.hostileClassifications).toEqual([
      {
        canDamage: false,
        canDismantle: false,
        canHeal: false,
        hostileCreepId: 'hostile-scout',
        nearCore: true,
        owner: 'Invader',
        roomName: 'W1N1',
      },
    ]);
    expect(defensePlan.roomDefenseStates).toEqual([
      {
        roomName: 'W1N1',
        type: 'roomSafe',
      },
    ]);
  });

  it('activates safe mode when an attacking hostile is near a core structure', () => {
    const defensePlan = planRoomDefense(
      createDefenseWorld({
        controllers: [createSafeModeController()],
        coreStructures: [createSpawnCoreStructure()],
        hostileCreeps: [
          {
            bodyParts: [
              {
                hits: 100,
                type: TEST_BODY_PART_CONSTANTS.attack,
              },
            ],
            hits: 100,
            id: 'hostile-attacker',
            owner: 'Invader',
            roomName: 'W1N1',
            x: 12,
            y: 10,
          },
        ],
      }),
    );

    expect(defensePlan.decisions).toEqual([
      {
        controllerId: 'controller-1',
        hostileCreepId: 'hostile-attacker',
        roomName: 'W1N1',
        type: 'activateSafeMode',
      },
    ]);
    expect(defensePlan.roomDefenseStates).toEqual([
      {
        roomName: 'W1N1',
        type: 'roomUnsafe',
      },
    ]);
  });

  it('uses captured body part power constants for hostile threat classification', () => {
    const defensePlan = planRoomDefense({
      bodyPartConstants: {
        attack: 'blade',
        heal: 'medic',
        move: 'step',
        rangedAttack: 'bow',
        work: 'tool',
      },
      bodyPartPowers: {
        attack: 0,
        dismantle: 11,
        heal: 13,
        rangedAttack: 7,
      },
      controllers: [createSafeModeController()],
      coreStructures: [],
      hostileCreeps: [
        {
          bodyParts: [{ hits: 100, type: 'blade' }],
          hits: 100,
          id: 'hostile-zero-attack',
          owner: 'Invader',
          roomName: 'W1N1',
          x: 10,
          y: 10,
        },
        {
          bodyParts: [{ hits: 100, type: 'bow' }],
          hits: 100,
          id: 'hostile-ranged',
          owner: 'Invader',
          roomName: 'W1N1',
          x: 10,
          y: 10,
        },
        {
          bodyParts: [{ hits: 100, type: 'tool' }],
          hits: 100,
          id: 'hostile-dismantler',
          owner: 'Invader',
          roomName: 'W1N1',
          x: 10,
          y: 10,
        },
        {
          bodyParts: [{ hits: 100, type: 'medic' }],
          hits: 100,
          id: 'hostile-healer',
          owner: 'Invader',
          roomName: 'W1N1',
          x: 10,
          y: 10,
        },
      ],
      roomNames: ['W1N1'],
    });

    expect(defensePlan.hostileClassifications).toEqual([
      {
        canDamage: false,
        canDismantle: false,
        canHeal: false,
        hostileCreepId: 'hostile-zero-attack',
        nearCore: false,
        owner: 'Invader',
        roomName: 'W1N1',
      },
      {
        canDamage: true,
        canDismantle: false,
        canHeal: false,
        hostileCreepId: 'hostile-ranged',
        nearCore: false,
        owner: 'Invader',
        roomName: 'W1N1',
      },
      {
        canDamage: false,
        canDismantle: true,
        canHeal: false,
        hostileCreepId: 'hostile-dismantler',
        nearCore: false,
        owner: 'Invader',
        roomName: 'W1N1',
      },
      {
        canDamage: false,
        canDismantle: false,
        canHeal: true,
        hostileCreepId: 'hostile-healer',
        nearCore: false,
        owner: 'Invader',
        roomName: 'W1N1',
      },
    ]);
  });

  it('activates safe mode for a dismantler near a core structure', () => {
    const defensePlan = planRoomDefense(
      createDefenseWorld({
        controllers: [createSafeModeController()],
        coreStructures: [createSpawnCoreStructure()],
        hostileCreeps: [
          {
            bodyParts: [
              {
                hits: 100,
                type: TEST_BODY_PART_CONSTANTS.work,
              },
            ],
            hits: 100,
            id: 'hostile-dismantler',
            owner: 'Invader',
            roomName: 'W1N1',
            x: 10,
            y: 12,
          },
        ],
      }),
    );

    expect(defensePlan.decisions).toEqual([
      {
        controllerId: 'controller-1',
        hostileCreepId: 'hostile-dismantler',
        roomName: 'W1N1',
        type: 'activateSafeMode',
      },
    ]);
  });

  it('marks a room unsafe without activating safe mode for a distant attacker', () => {
    const defensePlan = planRoomDefense(
      createDefenseWorld({
        controllers: [createSafeModeController()],
        coreStructures: [createSpawnCoreStructure()],
        hostileCreeps: [
          {
            bodyParts: [
              {
                hits: 100,
                type: TEST_BODY_PART_CONSTANTS.attack,
              },
            ],
            hits: 100,
            id: 'hostile-attacker',
            owner: 'Invader',
            roomName: 'W1N1',
            x: 30,
            y: 30,
          },
        ],
      }),
    );

    expect(defensePlan.decisions).toEqual([]);
    expect(defensePlan.roomDefenseStates).toEqual([
      {
        roomName: 'W1N1',
        type: 'roomUnsafe',
      },
    ]);
  });

  it.each([
    {
      controllerSnapshot: { safeModeAvailable: 0 },
      reason: 'no available safe mode activation',
    },
    {
      controllerSnapshot: { safeMode: 500 },
      reason: 'safe mode already active',
    },
    {
      controllerSnapshot: { safeModeCooldown: 500 },
      reason: 'safe mode is cooling down',
    },
    {
      controllerSnapshot: { upgradeBlocked: 500 },
      reason: 'controller is upgrade blocked',
    },
  ])('does not activate safe mode when $reason', ({ controllerSnapshot }) => {
    const defensePlan = planRoomDefense(
      createDefenseWorld({
        controllers: [createSafeModeController(controllerSnapshot)],
        coreStructures: [createSpawnCoreStructure()],
        hostileCreeps: [
          {
            bodyParts: [
              {
                hits: 100,
                type: TEST_BODY_PART_CONSTANTS.attack,
              },
            ],
            hits: 100,
            id: 'hostile-attacker',
            owner: 'Invader',
            roomName: 'W1N1',
            x: 12,
            y: 10,
          },
        ],
      }),
    );

    expect(defensePlan.decisions).toEqual([]);
    expect(defensePlan.roomDefenseStates).toEqual([
      {
        roomName: 'W1N1',
        type: 'roomUnsafe',
      },
    ]);
  });
});
