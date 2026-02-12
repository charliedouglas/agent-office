import Phaser from 'phaser';
import type { AgentState } from '../../../../shared/types';

interface ActivityEntry {
  timestamp: string;
  emoji: string;
  text: string;
  color: string;
}

export class ActivityFeed {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.DOMElement;
  private toggleButton: Phaser.GameObjects.Container;
  private entries: ActivityEntry[] = [];
  private maxEntries = 20;
  private isVisible = true;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Create the feed container
    this.container = this.createFeedContainer();

    // Create toggle button
    this.toggleButton = this.createToggleButton();
  }

  private createFeedContainer(): Phaser.GameObjects.DOMElement {
    const feedHTML = `
      <div id="activity-feed" style="
        position: fixed;
        top: 10px;
        right: 10px;
        width: 320px;
        max-height: 500px;
        background: rgba(34, 34, 51, 0.92);
        border: 2px solid rgba(68, 68, 102, 0.8);
        border-radius: 8px;
        padding: 12px;
        font-family: 'Courier New', monospace;
        font-size: 11px;
        color: #e0e0e0;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        overflow-y: auto;
        overflow-x: hidden;
        z-index: 1000;
      ">
        <div style="
          font-weight: bold;
          font-size: 12px;
          margin-bottom: 8px;
          padding-bottom: 6px;
          border-bottom: 1px solid rgba(68, 68, 102, 0.6);
          color: #a0a0ff;
        ">📋 ACTIVITY FEED</div>
        <div id="activity-entries" style="
          display: flex;
          flex-direction: column-reverse;
        "></div>
      </div>
    `;

    const element = this.scene.add.dom(0, 0).createFromHTML(feedHTML);
    element.setOrigin(0, 0);
    element.setScrollFactor(0);
    element.setDepth(999);

    return element;
  }

  private createToggleButton(): Phaser.GameObjects.Container {
    const x = this.scene.scale.width - 350;
    const y = 20;

    const container = this.scene.add.container(x, y);
    container.setDepth(1000);
    container.setScrollFactor(0);

    // Background
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x222233, 0.9);
    bg.fillRoundedRect(-16, -16, 32, 32, 4);
    bg.lineStyle(2, 0x444466, 0.8);
    bg.strokeRoundedRect(-16, -16, 32, 32, 4);

    // Icon
    const icon = this.scene.add.text(0, 0, '📋', {
      fontSize: '18px',
    });
    icon.setOrigin(0.5, 0.5);

    container.add([bg, icon]);

    // Make interactive
    const hitArea = new Phaser.Geom.Rectangle(-16, -16, 32, 32);
    container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

    container.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x333344, 0.95);
      bg.fillRoundedRect(-16, -16, 32, 32, 4);
      bg.lineStyle(2, 0x5555ff, 1);
      bg.strokeRoundedRect(-16, -16, 32, 32, 4);
    });

    container.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x222233, 0.9);
      bg.fillRoundedRect(-16, -16, 32, 32, 4);
      bg.lineStyle(2, 0x444466, 0.8);
      bg.strokeRoundedRect(-16, -16, 32, 32, 4);
    });

    container.on('pointerdown', () => {
      this.toggle();
    });

    return container;
  }

  private getTimestamp(): string {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  private getEventEmoji(type: string): string {
    const emojiMap: Record<string, string> = {
      'typing': '⌨️',
      'walking': '🚶',
      'talking': '💬',
      'idle': '💤',
      'message': '💬',
      'completed': '✅',
      'in_progress': '🔧',
      'pending': '⏳',
    };
    return emojiMap[type] || '📌';
  }

  private getEventColor(type: string): string {
    const colorMap: Record<string, string> = {
      'typing': '#60a5fa',      // blue
      'walking': '#a78bfa',     // purple
      'talking': '#fbbf24',     // yellow
      'idle': '#94a3b8',        // gray
      'message': '#fbbf24',     // yellow
      'completed': '#4ade80',   // green
      'in_progress': '#fb923c', // orange
      'pending': '#94a3b8',     // gray
    };
    return colorMap[type] || '#e0e0e0';
  }

  public addEntry(emoji: string, text: string, color: string) {
    const entry: ActivityEntry = {
      timestamp: this.getTimestamp(),
      emoji,
      text,
      color,
    };

    this.entries.push(entry);

    // Limit entries
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }

    this.render();
  }

  public addStateChange(agentName: string, state: AgentState, details?: string) {
    const emoji = this.getEventEmoji(state);
    const color = this.getEventColor(state);

    let text = `${agentName}`;
    if (state === 'typing') {
      text += details ? ` editing ${details}` : ' typing...';
    } else if (state === 'walking') {
      text += ' walking';
    } else if (state === 'talking') {
      text += ' talking';
    } else if (state === 'idle') {
      text += ' idle';
    }

    this.addEntry(emoji, text, color);
  }

  public addMessage(fromName: string, toName: string, messagePreview: string) {
    const emoji = this.getEventEmoji('message');
    const color = this.getEventColor('message');
    const preview = messagePreview.length > 30
      ? messagePreview.substring(0, 30) + '...'
      : messagePreview;
    this.addEntry(emoji, `${fromName} → ${toName}: ${preview}`, color);
  }

  public addMovement(agentName: string, toAgentName?: string) {
    const emoji = this.getEventEmoji('walking');
    const color = this.getEventColor('walking');
    const text = toAgentName
      ? `${agentName} walking to ${toAgentName}'s desk`
      : `${agentName} walking`;
    this.addEntry(emoji, text, color);
  }

  public addTaskUpdate(taskDescription: string, status: string, agentName?: string) {
    const emoji = this.getEventEmoji(status);
    const color = this.getEventColor(status);

    let text = '';
    const shortDesc = taskDescription.length > 25
      ? taskDescription.substring(0, 25) + '...'
      : taskDescription;

    if (status === 'completed') {
      text = agentName
        ? `${agentName} completed: ${shortDesc}`
        : `Task completed: ${shortDesc}`;
    } else if (status === 'in_progress') {
      text = agentName
        ? `${agentName} started: ${shortDesc}`
        : `Task started: ${shortDesc}`;
    } else {
      text = `Task ${status}: ${shortDesc}`;
    }

    this.addEntry(emoji, text, color);
  }

  private render() {
    const entriesContainer = document.getElementById('activity-entries');
    if (!entriesContainer) return;

    // Clear existing entries
    entriesContainer.innerHTML = '';

    // Add entries (already in reverse order due to flex-direction: column-reverse)
    this.entries.forEach(entry => {
      const entryDiv = document.createElement('div');
      entryDiv.style.cssText = `
        padding: 6px 8px;
        margin-bottom: 4px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 4px;
        border-left: 3px solid ${entry.color};
        color: ${entry.color};
        word-wrap: break-word;
        animation: slideIn 0.2s ease-out;
      `;
      entryDiv.innerHTML = `
        <span style="color: #888; font-size: 9px;">[${entry.timestamp}]</span>
        <span style="font-size: 13px;">${entry.emoji}</span>
        <span style="color: #e0e0e0; font-size: 11px;">${entry.text}</span>
      `;
      entriesContainer.appendChild(entryDiv);
    });

    // Add animation styles if not already present
    if (!document.getElementById('activity-feed-styles')) {
      const style = document.createElement('style');
      style.id = 'activity-feed-styles';
      style.textContent = `
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        #activity-feed::-webkit-scrollbar {
          width: 6px;
        }
        #activity-feed::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 3px;
        }
        #activity-feed::-webkit-scrollbar-thumb {
          background: rgba(68, 68, 102, 0.6);
          border-radius: 3px;
        }
        #activity-feed::-webkit-scrollbar-thumb:hover {
          background: rgba(85, 85, 255, 0.8);
        }
      `;
      document.head.appendChild(style);
    }
  }

  public toggle() {
    this.isVisible = !this.isVisible;
    const feed = document.getElementById('activity-feed');
    if (feed) {
      feed.style.display = this.isVisible ? 'block' : 'none';
    }
  }

  public show() {
    this.isVisible = true;
    const feed = document.getElementById('activity-feed');
    if (feed) {
      feed.style.display = 'block';
    }
  }

  public hide() {
    this.isVisible = false;
    const feed = document.getElementById('activity-feed');
    if (feed) {
      feed.style.display = 'none';
    }
  }
}
