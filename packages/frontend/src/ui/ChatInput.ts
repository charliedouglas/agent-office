import Phaser from 'phaser';

export class ChatInput {
  private scene: Phaser.Scene;
  private container: HTMLDivElement | null = null;
  private input: HTMLInputElement | null = null;
  private onSend?: (message: string) => void;
  private onClose?: () => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  show(x: number, y: number, agentName: string, onSend: (message: string) => void, onClose: () => void) {
    this.onSend = onSend;
    this.onClose = onClose;

    // Create container
    this.container = document.createElement('div');
    this.container.style.position = 'absolute';
    this.container.style.left = `${x}px`;
    this.container.style.top = `${y}px`;
    this.container.style.zIndex = '1000';
    this.container.style.backgroundColor = 'rgba(30, 30, 40, 0.95)';
    this.container.style.border = '2px solid #4a4a6a';
    this.container.style.borderRadius = '4px';
    this.container.style.padding = '8px';
    this.container.style.fontFamily = 'monospace';
    this.container.style.fontSize = '12px';
    this.container.style.minWidth = '240px';
    this.container.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5)';

    // Header
    const header = document.createElement('div');
    header.textContent = `Message ${agentName}`;
    header.style.color = '#aaaaaa';
    header.style.fontSize = '10px';
    header.style.marginBottom = '6px';
    header.style.textTransform = 'uppercase';
    this.container.appendChild(header);

    // Input field
    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.placeholder = 'Type your message...';
    this.input.style.width = '100%';
    this.input.style.padding = '6px';
    this.input.style.backgroundColor = '#1e1e28';
    this.input.style.border = '1px solid #4a4a6a';
    this.input.style.borderRadius = '2px';
    this.input.style.color = '#ffffff';
    this.input.style.fontFamily = 'monospace';
    this.input.style.fontSize = '11px';
    this.input.style.outline = 'none';
    this.input.style.boxSizing = 'border-box';

    this.input.addEventListener('keydown', (e) => this.handleKeyDown(e));
    this.container.appendChild(this.input);

    // Hint text
    const hint = document.createElement('div');
    hint.textContent = 'Press Enter to send, ESC to cancel';
    hint.style.color = '#666666';
    hint.style.fontSize = '9px';
    hint.style.marginTop = '4px';
    this.container.appendChild(hint);

    // Add to document
    document.body.appendChild(this.container);

    // Focus input
    setTimeout(() => this.input?.focus(), 50);

    // Listen for clicks outside
    setTimeout(() => {
      document.addEventListener('click', this.handleOutsideClick);
    }, 100);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const message = this.input?.value.trim();
      if (message && this.onSend) {
        this.onSend(message);
      }
      this.hide();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this.hide();
    }
  };

  private handleOutsideClick = (e: MouseEvent) => {
    if (this.container && !this.container.contains(e.target as Node)) {
      this.hide();
    }
  };

  hide() {
    document.removeEventListener('click', this.handleOutsideClick);

    if (this.container) {
      this.container.remove();
      this.container = null;
      this.input = null;
    }

    if (this.onClose) {
      this.onClose();
    }
  }

  isVisible(): boolean {
    return this.container !== null;
  }
}
