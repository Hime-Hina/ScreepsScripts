interface ScreepsConsole {
  log(message?: unknown, ...optionalMessages: unknown[]): void;
}

declare const console: ScreepsConsole;
