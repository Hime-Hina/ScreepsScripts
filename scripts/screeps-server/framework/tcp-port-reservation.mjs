import net from 'node:net';

export async function reserveTcpPort() {
  const server = net.createServer();

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();

  if (!address || typeof address === 'string') {
    throw new Error('Could not reserve a TCP port for the local Screeps server.');
  }

  await new Promise((resolve, reject) => {
    server.close((closeError) => {
      if (closeError) {
        reject(closeError);
      } else {
        resolve();
      }
    });
  });

  return address.port;
}
