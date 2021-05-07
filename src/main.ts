import { ErrorMapper } from "utils/ErrorMapper";
import { Harvester } from "Roles/Harvester";
import { Initialize } from "utils/Initialize";
import { Upgrader } from "Roles/Upgrader";

let harvesterCounter = 0;
let upgraderCounter = 0;
Initialize();

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
  // console.log(`Current time is ${Game.time}`);

  // Automatically delete memory of missing creeps
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) {
      delete Memory.creeps[name];
    }
  }

  harvesterCounter = 0;
  upgraderCounter = 0;
  for (const name in Game.creeps) {
    if (Game.creeps[name].memory.role === "harvester") {
      ++harvesterCounter;
      Harvester.run(Game.creeps[name]);
    } else if (Game.creeps[name].memory.role === "upgrader") {
      ++upgraderCounter;
      Upgrader.run(Game.creeps[name]);
    }
  }

  // console.log(`The amount of harvester is ${harvesterCounter}`);
  // console.log(`The amount of upgrader is ${upgraderCounter}`);
  // Automatically spawn creeps.
  if (harvesterCounter < 3) {
    Game.spawns.Spawn0.spawnCreep([WORK, CARRY, MOVE], `Harvester${Game.time}`, {
      memory: { role: "harvester", working: false }
    });
  }
  if (upgraderCounter < 1) {
    Game.spawns.Spawn0.spawnCreep([WORK, CARRY, MOVE], `Upgrader${Game.time}`, {
      memory: { role: "upgrader", working: false }
    });
  }
});
