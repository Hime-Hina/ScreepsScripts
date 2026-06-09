import {
  readScreepsMemoryState,
  writeScreepsMemoryState,
  type ScreepsMemoryState,
} from '../memory/screeps-memory';
import type { SpawningWorldSnapshot } from '../spawning/spawn-decision';

export interface ScreepsTickIO {
  readonly gameTime: number;
  readCpuUsed(): number;
  readSpawningWorld(): SpawningWorldSnapshot;
  writeConsoleLine(message: string): void;
}

export interface ScreepsTickRuntime extends ScreepsTickIO {
  readMemoryState(): ScreepsMemoryState;
  writeMemoryState(memoryState: ScreepsMemoryState): void;
}

export const captureScreepsTickRuntime = (): ScreepsTickRuntime => ({
  gameTime: Game.time,
  readCpuUsed: () => Game.cpu.getUsed(),
  readMemoryState: () => readScreepsMemoryState(Memory),
  readSpawningWorld: captureSpawningWorld,
  writeMemoryState: (memoryState) => writeScreepsMemoryState(Memory, memoryState),
  writeConsoleLine: (message) => console.log(message),
});

const captureSpawningWorld = (): SpawningWorldSnapshot => ({
  creepCount: Object.keys(Game.creeps).length,
  spawns: Object.values(Game.spawns).map((spawn) => ({
    availableEnergy: spawn.store.getUsedCapacity(RESOURCE_ENERGY),
    isSpawning: spawn.spawning !== null,
    name: spawn.name,
  })),
});
