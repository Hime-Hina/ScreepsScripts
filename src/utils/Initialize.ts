/* eslint-disable prettier/prettier */
import { roleNames } from "Constants";

const dirX = [-1, 1, 0, 0, -1, 1, -1, 1];
const dirY = [0, 0, -1, 1, -1, 1, 1, -1];

function ReturnAdjacentMiningPos(source: Source): MiningPos[] {
  const ret: MiningPos[] = [];
  let tmpPos: MiningPos;

  for (let i = 0; i < 8; ++i) {
    tmpPos = { x: source.pos.x + dirX[i], y: source.pos.y + dirY[i], isActive: true };
    if (
      0 <= tmpPos.x && tmpPos.x < 50
      && 0 <= tmpPos.y && tmpPos.y < 50
      && source.room.getTerrain().get(source.pos.x, source.pos.y) === 0 // Plain terrain
    ) {
      ret.push(tmpPos);
    }
  }
  return ret;
}

function ReturnSourcesInfo(source: Source): SourceInfo {
  return {
    id: source.id,
    miningPos: ReturnAdjacentMiningPos(source)
  };
}

export function Initialize(): void {
  global.roomsInfo = {};
  // Store the information of each room's sources.
  for (const roomName in Game.rooms) {
    global.roomsInfo[roomName] = {
      creepsInfo: {
        harvesters: [],
        upgraders: [],
        builder: [],
        hostileCreeps: Game.rooms[roomName].find(FIND_HOSTILE_CREEPS)
      },
      sources: Game.rooms[roomName].find(FIND_SOURCES),
      spawns: Game.rooms[roomName].find(FIND_MY_SPAWNS),
      flags: Game.rooms[roomName].find(FIND_FLAGS)
    };
    for (const creep of Game.rooms[roomName].find(FIND_MY_CREEPS)) {
      if (typeof creep.memory.role === "undefined") {
        console.log(`${creep.name}<${creep.id}>, whose role was not assigned!`);
      } else {
        for (const roleName of roleNames) {
          if (creep.memory.role === roleName) {
            global.roomsInfo[roomName].creepsInfo[roleName]!.push(creep);
          }
        }
      }
    }

    if (typeof Memory.rooms[roomName].sources === "undefined") {
      Memory.rooms[roomName].sources = _.map(global.roomsInfo[roomName].sources, ReturnSourcesInfo);
    }

    // Memory.rooms[roomName].myCreeps = {};
    // for (const creep of global.roomsInfo[roomName].myCreeps) {
    //   Memory.rooms[roomName].myCreeps[creep.id] = { name: creep.name, role: creep.memory.role };
    // }
    // Memory.rooms[roomName].spawns = global.roomsInfo[roomName].spawns;
  }
}
