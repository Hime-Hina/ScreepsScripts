export const reportCommandFailure = (commandName, caughtError) => {
  const failureMessage =
    caughtError instanceof Error ? caughtError.message : 'Unknown command failure.';

  console.error(`[${commandName}] ${failureMessage}`);
  process.exitCode = 1;
};
