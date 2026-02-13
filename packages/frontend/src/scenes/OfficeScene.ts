import Phaser from 'phaser';
import { Agent } from '../entities/Agent';
import { Desk } from '../entities/Desk';
import { TaskBoard } from '../entities/TaskBoard';
import { SocketClient } from '../network/Socket';
import { ChatInput } from '../ui/ChatInput';
import { ActivityFeed } from '../ui/ActivityFeed';
import { AgentDetailPanel } from '../ui/AgentDetailPanel';
import { ToastManager } from '../ui/ToastManager';
import { SoundManager } from '../audio/SoundManager';
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
  private soundManager!: SoundManager;
  private muteButton!: Phaser.GameObjects.Container;
  private activityFeed!: ActivityFeed;
  private agentDetailPanel!: AgentDetailPanel;
  private toastManager!: ToastManager;
  private clockText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'OfficeScene' });
  }

  create() {
    this.drawBaseFloor();
    this.teamZoneGraphics = this.add.graphics();
    this.chatInput = new ChatInput(this);
    this.agentDetailPanel = new AgentDetailPanel(this);

    // Create task board on the top wall
    this.taskBoard = new TaskBoard(this, (COLS * TILE) / 2, TILE * 1.5);

    // Initialize sound manager
    this.soundManager = new SoundManager();

    // Create activity feed
    this.activityFeed = new ActivityFeed(this);

    // Create toast manager
    this.toastManager = new ToastManager(this);

    // Create mute/volume toggle button
    this.createMuteButton();

    // Create wall clock
    this.createWallClock();

    // ESC key handler for closing detail panel
    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.agentDetailPanel.isVisible()) {
        this.agentDetailPanel.handleEscKey();
      }
    });

    // Resume audio context on first user interaction
    this.input.once('pointerdown', () => {
      this.soundManager.resume();
      this.soundManager.startAmbientHum();
    });

    this.socket = new SocketClient();
    this.setupSocketHandlers();
    this.socket.connect();

    this.cameras.main.setBackgroundColor('#c8bfb0');
    this.cameras.main.centerOn((COLS * TILE) / 2, (ROWS * TILE) / 2);
  }

  private drawBaseFloor() {
    const g = this.add.graphics();

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const isLight = (x + y) % 2 === 0;
        g.fillStyle(isLight ? 0xc8bfb0 : 0xbdb4a5, 1);
        g.fillRect(x * TILE, y * TILE, TILE, TILE);
      }
    }

    // Walls — warm cream
    g.fillStyle(0xe8e0d4, 1);
    g.fillRect(0, 0, COLS * TILE, TILE);
    g.fillRect(0, (ROWS - 1) * TILE, COLS * TILE, TILE);
    g.fillRect(0, 0, TILE, ROWS * TILE);
    g.fillRect((COLS - 1) * TILE, 0, TILE, ROWS * TILE);

    // Baseboard — warm wood
    g.lineStyle(3, 0x9a8870, 0.7);
    g.strokeRect(TILE, TILE, (COLS - 2) * TILE, (ROWS - 2) * TILE);

    // Windows along top wall with light effects
    for (let wx = 3; wx <= COLS - 5; wx += 3) {
      // Light glow effect from window
      g.fillStyle(0xfffacd, 0.08);
      g.fillRect(wx * TILE + 4, TILE + 4, TILE * 2 - 8, TILE * 2);

      // Window glass (sky blue)
      g.fillStyle(0x87ceeb, 0.35);
      g.fillRect(wx * TILE + 4, 4, TILE * 2 - 8, TILE - 8);

      // Brighter center (sun reflection)
      g.fillStyle(0xfffacd, 0.15);
      g.fillRect(wx * TILE + TILE / 2, 6, TILE, TILE - 12);

      // Window frame
      g.lineStyle(2, 0x8b7355, 0.7);
      g.strokeRect(wx * TILE + 4, 4, TILE * 2 - 8, TILE - 8);

      // Window divider
      g.moveTo(wx * TILE + TILE, 4);
      g.lineTo(wx * TILE + TILE, TILE - 4);
      g.strokePath();
    }

    // Door gap
    g.fillStyle(0xbdb4a5, 1);
    g.fillRect(9 * TILE, (ROWS - 1) * TILE - 1, 2 * TILE, 4);

    // Welcome mat near door
    const matX = 10 * TILE - 8;
    const matY = (ROWS - 2) * TILE + 8;
    g.fillStyle(0x8b4513, 0.8); // Brown mat
    g.fillRect(matX, matY, TILE + 16, 12);
    g.lineStyle(1, 0x654321, 0.9);
    g.strokeRect(matX, matY, TILE + 16, 12);

    // Mat texture (horizontal lines)
    g.lineStyle(0.5, 0x654321, 0.4);
    for (let i = 0; i < 3; i++) {
      g.moveTo(matX + 2, matY + 3 + i * 3);
      g.lineTo(matX + TILE + 14, matY + 3 + i * 3);
      g.strokePath();
    }

    // Water cooler (center-ish area)
    const coolerX = 10 * TILE;
    const coolerY = 7 * TILE;

    // Cooler body (blue cylinder)
    g.fillStyle(0x4a90e2, 1);
    g.fillRect(coolerX - 6, coolerY - 8, 12, 16);
    g.lineStyle(1, 0x2b5a8f, 1);
    g.strokeRect(coolerX - 6, coolerY - 8, 12, 16);

    // Cooler top (lighter blue)
    g.fillStyle(0x87ceeb, 1);
    g.fillEllipse(coolerX, coolerY - 8, 12, 6);
    g.lineStyle(1, 0x2b5a8f, 1);
    g.strokeEllipse(coolerX, coolerY - 8, 12, 6);

    // Cooler base (darker)
    g.fillStyle(0x2b5a8f, 1);
    g.fillRect(coolerX - 8, coolerY + 8, 16, 4);

    // Potted plants in corners
    const plantCorners = [
      { x: 1.5 * TILE, y: 1.5 * TILE },     // Top-left
      { x: (COLS - 1.5) * TILE, y: 1.5 * TILE }, // Top-right
      { x: 1.5 * TILE, y: (ROWS - 1.5) * TILE }, // Bottom-left
      { x: (COLS - 1.5) * TILE, y: (ROWS - 1.5) * TILE }, // Bottom-right
    ];

    for (const corner of plantCorners) {
      // Pot (brown rectangle)
      g.fillStyle(0x8b4513, 1);
      g.fillRect(corner.x - 6, corner.y + 4, 12, 8);
      g.lineStyle(1, 0x654321, 1);
      g.strokeRect(corner.x - 6, corner.y + 4, 12, 8);

      // Plant (green circles for foliage)
      g.fillStyle(0x228b22, 0.8);
      g.fillCircle(corner.x - 3, corner.y - 2, 5);
      g.fillCircle(corner.x + 3, corner.y - 2, 5);
      g.fillCircle(corner.x, corner.y - 5, 5);

      // Highlight on leaves
      g.fillStyle(0x32cd32, 0.4);
      g.fillCircle(corner.x - 2, corner.y - 6, 2);
      g.fillCircle(corner.x + 2, corner.y - 3, 2);
    }

    // Decorative props
    const props: [number, number, string][] = [
      [18, 1, '🌿'], [1, 13, '🌿'], [1, 1, '🪴'], [18, 13, '🪴'],
      [9, 7, '☕'], [5, 1, '🌱'], [14, 13, '🌱'],
      [1, 7, '📚'], [18, 7, '🖨️'], [15, 1, '💧'],
    ];
    for (const [x, y, emoji] of props) {
      const t = this.add.text(x * TILE + TILE / 2, y * TILE + TILE / 2, emoji, { fontSize: '14px' });
      t.setOrigin(0.5, 0.5).setAlpha(0.5);
    }

    // Subtle floor grout lines
    g.lineStyle(0.5, 0xa8a095, 0.15);
    for (let y = 1; y < ROWS - 1; y++) {
      for (let x = 1; x < COLS - 1; x++) {
        g.strokeRect(x * TILE, y * TILE, TILE, TILE);
      }
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

    this.socket.on('agent_state_changed', (payload: { agentId: string; state: any; currentFile?: string; plan?: any; currentTask?: string }) => {
      const agent = this.agents.get(payload.agentId);
      if (agent) {
        const previousState = agent.getData().state;
        agent.updateState(payload.state);

        // Update agent data with any additional fields
        agent.updateData({
          state: payload.state,
          currentFile: payload.currentFile,
          plan: payload.plan,
          currentTask: payload.currentTask,
        });

        // Update detail panel if it's showing this agent
        if (this.agentDetailPanel.isVisible() && this.currentChatAgent === agent) {
          this.agentDetailPanel.updateAgentData(agent.getData());
        }

        // Log to activity feed
        const agentData = agent.getData();
        this.activityFeed.addStateChange(agentData.name, payload.state, agentData.currentFile);

        // Show toast when agent goes idle after typing (finished working)
        if (previousState === 'typing' && payload.state === 'idle') {
          const teamColor = getTeamColor(agentData.team);
          this.toastManager.show(
            agentData.name,
            'finished working',
            'info',
            teamColor
          );
        }
      }
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

      // Log to activity feed
      const agentData = agent.getData();
      const targetName = targetAgent?.getData().name;
      this.activityFeed.addMovement(agentData.name, targetName);
    });

    this.socket.on('agent_message', (payload: any) => {
      const fromAgent = this.agents.get(payload.from);
      if (fromAgent) {
        fromAgent.updateState('talking');
        fromAgent.showMessage(payload.text);
        setTimeout(() => fromAgent.updateState('idle'), 3000);

        // Log to activity feed
        const toAgent = this.agents.get(payload.to);
        const fromData = fromAgent.getData();
        const toName = toAgent ? toAgent.getData().name : 'unknown';
        this.activityFeed.addMessage(fromData.name, toName, payload.text);
      }
    });

    this.socket.on('task_updated', (payload: Task) => {
      console.log('[Office] Task updated:', payload.id, payload.status);
      this.taskBoard.updateTask(payload);
      // Play completion chime when a task is marked as completed
      if (payload.status === 'completed') {
        this.soundManager.playTaskCompleteChime();
      }

      // Log to activity feed
      this.activityFeed.addTaskUpdate(payload.description, payload.status, payload.agentName);

      // Show success toast when task is completed
      if (payload.status === 'completed' && payload.agentName) {
        const agent = Array.from(this.agents.values()).find(a => a.getName() === payload.agentName);
        const teamColor = agent ? getTeamColor(agent.getData().team) : undefined;
        this.toastManager.show(
          payload.agentName,
          `completed: ${payload.description}`,
          'success',
          teamColor
        );
      }
    });

    this.socket.on('agent_removed', (payload: { agentId: string }) => {
      const agent = this.agents.get(payload.agentId);
      if (!agent) {
        console.log('[Office] Agent removal requested but agent not found:', payload.agentId);
        return;
      }

      const agentData = agent.getData();
      const agentName = agentData.name;
      const teamColor = getTeamColor(agentData.team);

      console.log('[Office] Agent leaving:', agentName);

      // Close detail panel if this agent is shown
      if (this.currentChatAgent === agent) {
        this.agentDetailPanel.hide();
        this.currentChatAgent = null;
      }

      // Remove agent's tasks from task board
      this.taskBoard.removeTasksForAgent(payload.agentId);

      // Play leave animation and remove from map
      agent.leave(() => {
        this.agents.delete(payload.agentId);
        console.log('[Office] Agent removed:', agentName);
      });

      // Show toast notification
      this.toastManager.show(
        agentName,
        'has left the office',
        'info',
        teamColor
      );

      // Remove desk (find and destroy)
      const desk = this.desks.find(d =>
        d.x === agentData.deskPosition.x * 32 &&
        d.y === agentData.deskPosition.y * 32
      );
      if (desk) {
        desk.destroy();
        this.desks = this.desks.filter(d => d !== desk);
      }

      // Redraw team zones without this agent
      const remainingAgents = Array.from(this.agents.values()).map(a => a.getData());
      this.drawTeamZones(remainingAgents);
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

    // Set spawn time if not already set
    if (!data.spawnTime) {
      data.spawnTime = Date.now();
    }

    const color = getTeamColor(data.team);
    const desk = new Desk(this, data.deskPosition.x, data.deskPosition.y, color);
    this.desks.push(desk);

    const agent = new Agent(this, data, this.soundManager);
    agent.setClickCallback((clickedAgent) => this.handleAgentClick(clickedAgent));
    this.agents.set(data.id, agent);
  }

  private handleAgentClick(agent: Agent) {
    // Close existing panel/chat if open
    if (this.agentDetailPanel.isVisible()) {
      this.agentDetailPanel.hide();
    }
    if (this.chatInput.isVisible()) {
      this.chatInput.hide();
    }

    this.currentChatAgent = agent;

    // Show detail panel with agent data
    this.agentDetailPanel.show(
      agent.getData(),
      (message) => this.handleSendMessage(agent, message),
      () => { this.currentChatAgent = null; },
      (name: string, message: string, type: 'success' | 'info' | 'warning' | 'error') => {
        const teamColor = getTeamColor(agent.getData().team);
        this.toastManager.show(name, message, type, teamColor);
      }
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

  private createWallClock() {
    const x = (COLS - 2) * TILE;
    const y = TILE / 2;

    // Clock background (circular)
    const bg = this.add.graphics();
    bg.fillStyle(0xf5f5dc, 1); // Beige
    bg.fillCircle(x, y, 12);
    bg.lineStyle(2, 0x8b7355, 1); // Brown border
    bg.strokeCircle(x, y, 12);

    // Clock face with hour markers
    for (let i = 0; i < 12; i++) {
      const angle = (i * 30 - 90) * Math.PI / 180;
      const markerX = x + Math.cos(angle) * 9;
      const markerY = y + Math.sin(angle) * 9;
      bg.fillStyle(0x333333, 1);
      bg.fillCircle(markerX, markerY, 1);
    }

    // Time text below clock
    this.clockText = this.add.text(x, y + 18, '', {
      fontSize: '7px',
      fontFamily: 'monospace',
      color: '#333333',
    });
    this.clockText.setOrigin(0.5, 0);
  }

  private createMuteButton() {
    const x = COLS * TILE - 40;
    const y = 20;

    const container = this.add.container(x, y);
    container.setDepth(1000);
    container.setScrollFactor(0); // Fixed to camera

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x222233, 0.9);
    bg.fillRoundedRect(-16, -16, 32, 32, 4);
    bg.lineStyle(2, 0x444466, 0.8);
    bg.strokeRoundedRect(-16, -16, 32, 32, 4);

    // Icon
    const icon = this.add.text(0, 0, '🔊', {
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
      const enabled = this.soundManager.toggleMute();
      icon.setText(enabled ? '🔊' : '🔇');
      // Play a confirmation sound if re-enabling
      if (enabled) {
        this.soundManager.playNotificationChime();
        this.soundManager.startAmbientHum();
      }
    });

    this.muteButton = container;
  }

  update() {
    // Update clock time
    if (this.clockText) {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      this.clockText.setText(`${hours}:${minutes}`);
    }
  }
}
