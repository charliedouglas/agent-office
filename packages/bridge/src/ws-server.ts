import { WebSocketServer } from 'ws';
import type { WebSocket } from 'ws';
import { bridgeEvents } from './events.js';
import type { WSEventPayload } from '../../../shared/types.js';

let lastInitPayload: WSEventPayload | null = null;

export function startWSServer(port: number = 3001) {
  const wss = new WebSocketServer({ port, host: '0.0.0.0' });
  const clients = new Set<WebSocket>();

  console.log(`[WS Server] Running on ws://0.0.0.0:${port}`);

  wss.on('connection', (ws) => {
    console.log('[WS Server] Client connected');
    clients.add(ws);

    // Send cached init state to new clients
    if (lastInitPayload) {
      ws.send(JSON.stringify(lastInitPayload));
      console.log('[WS Server] Sent cached init to new client');
    }

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
    // Cache init events for late joiners
    if (event.type === 'init') {
      lastInitPayload = event;
    }

    const message = JSON.stringify(event);
    clients.forEach((client) => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
      }
    });
  });

  return wss;
}
