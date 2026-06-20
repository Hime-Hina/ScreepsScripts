export interface DefenseBodyPartConstants {
  readonly attack: string;
  readonly heal: string;
  readonly move: string;
  readonly rangedAttack: string;
  readonly work: string;
}

export interface DefenseBodyPartPowers {
  readonly attack: number;
  readonly dismantle: number;
  readonly heal: number;
  readonly rangedAttack: number;
}

export interface DefenseHostileBodyPartSnapshot {
  readonly hits: number;
  readonly type: string;
}

export interface DefenseHostileCreepSnapshot {
  readonly bodyParts: readonly DefenseHostileBodyPartSnapshot[];
  readonly hits: number;
  readonly id: string;
  readonly owner: string;
  readonly roomName: string;
  readonly x: number;
  readonly y: number;
}

export type DefenseCoreStructureType = 'extension' | 'spawn' | 'storage' | 'tower';

export interface DefenseCoreStructureSnapshot {
  readonly id: string;
  readonly roomName: string;
  readonly structureType: DefenseCoreStructureType;
  readonly x: number;
  readonly y: number;
}

export interface DefenseControllerSnapshot {
  readonly id: string;
  readonly roomName: string;
  readonly safeMode?: number;
  readonly safeModeAvailable: number;
  readonly safeModeCooldown?: number;
  readonly upgradeBlocked?: number;
}

export interface DefenseWorldSnapshot {
  readonly bodyPartConstants: DefenseBodyPartConstants;
  readonly bodyPartPowers: DefenseBodyPartPowers;
  readonly controllers: readonly DefenseControllerSnapshot[];
  readonly coreStructures: readonly DefenseCoreStructureSnapshot[];
  readonly hostileCreeps: readonly DefenseHostileCreepSnapshot[];
  readonly roomNames: readonly string[];
}

export interface DefenseHostileClassification {
  readonly canDamage: boolean;
  readonly canDismantle: boolean;
  readonly canHeal: boolean;
  readonly hostileCreepId: string;
  readonly nearCore: boolean;
  readonly owner: string;
  readonly roomName: string;
}

export type RoomDefenseState =
  | {
      readonly roomName: string;
      readonly type: 'roomSafe';
    }
  | {
      readonly roomName: string;
      readonly type: 'roomUnsafe';
    };

export interface ActivateSafeModeDecision {
  readonly controllerId: string;
  readonly hostileCreepId: string;
  readonly roomName: string;
  readonly type: 'activateSafeMode';
}

export type DefenseDecision = ActivateSafeModeDecision;

export interface RoomDefensePlan {
  readonly decisions: readonly DefenseDecision[];
  readonly hostileClassifications: readonly DefenseHostileClassification[];
  readonly roomDefenseStates: readonly RoomDefenseState[];
}

const CORE_THREAT_RANGE = 3;

export const planRoomDefense = (defenseWorld: DefenseWorldSnapshot): RoomDefensePlan => {
  const hostileClassifications = defenseWorld.hostileCreeps.map((hostileCreep) =>
    classifyHostileCreep(defenseWorld, hostileCreep),
  );

  return {
    decisions: selectSafeModeDecisions(defenseWorld, hostileClassifications),
    hostileClassifications,
    roomDefenseStates: selectRoomDefenseStates(defenseWorld, hostileClassifications),
  };
};

const classifyHostileCreep = (
  defenseWorld: DefenseWorldSnapshot,
  hostileCreep: DefenseHostileCreepSnapshot,
): DefenseHostileClassification => {
  const attackPower = sumActiveBodyPartPower(
    hostileCreep,
    defenseWorld.bodyPartConstants.attack,
    defenseWorld.bodyPartPowers.attack,
  );
  const rangedAttackPower = sumActiveBodyPartPower(
    hostileCreep,
    defenseWorld.bodyPartConstants.rangedAttack,
    defenseWorld.bodyPartPowers.rangedAttack,
  );
  const dismantlePower = sumActiveBodyPartPower(
    hostileCreep,
    defenseWorld.bodyPartConstants.work,
    defenseWorld.bodyPartPowers.dismantle,
  );
  const healPower = sumActiveBodyPartPower(
    hostileCreep,
    defenseWorld.bodyPartConstants.heal,
    defenseWorld.bodyPartPowers.heal,
  );

  return {
    canDamage: attackPower + rangedAttackPower > 0,
    canDismantle: dismantlePower > 0,
    canHeal: healPower > 0,
    hostileCreepId: hostileCreep.id,
    nearCore: isNearCoreStructure(defenseWorld, hostileCreep),
    owner: hostileCreep.owner,
    roomName: hostileCreep.roomName,
  };
};

