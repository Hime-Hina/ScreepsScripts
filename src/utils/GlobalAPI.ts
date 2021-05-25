import { Initialize } from "utils/Initialize";
import { Carrier, GetDestIdForCarrier } from "Roles/Carrier";
import { GetSourceIdForHarvester, Harvester } from "Roles/Harvester";
import { GetDestIdForRepairer, Repairer } from "Roles/Repairer";
import { Builder } from "Roles/Builder";
import { Upgrader } from "Roles/Upgrader";
import { Defender, GetSentryId } from "Roles/Defender";

export function GlobalAPI(): void {
  global.GetStructToRepair = (roomName: string, idx: number): Structure | null => {
    return Game.getObjectById(Object.keys(Memory.rooms[roomName].targetsToRepair)[idx] as Id<Structure>);
  };
  global.roleCounters = {
    harvester: 0,
    upgrader: 0,
    builder: 0,
    repairer: 0,
    carrier: 0,
    worker: 0,
    defender: 0,
  };
  global.rolesRun = {
    harvester: Harvester.run,
    upgrader: Upgrader.run,
    builder: Builder.run,
    repairer: Repairer.run,
    carrier: Carrier.run,
    worker: (creep: Creep) => console.log("Worker.run is unimplemented!"),
    defender: Defender.run,
  };
  global.GlobalInit = Initialize;
  global.InitRolesMem = (room: Room): void => {
    _.map(room.find(FIND_MY_CREEPS), crp => {
      if (crp.memory.role === "harvester") crp.memory.sourceId = GetSourceIdForHarvester(crp.room);
      else if (crp.memory.role === "carrier") crp.memory.destId = GetDestIdForCarrier(crp.room);
      else if (crp.memory.role === "repairer") crp.memory.destId = GetDestIdForRepairer(crp.room);
      else if (crp.memory.role === "defender") crp.memory.sentryId = GetSentryId(crp.room);
    });
  };
  global.InitCarriersMem = (room: Room): void => {
    _.map(room.find(FIND_MY_CREEPS, { filter: crp => crp.memory.role === "carrier" }),
      crp => { crp.memory.destId = GetDestIdForCarrier(crp.room); });
  };
  global.CreepConfig = {
    Add(configName: string, specificRole: Roles, args: IWorkingData): boolean {
      if (!Memory.creepConfigs) Memory.creepConfigs = {};
      if (Memory.creepConfigs[configName]) return false;

      Memory.creepConfigs[configName] = { role: specificRole, args };
      return true;
    },
    Get(configName: string): ICreepConfig | undefined {
      if (!Memory.creepConfigs) return undefined;
      return Memory.creepConfigs[configName];
    },
    Remove(configName: string): true {
      delete Memory.creepConfigs[configName];
      return true;
    },
    ChangeConfigArgs(configName: string, newArgs: IWorkingData): boolean {
      if (!Memory.creepConfigs || !Memory.creepConfigs[configName]) return false;
      Memory.creepConfigs[configName].args = newArgs;
      return true;
    }
  };
  global.FindTargetToRepair = (room: Room): Structure | null => {
    const targets = room.find(FIND_STRUCTURES, {
      filter: struct => struct.structureType !== STRUCTURE_WALL && struct.hits < struct.hitsMax
    }).sort((a, b) => a.hits / a.hitsMax - b.hits / b.hitsMax);
    if (targets.length > 0) return Game.getObjectById(targets[0].id as Id<Structure>);
    else return null;
  };
}
