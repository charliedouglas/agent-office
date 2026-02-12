import { EventEmitter } from 'events';
import type { WSEventPayload } from '../../../shared/types.js';

export class BridgeEventEmitter extends EventEmitter {
  emitWSEvent(event: WSEventPayload) {
    this.emit('ws-event', event);
  }
}

export const bridgeEvents = new BridgeEventEmitter();
