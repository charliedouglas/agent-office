import { WebSocketServer } from 'ws';
import type { WebSocket } from 'ws';
import { bridgeEvents } from './events.js';
import type { WSEventPayload } from '../../../shared/types.js';

export function startWSServer(port: number = 3001) {
  const wss = new WebSocketServer({ port });
  const clients = new Set<WebSocket>();

  console.log(`[WS Server] Running on ws://localhost:${port}`);

  wss.on('connection', (ws) => {
    console.log('[WS Server] Client connected');
    clients.add(ws);

    ws.on('close', () => {
      console.log('[WS Server] Client disconnected');
      clients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('[WS Server] Client error:', error);
      clients.delete(ws);
    });
  });

  // Listen for events and broadcast to all clients
  bridgeEvents.on('ws-event', (event: WSEventPayload) => {
    const message = JSON.stringify(event);
    clients.forEach((client) => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
      }
    });
  });

  return wss;
}
