#!/usr/bin/env node
import { readCliSelection } from './cases/case-registry.mjs';
import { runScreepsServerSelection } from './cases/suite-runner.mjs';

try {
  const caseSelection = readCliSelection(process.argv.slice(2));
  await runScreepsServerSelection(caseSelection);
} catch (runError) {
  console.error(runError && runError.stack ? runError.stack : runError);
  process.exitCode = 1;
}
