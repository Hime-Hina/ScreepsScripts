import { spawn } from 'node:child_process';

export async function runCommand(commandName, commandArguments, workingDirectory) {
  await new Promise((resolve, reject) => {
    const commandOutput = [];
    const commandChild = spawn(commandName, commandArguments, {
      cwd: workingDirectory,
      shell: process.platform === 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    commandChild.stdout.on('data', (chunk) => {
      const chunkText = chunk.toString();
      commandOutput.push(chunkText);
      process.stdout.write(chunkText);
    });
    commandChild.stderr.on('data', (chunk) => {
      const chunkText = chunk.toString();
      commandOutput.push(chunkText);
      process.stderr.write(chunkText);
    });
    commandChild.on('error', reject);
    commandChild.on('exit', (exitCode) => {
      if (exitCode === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `${commandName} ${commandArguments.join(' ')} failed with exit code ${exitCode}.\n${tailCommandOutput(
            commandOutput.join(''),
          )}`,
        ),
      );
    });
  });
}

function tailCommandOutput(commandOutput) {
  return commandOutput.split(/\r?\n/u).slice(-40).join('\n');
}
