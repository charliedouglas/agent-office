import Phaser from 'phaser';
import { Agent } from '../entities/Agent';
import { Desk } from '../entities/Desk';
import { TaskBoard } from '../entities/TaskBoard';
import { SocketClient } from '../network/Socket';
import { ChatInput } from '../ui/ChatInput';
import type { Agent as AgentData, Task } from '../../../../shared/types';

const TILE = 32;
const COLS = 20;
const ROWS = 15;

// Auto-assign colours to teams as they appear
const PALETTE = [0x3b82f6, 0xa855f7, 0x22c55e, 0xf59e0b, 0xef4444, 0x06b6d4, 0xec4899, 0x84cc16];
const teamColorMap = new Map<string, number>();
let colorIndex = 0;

function getTeamColor(team: string): number {
  if (!teamColorMap.has(team)) {
    teamColorMap.set(team, PALETTE[colorIndex % PALETTE.length]);
    colorIndex++;
  }
  return teamColorMap.get(team)!;
}

export class OfficeScene extends Phaser.Scene {
  private agents: Map<string, Agent> = new Map();
  private desks: Desk[] = [];
  private socket!: SocketClient;
  private teamZoneGraphics!: Phaser.GameObjects.Graphics;
  private chatInput!: ChatInput;
  private currentChatAgent: Agent | null = null;
  private taskBoard!: TaskBoard;

  constructor() {
    super({ key: 'OfficeScene' });
  }

  create() {
    this.drawBaseFloor();
    this.teamZoneGraphics = this.add.graphics();
    this.chatInput = new ChatInput(this);

    // Create task board on the top wall
    this.taskBoard = new TaskBoard(this, (COLS * TILE) / 2, TILE * 1.5);

    this.socket = new SocketClient();
    this.setupSocketHandlers();
    this.socket.connect();

    this.cameras.main.setBackgroundColor('#111118');
    this.cameras.main.centerOn((COLS * TILE) / 2, (ROWS * TILE) / 2);
  }

