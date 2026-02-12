import type { Message } from '../../../../shared/types';

export class MessageSystem {
  private messageQueue: Message[] = [];

  addMessage(message: Message) {
    this.messageQueue.push(message);
  }

  getNextMessage(): Message | null {
    return this.messageQueue.shift() || null;
  }

  hasMessages(): boolean {
    return this.messageQueue.length > 0;
  }
}
