const SOCKJS_SESSION_ALPHABET = 'abcdefghijklmnopqrstuvwxyz012345';

export class ScreepsConsoleWebSocketError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ScreepsConsoleWebSocketError';
  }
}

export const openScreepsConsoleWebSocket = ({
  accountId,
  onConsoleUpdate,
  onDisconnect,
  onError,
  screepsConfig,
  WebSocketConstructor = globalThis.WebSocket,
}) => {
  if (typeof WebSocketConstructor !== 'function') {
    throw new ScreepsConsoleWebSocketError('WebSocket is not available in this Node runtime.');
  }

  let socket;
  let settled = false;

  const disconnectOnce = (reason) => {
    if (settled) {
      return;
    }

    settled = true;
    onDisconnect?.(reason);
  };

  const errorOnce = (error) => {
    if (settled) {
      return;
    }

    settled = true;
    onError?.(error);
  };

  try {
    socket = new WebSocketConstructor(buildConsoleWebSocketUrl(screepsConfig).toString());
  } catch (caughtError) {
    throw new ScreepsConsoleWebSocketError(
      `Failed to open Screeps console websocket: ${readCaughtErrorMessage(caughtError)}`,
    );
  }

  socket.onmessage = (messageEvent) => {
    const frameText =
      typeof messageEvent.data === 'string' ? messageEvent.data : String(messageEvent.data);

    let sockJsFrame;

    try {
      sockJsFrame = decodeSockJsFrame(frameText);
    } catch (caughtError) {
      errorOnce(
        new ScreepsConsoleWebSocketError(
          `Screeps console websocket returned malformed frame: ${readCaughtErrorMessage(
            caughtError,
          )}`,
        ),
      );
      return;
    }

    if (sockJsFrame.type === 'open') {
      socket.send(JSON.stringify([`auth ${screepsConfig.token}`]));
      return;
    }

    if (sockJsFrame.type === 'close') {
      disconnectOnce('sockjs-close-frame');
      return;
    }

    for (const messageText of sockJsFrame.messages) {
      if (messageText === 'auth failed') {
        errorOnce(
          new ScreepsConsoleWebSocketError('Screeps console websocket authentication failed.'),
        );
        return;
      }

      if (messageText.startsWith('auth ok')) {
        socket.send(JSON.stringify([`subscribe user:${accountId}/console`]));
        continue;
      }

      const consoleUpdate = readConsoleUpdateMessage(messageText, accountId);

      if (consoleUpdate !== null) {
        onConsoleUpdate(consoleUpdate);
      }
    }
  };

  socket.onerror = () => {
    disconnectOnce('websocket-error');
  };

  socket.onclose = () => {
    disconnectOnce('websocket-close');
  };

  return {
    close: () => {
      settled = true;
      socket.close?.();
    },
  };
};

export const buildConsoleWebSocketUrl = (screepsConfig) => {
  const socketProtocol = screepsConfig.protocol === 'https' ? 'wss' : 'ws';
  const socketUrl = new URL('/socket/', `${socketProtocol}://${screepsConfig.server}`);

  socketUrl.pathname = `/socket/${createSockJsServerId()}/${createSockJsSessionId()}/websocket`;

  return socketUrl;
};

export const decodeSockJsFrame = (frameText) => {
  if (frameText === 'o') {
    return { messages: [], type: 'open' };
  }

  if (frameText === 'h') {
    return { messages: [], type: 'heartbeat' };
  }

  if (frameText.startsWith('a')) {
    const messageTexts = JSON.parse(frameText.slice(1));

    if (
      !Array.isArray(messageTexts) ||
      !messageTexts.every((messageText) => typeof messageText === 'string')
    ) {
      throw new Error('SockJS message array did not contain only strings.');
    }

    return { messages: messageTexts, type: 'messages' };
  }

  if (frameText.startsWith('m')) {
    const messageText = JSON.parse(frameText.slice(1));

    if (typeof messageText !== 'string') {
      throw new Error('SockJS single message was not a string.');
    }

    return { messages: [messageText], type: 'messages' };
  }

  if (frameText.startsWith('c')) {
    return { messages: [], type: 'close' };
  }

  return { messages: [], type: 'unknown' };
};

export const readConsoleUpdateMessage = (messageText, accountId) => {
  let channelUpdate;

  try {
    channelUpdate = JSON.parse(messageText);
  } catch {
    return null;
  }

  if (!Array.isArray(channelUpdate) || channelUpdate.length !== 2) {
    return null;
  }

  const [channelName, consoleUpdate] = channelUpdate;
  const consoleChannelName = `user:${accountId}/console`;

  if (channelName !== consoleChannelName || !isPlainObject(consoleUpdate)) {
    return null;
  }

  const shard = readStringField(consoleUpdate, 'shard');
  const messages = consoleUpdate.messages;

  if (!isPlainObject(messages) || !Array.isArray(messages.log)) {
    return null;
  }

  return {
    lines: messages.log.filter((consoleLine) => typeof consoleLine === 'string'),
    shard,
  };
};

const createSockJsServerId = () =>
  Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');

const createSockJsSessionId = () =>
  Array.from(
    { length: 8 },
    () => SOCKJS_SESSION_ALPHABET[Math.floor(Math.random() * SOCKJS_SESSION_ALPHABET.length)],
  ).join('');

const readStringField = (record, fieldName) => {
  const fieldValue = record[fieldName];

  return typeof fieldValue === 'string' ? fieldValue : '';
};

const isPlainObject = (candidateValue) =>
  typeof candidateValue === 'object' && candidateValue !== null && !Array.isArray(candidateValue);

const readCaughtErrorMessage = (caughtError) => {
  if (caughtError instanceof Error) {
    return caughtError.message;
  }

  return String(caughtError);
};
