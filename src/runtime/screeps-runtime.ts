export interface ScreepsTickRuntime {
  readonly gameTime: number;
  readCpuUsed(): number;
  writeConsoleLine(message: string): void;
}

export const captureScreepsTickRuntime = (): ScreepsTickRuntime => ({
  gameTime: Game.time,
  readCpuUsed: () => Game.cpu.getUsed(),
  writeConsoleLine: (message) => console.log(message),
});
