import type { WSEventPayload } from '../../../../shared/types';

export class SocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectInterval: number = 3000;
  private reconnectTimer: number | null = null;
  private eventHandlers: Map<string, Set<(payload: any) => void>> = new Map();

  constructor(url: string = `ws://${window.location.hostname}:3001`) {
    this.url = url;
  }

  connect() {
    console.log('[Socket] Connecting to', this.url);

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('[Socket] Connected');
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data: WSEventPayload = JSON.parse(event.data);
          console.log('[Socket] Received:', data.type);

          // Trigger registered handlers
          const handlers = this.eventHandlers.get(data.type);
          if (handlers) {
            handlers.forEach(handler => handler(data.payload));
          }
        } catch (error) {
          console.error('[Socket] Error parsing message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[Socket] Error:', error);
      };

      this.ws.onclose = () => {
        console.log('[Socket] Disconnected, attempting to reconnect...');
        this.scheduleReconnect();
      };
    } catch (error) {
      console.error('[Socket] Connection failed:', error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (!this.reconnectTimer) {
      this.reconnectTimer = window.setTimeout(() => {
        this.connect();
      }, this.reconnectInterval);
    }
  }

  on(eventType: string, handler: (payload: any) => void) {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType)!.add(handler);
  }

  off(eventType: string, handler: (payload: any) => void) {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
