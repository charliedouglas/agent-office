import Phaser from 'phaser';
import { Agent } from '../entities/Agent';
import { Desk } from '../entities/Desk';
import { SocketClient } from '../network/Socket';
import type { Agent as AgentData } from '../../../../shared/types';

const TILE = 32;
const COLS = 20;
const ROWS = 15;

// Team colors
const TEAM_COLORS: Record<string, number> = {
  engineering: 0x3b82f6,  // blue
  design:      0xa855f7,  // purple
  qa:          0x22c55e,  // green
  management:  0xf59e0b,  // amber
};

// Team zone rects (for floor tinting) — { x, y, w, h } in tiles
const TEAM_ZONES: Record<string, { x: number; y: number; w: number; h: number; label: string }> = {
  engineering: { x: 2, y: 2, w: 5, h: 5, label: 'ENGINEERING' },
  design:      { x: 12, y: 2, w: 5, h: 3, label: 'DESIGN' },
  qa:          { x: 12, y: 9, w: 5, h: 3, label: 'QA' },
  management:  { x: 2, y: 10, w: 3, h: 3, label: 'MANAGEMENT' },
};

export class OfficeScene extends Phaser.Scene {
  private agents: Map<string, Agent> = new Map();
  private desks: Desk[] = [];
  private socket!: SocketClient;

  constructor() {
    super({ key: 'OfficeScene' });
  }

  create() {
    this.drawOffice();
    this.socket = new SocketClient();
    this.setupSocketHandlers();
    this.socket.connect();

    // Camera
    this.cameras.main.setBackgroundColor('#111118');
    this.cameras.main.centerOn((COLS * TILE) / 2, (ROWS * TILE) / 2);
  }

  private drawOffice() {
    const g = this.add.graphics();

    // Base floor — dark
    g.fillStyle(0x1a1a24, 1);
    g.fillRect(0, 0, COLS * TILE, ROWS * TILE);

    // Floor grid (subtle)
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const isLight = (x + y) % 2 === 0;
        g.fillStyle(isLight ? 0x22222e : 0x1e1e28, 1);
        g.fillRect(x * TILE, y * TILE, TILE, TILE);
      }
    }

    // Team zone highlights
    for (const [team, zone] of Object.entries(TEAM_ZONES)) {
      const color = TEAM_COLORS[team] ?? 0x444444;

      // Tinted floor area
      g.fillStyle(color, 0.08);
      g.fillRect(zone.x * TILE, zone.y * TILE, zone.w * TILE, zone.h * TILE);

      // Border
      g.lineStyle(1, color, 0.3);
      g.strokeRect(zone.x * TILE, zone.y * TILE, zone.w * TILE, zone.h * TILE);

      // Label
      const label = this.add.text(
        (zone.x + zone.w / 2) * TILE,
        zone.y * TILE - 8,
        zone.label,
        { fontSize: '9px', color: '#' + color.toString(16).padStart(6, '0'), fontFamily: 'monospace' }
      );
      label.setOrigin(0.5, 1);
      label.setAlpha(0.6);
    }

    // Walls (top and left borders, thicker)
    g.lineStyle(3, 0x444466, 0.8);
    g.strokeRect(TILE, TILE, (COLS - 2) * TILE, (ROWS - 2) * TILE);

    // "Door" gap bottom-centre
    g.fillStyle(0x1a1a24, 1);
    g.fillRect(9 * TILE, (ROWS - 1) * TILE - 1, 2 * TILE, 4);

    // Water cooler / plant decorations
    this.drawProp(g, 9, 6, 0x00aacc, '🚰');  // water cooler area
    this.drawProp(g, 18, 1, 0x22aa44, '🌿');  // plant
    this.drawProp(g, 1, 13, 0x22aa44, '🌿');  // plant
  }

  private drawProp(g: Phaser.GameObjects.Graphics, tx: number, ty: number, color: number, emoji: string) {
    const text = this.add.text(tx * TILE + TILE / 2, ty * TILE + TILE / 2, emoji, { fontSize: '16px' });
    text.setOrigin(0.5, 0.5);
    text.setAlpha(0.5);
  }

  private setupSocketHandlers() {
    this.socket.on('init', (payload: { agents: AgentData[] }) => {
      console.log('[Office] Init:', payload.agents.length, 'agents');
      payload.agents.forEach(a => this.spawnAgent(a));
    });

    this.socket.on('agent_state_changed', (payload: { agentId: string; state: any }) => {
      this.agents.get(payload.agentId)?.updateState(payload.state);
    });

    this.socket.on('agent_moving', (payload: { agentId: string; toX: number; toY: number }) => {
      this.agents.get(payload.agentId)?.moveTo(payload.toX, payload.toY);
    });

    this.socket.on('agent_message', (payload: any) => {
      const fromAgent = this.agents.get(payload.from);
      if (fromAgent) {
        fromAgent.updateState('talking');
        fromAgent.showMessage(payload.text);
        setTimeout(() => fromAgent.updateState('idle'), 3000);
      }
    });
  }

  private spawnAgent(data: AgentData) {
    if (this.agents.has(data.id)) return;

    // Create desk first
    const desk = new Desk(this, data.deskPosition.x, data.deskPosition.y, TEAM_COLORS[data.team] ?? 0x666666);
    this.desks.push(desk);

    // Create agent
    const agent = new Agent(this, data);
    this.agents.set(data.id, agent);
  }

  update() {}
}
