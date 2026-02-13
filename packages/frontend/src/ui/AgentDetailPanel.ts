import type Phaser from 'phaser';
import type { Agent as AgentData } from '../../../../shared/types';

// Team color palette (same as OfficeScene)
const PALETTE = [0x3b82f6, 0xa855f7, 0x22c55e, 0xf59e0b, 0xef4444, 0x06b6d4, 0xec4899, 0x84cc16];
const teamColorMap = new Map<string, number>();
let colorIdx = 0;
function getTeamColor(team: string): number {
  if (!teamColorMap.has(team)) {
    teamColorMap.set(team, PALETTE[colorIdx % PALETTE.length]);
    colorIdx++;
  }
  return teamColorMap.get(team)!;
}

export class AgentDetailPanel {
  private scene: Phaser.Scene;
  private container: HTMLDivElement | null = null;
  private agentData: AgentData | null = null;
  private onClose: (() => void) | null = null;
  private onSendMessage: ((message: string) => void) | null = null;
  private onShowToast: ((name: string, message: string, type: 'success' | 'info' | 'warning' | 'error') => void) | null = null;
  private updateInterval: number | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  show(
    agentData: AgentData,
    onSendMessage: (message: string) => void,
    onClose: () => void,
    onShowToast?: (name: string, message: string, type: 'success' | 'info' | 'warning' | 'error') => void
  ) {
    this.agentData = agentData;
    this.onSendMessage = onSendMessage;
    this.onClose = onClose;
    this.onShowToast = onShowToast || null;

    // Remove existing panel if present
    this.hide();

    // Create DOM element
    this.container = document.createElement('div');
    this.container.id = 'agent-detail-panel';
    this.container.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 400px;
      max-height: 80vh;
      background: #1a1a2e;
      border: 3px solid ${this.getColorString(agentData.team)};
      border-radius: 4px;
      padding: 16px;
      font-family: 'Courier New', monospace;
      color: #e0e0e0;
      z-index: 10000;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
      overflow-y: auto;
    `;

    // Build panel content
    this.renderContent();

    // Add to DOM
    document.body.appendChild(this.container);

    // Start live updates (refresh every second)
    this.updateInterval = window.setInterval(() => {
      this.renderContent();
    }, 1000);

    // Click outside to close
    setTimeout(() => {
      document.addEventListener('click', this.handleOutsideClick);
    }, 100);
  }

  hide() {
    if (this.updateInterval !== null) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    if (this.container) {
      document.removeEventListener('click', this.handleOutsideClick);
      this.container.remove();
      this.container = null;
    }

    this.agentData = null;
    this.onSendMessage = null;
    this.onClose = null;
    this.onShowToast = null;
  }

  isVisible(): boolean {
    return this.container !== null;
  }

  updateAgentData(newData: AgentData) {
    this.agentData = newData;
    if (this.container) {
      this.renderContent();
    }
  }

  private renderContent() {
    if (!this.container || !this.agentData) return;

    const agent = this.agentData;
    const teamColor = this.getColorString(agent.team);

    // Calculate uptime
    const uptimeStr = this.getUptimeString(agent.spawnTime);

    this.container.innerHTML = `
      <div style="margin-bottom: 16px; border-bottom: 2px solid ${teamColor}; padding-bottom: 12px;">
        <h2 style="margin: 0 0 8px 0; font-size: 18px; color: ${teamColor};">
          ${this.escapeHtml(agent.name)}
        </h2>
        <div style="font-size: 12px; color: #999;">
          <div>Team: <span style="color: ${teamColor};">${this.escapeHtml(agent.team)}</span></div>
          <div>Role: ${this.escapeHtml(agent.role)}</div>
          <div>State: ${this.getStateEmoji(agent.state)} ${this.escapeHtml(agent.state)}</div>
          <div>Uptime: ${uptimeStr}</div>
        </div>
      </div>

      ${agent.currentTask ? `
        <div style="margin-bottom: 12px;">
          <div style="font-size: 11px; color: #777; text-transform: uppercase; margin-bottom: 4px;">Current Task</div>
          <div style="font-size: 12px; padding: 8px; background: #0f0f1a; border-left: 3px solid ${teamColor};">
            ${this.escapeHtml(agent.currentTask)}
          </div>
        </div>
      ` : ''}

      ${agent.plan && agent.plan.length > 0 ? `
        <div style="margin-bottom: 12px;">
          <div style="font-size: 11px; color: #777; text-transform: uppercase; margin-bottom: 4px;">Plan Progress</div>
          <div style="font-size: 11px;">
            ${agent.plan.map(item => {
              const icon = item.status === 'completed' ? '✓' :
                          item.status === 'in_progress' ? '⟳' : '○';
              const color = item.status === 'completed' ? '#22c55e' :
                           item.status === 'in_progress' ? '#f59e0b' : '#555';
              return `
                <div style="padding: 4px 0; display: flex; align-items: start; gap: 6px;">
                  <span style="color: ${color}; font-size: 14px; min-width: 16px;">${icon}</span>
                  <span style="color: ${color};">${this.escapeHtml(item.text)}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}

      ${agent.currentFile ? `
        <div style="margin-bottom: 12px;">
          <div style="font-size: 11px; color: #777; text-transform: uppercase; margin-bottom: 4px;">Current File</div>
          <div style="font-size: 11px; padding: 6px; background: #0f0f1a; font-family: monospace; color: #06b6d4;">
            ${this.escapeHtml(agent.currentFile)}
          </div>
        </div>
      ` : ''}

      <div style="margin-bottom: 12px;">
        <button
          id="kill-agent-btn"
          style="
            width: 100%;
            padding: 10px;
            background: #ef4444;
            color: white;
            border: 2px solid #dc2626;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            font-weight: bold;
            cursor: pointer;
            text-transform: uppercase;
            transition: all 0.2s;
          "
          onmouseover="this.style.background='#dc2626'"
          onmouseout="this.style.background='#ef4444'"
        >
          ⚠️ Kill Agent
        </button>
      </div>

      <div style="border-top: 2px solid ${teamColor}; padding-top: 12px;">
        <div style="font-size: 11px; color: #777; text-transform: uppercase; margin-bottom: 6px;">Send Message</div>
        <div style="display: flex; gap: 8px;">
          <input
            id="agent-chat-input"
            type="text"
            placeholder="Type a message..."
            style="
              flex: 1;
              padding: 8px;
              background: #0f0f1a;
              border: 2px solid ${teamColor};
              border-radius: 4px;
              color: #e0e0e0;
              font-family: 'Courier New', monospace;
              font-size: 11px;
            "
          />
          <button
            id="send-message-btn"
            style="
              padding: 8px 16px;
              background: ${teamColor};
              color: white;
              border: none;
              border-radius: 4px;
              font-family: 'Courier New', monospace;
              font-size: 11px;
              font-weight: bold;
              cursor: pointer;
            "
          >
            Send
          </button>
        </div>
      </div>

      <div style="margin-top: 12px; text-align: center; font-size: 9px; color: #555;">
        Press ESC to close
      </div>
    `;

    // Wire up event listeners
    const killBtn = this.container.querySelector('#kill-agent-btn') as HTMLButtonElement;
    if (killBtn) {
      killBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleKillAgent();
      });
    }

    const chatInput = this.container.querySelector('#agent-chat-input') as HTMLInputElement;
    const sendBtn = this.container.querySelector('#send-message-btn') as HTMLButtonElement;

    if (chatInput && sendBtn) {
      const sendMessage = () => {
        const message = chatInput.value.trim();
        if (message && this.onSendMessage) {
          this.onSendMessage(message);
          chatInput.value = '';
        }
      };

      sendBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sendMessage();
      });

      chatInput.addEventListener('keydown', (e) => {
        e.stopPropagation(); // Prevent ESC from closing when typing
        if (e.key === 'Enter') {
          e.preventDefault();
          sendMessage();
        }
      });

      // Focus input
      setTimeout(() => chatInput.focus(), 100);
    }

    // Stop propagation on panel click to prevent outside click handler
    this.container.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  private handleKillAgent = async () => {
    if (!this.agentData) return;

    const confirmed = confirm(`Are you sure you want to kill agent "${this.agentData.name}"?`);
    if (!confirmed) return;

    try {
      const response = await fetch(`http://localhost:3002/api/agents/${this.agentData.name}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        console.log('[AgentDetailPanel] Agent killed:', this.agentData.name);

        // Show warning toast
        if (this.onShowToast) {
          this.onShowToast(this.agentData.name, 'disconnected', 'warning');
        }

        this.hide();
        if (this.onClose) {
          this.onClose();
        }
      } else {
        const errorText = await response.text();

        // Show error toast
        if (this.onShowToast) {
          this.onShowToast(this.agentData.name, `kill failed: ${errorText}`, 'error');
        }

        alert(`Failed to kill agent: ${errorText}`);
      }
    } catch (err) {
      console.error('[AgentDetailPanel] Error killing agent:', err);

      // Show error toast
      if (this.onShowToast && this.agentData) {
        this.onShowToast(this.agentData.name, `kill error: ${err}`, 'error');
      }

      alert(`Error killing agent: ${err}`);
    }
  };

  private handleOutsideClick = (e: MouseEvent) => {
    if (this.container && !this.container.contains(e.target as Node)) {
      this.hide();
      if (this.onClose) {
        this.onClose();
      }
    }
  };

  private getColorString(team: string): string {
    const color = getTeamColor(team);
    return '#' + color.toString(16).padStart(6, '0');
  }

  private getStateEmoji(state: string): string {
    switch (state) {
      case 'typing': return '⌨️';
      case 'walking': return '🚶';
      case 'talking': return '💬';
      default: return '🧍';
    }
  }

  private getUptimeString(spawnTime?: number): string {
    if (!spawnTime) return 'Unknown';

    const now = Date.now();
    const diff = now - spawnTime;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Method to handle ESC key (to be called from scene)
  handleEscKey() {
    this.hide();
    if (this.onClose) {
      this.onClose();
    }
  }
}
