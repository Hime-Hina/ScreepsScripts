/* eslint-disable sort-imports */
import {
  ROLES_AMOUNT_PER_ROOM,
  ROLES_BODIES
} from "Constants";
import { Initialize, FindTargetsToRepair, FindTargetsToFill } from "utils/Initialize";
import { ErrorMapper } from "utils/ErrorMapper";
import { GetSourceIdForHarvester } from "Roles/Harvester";
import { GetDestIdForRepairer } from "Roles/Repairer";
import { GlobalAPI } from "utils/GlobalAPI";
import { GetDestIdForCarrier } from "Roles/Carrier";
import { Tower } from "Roles/Tower";
import { GetSentryId } from "Roles/Defender";

GlobalAPI();
Initialize();

export const loop = ErrorMapper.wrapLoop(() => {
  for (const roomName in Memory.rooms) {
    // Automatically delete memory of missing creeps
    for (const creepName in Memory.creeps) {
      if (!(creepName in Game.creeps)) {
        if (Memory.creeps[creepName].role === "harvester" && Memory.creeps[creepName].sourceId) {
          ++Memory.rooms[roomName].sources[Memory.creeps[creepName].sourceId as keyof ISourcesInfo].activePosAmt;
        } else if (Memory.creeps[creepName].role === "defender" && Memory.creeps[creepName].sentryId) {
          Memory.rooms[roomName].sentries[Memory.creeps[creepName].sentryId as Id<StructureRampart>] = true;
        }
        --global.roleCounters[Memory.creeps[creepName].role as Roles];
        delete Memory.creeps[creepName];
      }
    }
    if (Game.time % 200 === 0) {
      Memory.rooms[roomName].targetsToRepair = FindTargetsToRepair(Game.rooms[roomName]);
    }
    if (Object.keys(Memory.rooms[roomName].targetsToFill).length <= 1) {
      Memory.rooms[roomName].targetsToFill = FindTargetsToFill(Game.rooms[roomName]);
    }

    Memory.rooms[roomName].towers.forEach((id) => {
      const tower = Game.getObjectById(id);
      if (tower) Tower.run(tower);
    });
  }

  _.forIn(Game.creeps, (v, k, o) => {
    if (v.memory.role) global.rolesRun[v.memory.role as Roles](v);
    else console.log(`${v.name}<${v.id}>, whose memory.role was not assigned!`);
  });

  if (!Game.spawns.Spawn0.spawning) {
    // Automatically spawn creeps.
    _.forIn(global.roleCounters, (v, k, o) => {
      if (k && v < ROLES_AMOUNT_PER_ROOM[k as Roles]) {
        const newCreepName = k[0].toUpperCase() + k.slice(1);
        const canBeSpawned
          = Game.spawns.Spawn0.spawnCreep(
            ROLES_BODIES[k as Roles].bodies,
            `${newCreepName}${Game.time}`, { dryRun: true }
          ) === OK;
        if (canBeSpawned) {
          const args: { memory: CreepMemory } = {
            memory: { role: k as Roles, working: false, }
          };
          if (k === "harvester") args.memory.sourceId = GetSourceIdForHarvester(Game.spawns.Spawn0.room);
          else if (k === "repairer") args.memory.destId = GetDestIdForRepairer(Game.spawns.Spawn0.room);
          else if (k === "carrier") args.memory.destId = GetDestIdForCarrier(Game.spawns.Spawn0.room);
          else if (k === "defender") args.memory.sentryId = GetSentryId(Game.spawns.Spawn0.room);
          ++global.roleCounters[k as Roles];
          Game.spawns.Spawn0.spawnCreep(ROLES_BODIES[k as Roles].bodies, `${newCreepName}${Game.time}`, args);
          return false;
        } else return true;
      } else return true;
    });
  } else {
    Memory.rooms[Game.spawns.Spawn0.room.name].targetsToFill = FindTargetsToFill(Game.spawns.Spawn0.room);
    global.InitCarriersMem(Game.spawns.Spawn0.room);
    if (Game.spawns.Spawn0.spawning.needTime === Game.spawns.Spawn0.spawning.remainingTime + 1) {
      console.log(`Spawning ${Game.spawns.Spawn0.spawning.name}...`);
    }
  }
});
