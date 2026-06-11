import path from 'node:path';

export const OFFICIAL_SERVER_VERSION = '4.3.0';

export const OFFLINE_STEAM_WEB_API_KEY = 'screeps-server-test';
export const LOCAL_STORAGE_HOST = '127.0.0.1';

export const LOCAL_SERVER_ROOT = path.resolve('.screeps/server');
export const SERVER_PACKAGE_ROOT = path.join(LOCAL_SERVER_ROOT, 'package');
export const RUNS_ROOT = path.join(LOCAL_SERVER_ROOT, 'runs');

export const READY_WATCHDOG_MS = 90_000;
export const PLAYER_HEARTBEAT_WATCHDOG_MS = 90_000;
export const TEARDOWN_WATCHDOG_MS = 10_000;
export const OFFICIAL_CHILD_RESTART_DELAY_MS = 3_600_000;

export const ALLOWED_BUILD_PACKAGES = [
  '@screeps/driver',
  'es5-ext',
  'isolated-vm',
  'screeps',
  'uglifyjs-webpack-plugin',
];