const sumActiveBodyPartPower = (
  hostileCreep: DefenseHostileCreepSnapshot,
  bodyPartType: string,
  bodyPartPower: number,
): number =>
  hostileCreep.bodyParts.filter((bodyPart) => bodyPart.hits > 0 && bodyPart.type === bodyPartType)
    .length * bodyPartPower;

const isNearCoreStructure = (
  defenseWorld: DefenseWorldSnapshot,
  hostileCreep: DefenseHostileCreepSnapshot,
): boolean =>
  defenseWorld.coreStructures.some(
    (coreStructure) =>
      coreStructure.roomName === hostileCreep.roomName &&
      chebyshevRange(coreStructure, hostileCreep) <= CORE_THREAT_RANGE,
  );

const chebyshevRange = (
  leftPosition: { readonly x: number; readonly y: number },
  rightPosition: { readonly x: number; readonly y: number },
): number =>
  Math.max(Math.abs(leftPosition.x - rightPosition.x), Math.abs(leftPosition.y - rightPosition.y));

const selectRoomDefenseStates = (
  defenseWorld: DefenseWorldSnapshot,
  hostileClassifications: readonly DefenseHostileClassification[],
): readonly RoomDefenseState[] =>
  selectDefenseRoomNames(defenseWorld).map((roomName) => {
    const hasDangerousHostile = hostileClassifications.some(
      (hostileClassification) =>
        hostileClassification.roomName === roomName &&
        hostileClassification.nearCore &&
        (hostileClassification.canDamage || hostileClassification.canDismantle),
    );

    if (hasDangerousHostile) {
      return {
        roomName,
        type: 'roomUnsafe',
      };
    }

    return {
      roomName,
      type: 'roomSafe',
    };
  });

const selectSafeModeDecisions = (
  defenseWorld: DefenseWorldSnapshot,
  hostileClassifications: readonly DefenseHostileClassification[],
): readonly DefenseDecision[] => {
  const safeModeDecision = [...defenseWorld.controllers]
    .sort((leftController, rightController) =>
      leftController.roomName.localeCompare(rightController.roomName),
    )
    .flatMap((controller) => {
      if (!canActivateSafeMode(controller)) {
        return [];
      }

      const hostileCoreThreat = hostileClassifications
        .filter(
          (hostileClassification) =>
            hostileClassification.roomName === controller.roomName &&
            hostileClassification.nearCore &&
            (hostileClassification.canDamage || hostileClassification.canDismantle),
        )
        .sort((leftHostile, rightHostile) =>
          leftHostile.hostileCreepId.localeCompare(rightHostile.hostileCreepId),
        )[0];

      if (hostileCoreThreat === undefined) {
        return [];
      }

      const activateSafeModeDecision: ActivateSafeModeDecision = {
        controllerId: controller.id,
        hostileCreepId: hostileCoreThreat.hostileCreepId,
        roomName: controller.roomName,
        type: 'activateSafeMode',
      };

      return [activateSafeModeDecision];
    })[0];

  return safeModeDecision === undefined ? [] : [safeModeDecision];
};

const canActivateSafeMode = (controller: DefenseControllerSnapshot): boolean =>
  controller.safeModeAvailable > 0 &&
  (controller.safeMode ?? 0) <= 0 &&
  (controller.safeModeCooldown ?? 0) <= 0 &&
  (controller.upgradeBlocked ?? 0) <= 0;

const selectDefenseRoomNames = (defenseWorld: DefenseWorldSnapshot): readonly string[] =>
  Array.from(
    new Set([
      ...defenseWorld.controllers.map((controller) => controller.roomName),
      ...defenseWorld.coreStructures.map((coreStructure) => coreStructure.roomName),
      ...defenseWorld.hostileCreeps.map((hostileCreep) => hostileCreep.roomName),
      ...defenseWorld.roomNames,
    ]),
  ).sort();
