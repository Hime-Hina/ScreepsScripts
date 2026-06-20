export interface TowerSnapshot {
  readonly energy: number;
  readonly energyCapacity: number;
  readonly id: string;
  readonly roomName: string;
  readonly x: number;
  readonly y: number;
}

export interface TowerHostileCreepSnapshot {
  readonly hits: number;
  readonly id: string;
  readonly roomName: string;
  readonly x: number;
  readonly y: number;
}

export interface TowerOwnedCreepSnapshot {
  readonly hits: number;
  readonly hitsMax: number;
  readonly name: string;
  readonly roomName: string;
  readonly x: number;
  readonly y: number;
}

export type TowerRepairStructureType = 'container' | 'extension' | 'road' | 'spawn' | 'tower';

export interface TowerRepairTargetSnapshot {
  readonly hits: number;
  readonly hitsMax: number;
  readonly id: string;
  readonly roomName: string;
  readonly structureType: TowerRepairStructureType;
  readonly x: number;
  readonly y: number;
}

export interface TowerWorldSnapshot {
  readonly hostileCreeps: readonly TowerHostileCreepSnapshot[];
  readonly ownedCreeps: readonly TowerOwnedCreepSnapshot[];
  readonly repairTargets: readonly TowerRepairTargetSnapshot[];
  readonly towerEnergyCost: number;
  readonly towers: readonly TowerSnapshot[];
}

export interface AttackHostileCreepDecision {
  readonly hostileCreepId: string;
  readonly roomName: string;
  readonly towerId: string;
  readonly type: 'attackHostileCreep';
}

export interface HealOwnedCreepDecision {
  readonly creepName: string;
  readonly roomName: string;
  readonly towerId: string;
  readonly type: 'healOwnedCreep';
}

export interface TowerRepairStructureDecision {
  readonly roomName: string;
  readonly structureId: string;
  readonly towerId: string;
  readonly type: 'repairStructure';
}

export type TowerActionDecision =
  | AttackHostileCreepDecision
  | HealOwnedCreepDecision
  | TowerRepairStructureDecision;

const TOWER_REPAIR_ENERGY_RESERVE = 500;

export const planTowerActions = (towerWorld: TowerWorldSnapshot): readonly TowerActionDecision[] =>
  [...towerWorld.towers]
    .sort((leftTower, rightTower) => leftTower.id.localeCompare(rightTower.id))
    .flatMap((tower) => selectTowerAction(towerWorld, tower));

const selectTowerAction = (
  towerWorld: TowerWorldSnapshot,
  tower: TowerSnapshot,
): readonly [TowerActionDecision] | readonly [] => {
  if (tower.energy < towerWorld.towerEnergyCost) {
    return [];
  }

  const hostileCreep = selectHostileAttackTarget(towerWorld, tower);

  if (hostileCreep !== undefined) {
    return [
      {
        hostileCreepId: hostileCreep.id,
        roomName: tower.roomName,
        towerId: tower.id,
        type: 'attackHostileCreep',
      },
    ];
  }

  const woundedCreep = selectHealTarget(towerWorld, tower);

  if (woundedCreep !== undefined) {
    return [
      {
        creepName: woundedCreep.name,
        roomName: tower.roomName,
        towerId: tower.id,
        type: 'healOwnedCreep',
      },
    ];
  }

  if (tower.energy < TOWER_REPAIR_ENERGY_RESERVE) {
    return [];
  }

  const repairTarget = selectConservativeRepairTarget(towerWorld, tower);

  if (repairTarget === undefined) {
    return [];
  }

  return [
    {
      roomName: tower.roomName,
      structureId: repairTarget.id,
      towerId: tower.id,
      type: 'repairStructure',
    },
  ];
};

const selectHostileAttackTarget = (
  towerWorld: TowerWorldSnapshot,
  tower: TowerSnapshot,
): TowerHostileCreepSnapshot | undefined =>
  towerWorld.hostileCreeps
    .filter((hostileCreep) => hostileCreep.roomName === tower.roomName)
    .sort((leftHostile, rightHostile) =>
      compareByRangeHitsThenId(leftHostile, rightHostile, tower),
    )[0];

