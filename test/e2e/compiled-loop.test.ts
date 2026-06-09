import { readFileSync } from 'node:fs';
import vm from 'node:vm';

import { describe, expect, it } from 'vitest';

type ScreepsLoop = () => void;

const isScreepsLoop = (candidateLoop: unknown): candidateLoop is ScreepsLoop =>
  typeof candidateLoop === 'function';

describe('compiled Screeps bundle', () => {
  it('exports and executes loop from dist/main.js', () => {
    const compiledSource = readFileSync('dist/main.js', 'utf8');
    const commonjsExports: { loop?: unknown } = {};
    const consoleLines: string[] = [];
    const scriptContext = {
      Game: {
        cpu: {
          getUsed: () => 2.5,
        },
        time: 99,
      },
      console: {
        log: (message: string) => consoleLines.push(message),
      },
      exports: commonjsExports,
      module: {
        exports: commonjsExports,
      },
    };

    new vm.Script(compiledSource).runInNewContext(scriptContext);

    expect(isScreepsLoop(commonjsExports.loop)).toBe(true);

    if (!isScreepsLoop(commonjsExports.loop)) {
      throw new Error('Compiled Screeps bundle did not export a callable loop.');
    }

    commonjsExports.loop();

    expect(consoleLines).toEqual(['[tick 99] cpu=2.50']);
  });
});