  private drawBaseFloor() {
    const g = this.add.graphics();

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const isLight = (x + y) % 2 === 0;
        g.fillStyle(isLight ? 0x22222e : 0x1e1e28, 1);
        g.fillRect(x * TILE, y * TILE, TILE, TILE);
      }
    }

    // Walls
    g.lineStyle(3, 0x444466, 0.8);
    g.strokeRect(TILE, TILE, (COLS - 2) * TILE, (ROWS - 2) * TILE);

    // Door gap
    g.fillStyle(0x1e1e28, 1);
    g.fillRect(9 * TILE, (ROWS - 1) * TILE - 1, 2 * TILE, 4);

    // Plants
    const props = [[18, 1, '🌿'], [1, 13, '🌿'], [9, 6, '☕']];
    for (const [x, y, emoji] of props) {
      const t = this.add.text((x as number) * TILE + TILE / 2, (y as number) * TILE + TILE / 2, emoji as string, { fontSize: '14px' });
      t.setOrigin(0.5, 0.5).setAlpha(0.4);
    }
  }

  /** Draw team zone highlights computed from actual agent positions */
  private drawTeamZones(agents: AgentData[]) {
    const g = this.teamZoneGraphics;
    g.clear();

    // Group agents by team
    const teams = new Map<string, AgentData[]>();
    for (const a of agents) {
      if (!teams.has(a.team)) teams.set(a.team, []);
      teams.get(a.team)!.push(a);
    }

    for (const [team, members] of teams) {
      const color = getTeamColor(team);

      // Compute bounding box of desk positions with 1-tile padding
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const m of members) {
        minX = Math.min(minX, m.deskPosition.x);
        minY = Math.min(minY, m.deskPosition.y);
        maxX = Math.max(maxX, m.deskPosition.x);
        maxY = Math.max(maxY, m.deskPosition.y);
      }
      const pad = 1;
      const zx = (minX - pad) * TILE;
      const zy = (minY - pad) * TILE;
      const zw = (maxX - minX + 1 + pad * 2) * TILE;
      const zh = (maxY - minY + 1 + pad * 2) * TILE;

      g.fillStyle(color, 0.06);
      g.fillRect(zx, zy, zw, zh);
      g.lineStyle(1, color, 0.25);
      g.strokeRect(zx, zy, zw, zh);

      // Label
      const label = this.add.text(zx + zw / 2, zy + 4, team.toUpperCase(), {
        fontSize: '8px', fontFamily: 'monospace',
        color: '#' + color.toString(16).padStart(6, '0'),
      });
      label.setOrigin(0.5, 0).setAlpha(0.5);
    }
  }

  private setupSocketHandlers() {
    this.socket.on('init', (payload: { agents: AgentData[]; tasks?: Task[] }) => {
      console.log('[Office] Init:', payload.agents.length, 'agents');
      this.drawTeamZones(payload.agents);
      payload.agents.forEach(a => this.spawnAgent(a));

      // Initialize tasks
      if (payload.tasks) {
        console.log('[Office] Init:', payload.tasks.length, 'tasks');
        payload.tasks.forEach(t => this.taskBoard.addTask(t));
      }
    });

    this.socket.on('agent_state_changed', (payload: { agentId: string; state: any }) => {
      this.agents.get(payload.agentId)?.updateState(payload.state);
    });

    this.socket.on('agent_moving', (payload: { agentId: string; toX: number; toY: number }) => {
      const agent = this.agents.get(payload.agentId);
      if (!agent) return;

      // Find if there's an agent already at the target position — if so, stand beside them
      const targetAgent = this.findAgentAtDesk(payload.toX, payload.toY);
      let destX = payload.toX;
      let destY = payload.toY;

      if (targetAgent) {
        // Try positions around the target: right, left, below, above
        const offsets = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1]];
        for (const [ox, oy] of offsets) {
          const nx = payload.toX + ox;
          const ny = payload.toY + oy;
          if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS && !this.isOccupied(nx, ny)) {
            destX = nx;
            destY = ny;
            break;
          }
        }
      }

      agent.moveToTile(destX, destY);
    });

    this.socket.on('agent_message', (payload: any) => {
      const fromAgent = this.agents.get(payload.from);
      if (fromAgent) {
        fromAgent.updateState('talking');
        fromAgent.showMessage(payload.text);
        setTimeout(() => fromAgent.updateState('idle'), 3000);
      }
    });

    this.socket.on('task_updated', (payload: Task) => {
      console.log('[Office] Task updated:', payload.id, payload.status);
      this.taskBoard.updateTask(payload);
    });
  }

  /** Check if any agent's desk is at this tile */
  private findAgentAtDesk(tx: number, ty: number): Agent | undefined {
    for (const [, agent] of this.agents) {
      if (agent.getDeskX() === tx && agent.getDeskY() === ty) {
        return agent;
      }
    }
    return undefined;
  }

  /** Check if any agent is currently visually at this tile */
  private isOccupied(tx: number, ty: number): boolean {
    const px = tx * TILE;
    const py = ty * TILE;
    for (const [, agent] of this.agents) {
      if (Math.abs(agent.x - px) < TILE / 2 && Math.abs(agent.y - py) < TILE / 2) {
        return true;
      }
    }
    return false;
  }

  private spawnAgent(data: AgentData) {
    if (this.agents.has(data.id)) return;

    const color = getTeamColor(data.team);
    const desk = new Desk(this, data.deskPosition.x, data.deskPosition.y, color);
    this.desks.push(desk);

    const agent = new Agent(this, data);
    agent.setClickCallback((clickedAgent) => this.handleAgentClick(clickedAgent));
    this.agents.set(data.id, agent);
  }

  private handleAgentClick(agent: Agent) {
    // Don't open if already chatting with this agent
    if (this.chatInput.isVisible() && this.currentChatAgent === agent) {
      return;
    }

    // Close existing chat if open
    if (this.chatInput.isVisible()) {
      this.chatInput.hide();
    }

    this.currentChatAgent = agent;

    // Calculate screen position for chat input
    const worldX = agent.x;
    const worldY = agent.y;

    // Convert world coordinates to screen coordinates
    const camera = this.cameras.main;
    const screenX = (worldX - camera.scrollX) * camera.zoom + camera.x;
    const screenY = (worldY - camera.scrollY) * camera.zoom + camera.y;

    // Position chat input near the agent
    const chatX = screenX + 20;
    const chatY = screenY - 60;

    this.chatInput.show(
      chatX,
      chatY,
      agent.getName(),
      (message) => this.handleSendMessage(agent, message),
      () => { this.currentChatAgent = null; }
    );
  }

  private handleSendMessage(agent: Agent, message: string) {
    console.log('[OfficeScene] Sending message to', agent.getName(), ':', message);

    // Send message through WebSocket
    this.socket.send('user_message', {
      to: agent.getId(),
      text: message,
      timestamp: Date.now(),
    });

    // Show user's message as speech bubble above agent
    agent.showMessage(`You: ${message}`);

    // Mock agent response after a delay
    setTimeout(() => {
      const mockResponses = [
        'Thanks for reaching out!',
        'I\'ll look into that right away.',
        'Great question! Let me think about it.',
        'Noted! I\'m on it.',
        'Thanks! I\'ll get back to you soon.',
      ];
      const response = mockResponses[Math.floor(Math.random() * mockResponses.length)];
      agent.showMessage(response);
    }, 1500);
  }

  update() {}
}