const selectHealTarget = (
  towerWorld: TowerWorldSnapshot,
  tower: TowerSnapshot,
): TowerOwnedCreepSnapshot | undefined =>
  towerWorld.ownedCreeps
    .filter(
      (ownedCreep) =>
        ownedCreep.roomName === tower.roomName && ownedCreep.hits < ownedCreep.hitsMax,
    )
    .sort((leftCreep, rightCreep) =>
      compareByHitsRatioRangeThenName(leftCreep, rightCreep, tower),
    )[0];

const selectConservativeRepairTarget = (
  towerWorld: TowerWorldSnapshot,
  tower: TowerSnapshot,
): TowerRepairTargetSnapshot | undefined =>
  towerWorld.repairTargets
    .filter(
      (repairTarget) =>
        repairTarget.roomName === tower.roomName &&
        isConservativeTowerRepairTarget(repairTarget) &&
        repairTarget.hits < repairTarget.hitsMax,
    )
    .sort((leftTarget, rightTarget) =>
      compareByHitsRatioRangeThenId(leftTarget, rightTarget, tower),
    )[0];

const isConservativeTowerRepairTarget = (repairTarget: TowerRepairTargetSnapshot): boolean => {
  switch (repairTarget.structureType) {
    case 'extension':
    case 'spawn':
    case 'tower':
      return true;

    case 'container':
    case 'road':
      return false;
  }
};

const compareByRangeHitsThenId = (
  leftTarget: TowerHostileCreepSnapshot,
  rightTarget: TowerHostileCreepSnapshot,
  tower: TowerSnapshot,
): number => {
  const leftRange = measureRange(tower, leftTarget);
  const rightRange = measureRange(tower, rightTarget);

  if (leftRange !== rightRange) {
    return leftRange - rightRange;
  }

  if (leftTarget.hits !== rightTarget.hits) {
    return leftTarget.hits - rightTarget.hits;
  }

  return leftTarget.id.localeCompare(rightTarget.id);
};

const compareByHitsRatioRangeThenName = (
  leftTarget: TowerOwnedCreepSnapshot,
  rightTarget: TowerOwnedCreepSnapshot,
  tower: TowerSnapshot,
): number => {
  const leftHitsRatio = leftTarget.hits / leftTarget.hitsMax;
  const rightHitsRatio = rightTarget.hits / rightTarget.hitsMax;

  if (leftHitsRatio !== rightHitsRatio) {
    return leftHitsRatio - rightHitsRatio;
  }

  const leftRange = measureRange(tower, leftTarget);
  const rightRange = measureRange(tower, rightTarget);

  if (leftRange !== rightRange) {
    return leftRange - rightRange;
  }

  return leftTarget.name.localeCompare(rightTarget.name);
};

const compareByHitsRatioRangeThenId = (
  leftTarget: TowerRepairTargetSnapshot,
  rightTarget: TowerRepairTargetSnapshot,
  tower: TowerSnapshot,
): number => {
  const leftHitsRatio = leftTarget.hits / leftTarget.hitsMax;
  const rightHitsRatio = rightTarget.hits / rightTarget.hitsMax;

  if (leftHitsRatio !== rightHitsRatio) {
    return leftHitsRatio - rightHitsRatio;
  }

  const leftRange = measureRange(tower, leftTarget);
  const rightRange = measureRange(tower, rightTarget);

  if (leftRange !== rightRange) {
    return leftRange - rightRange;
  }

  return leftTarget.id.localeCompare(rightTarget.id);
};

const measureRange = (
  leftPosition: { readonly x: number; readonly y: number },
  rightPosition: { readonly x: number; readonly y: number },
): number =>
  Math.max(Math.abs(leftPosition.x - rightPosition.x), Math.abs(leftPosition.y - rightPosition.y));
