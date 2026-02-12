import Phaser from 'phaser';
import { Agent } from '../entities/Agent';
import { Desk } from '../entities/Desk';
import { MovementSystem } from '../systems/Movement';
import { MessageSystem } from '../systems/Messages';
import { SocketClient } from '../network/Socket';
import type { Agent as AgentData } from '../../../../shared/types';

const TILE_SIZE = 32;
const GRID_WIDTH = 20;
const GRID_HEIGHT = 15;

export class OfficeScene extends Phaser.Scene {
  private agents: Map<string, Agent> = new Map();
  private desks: Desk[] = [];
  private movementSystem!: MovementSystem;
  private messageSystem!: MessageSystem;
  private socket!: SocketClient;

  // Desk positions (8 desks arranged in office layout)
  private deskPositions = [
    { x: 2, y: 2 },
    { x: 6, y: 2 },
    { x: 10, y: 2 },
    { x: 14, y: 2 },
    { x: 2, y: 8 },
    { x: 6, y: 8 },
    { x: 10, y: 8 },
    { x: 14, y: 8 }
  ];

  constructor() {
    super({ key: 'OfficeScene' });
  }

  create() {
    console.log('[OfficeScene] Creating scene...');

    // Create programmatic office floor
    this.createOfficeFloor();

    // Create desks
    this.createDesks();

    // Initialize systems
    this.movementSystem = new MovementSystem(GRID_WIDTH, GRID_HEIGHT);
    this.messageSystem = new MessageSystem();

    // Set up WebSocket connection
    this.socket = new SocketClient();
    this.setupSocketHandlers();
    this.socket.connect();

    // Enable camera controls
    this.cameras.main.setZoom(1.5);
    this.cameras.main.centerOn(
      (GRID_WIDTH * TILE_SIZE) / 2,
      (GRID_HEIGHT * TILE_SIZE) / 2
    );
  }

  private createOfficeFloor() {
    const graphics = this.add.graphics();

    // Draw a grid-based office floor
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        // Checkerboard pattern for floor tiles
        const isLight = (x + y) % 2 === 0;
        graphics.fillStyle(isLight ? 0x2a2a2a : 0x242424, 1);
        graphics.fillRect(px, py, TILE_SIZE, TILE_SIZE);

        // Grid lines
        graphics.lineStyle(1, 0x1a1a1a, 0.3);
        graphics.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  private createDesks() {
    this.deskPositions.forEach((pos) => {
      const desk = new Desk(this, pos.x, pos.y);
      this.desks.push(desk);
    });
  }

  private setupSocketHandlers() {
    // Handle initial state
    this.socket.on('init', (payload: { agents: AgentData[] }) => {
      console.log('[OfficeScene] Received initial state:', payload);

      payload.agents.forEach((agentData) => {
        this.spawnAgent(agentData);
      });
    });

    // Handle agent state changes
    this.socket.on('agent_state_changed', (payload: { agentId: string; state: any }) => {
      const agent = this.agents.get(payload.agentId);
      if (agent) {
        agent.updateState(payload.state);
      }
    });

    // Handle agent movement
    this.socket.on('agent_moving', (payload: { agentId: string; toX: number; toY: number }) => {
      const agent = this.agents.get(payload.agentId);
      if (agent) {
        agent.moveTo(payload.toX, payload.toY);
      }
    });

    // Handle agent messages
    this.socket.on('agent_message', (payload: any) => {
      const fromAgent = this.agents.get(payload.from);
      const toAgent = this.agents.get(payload.to);

      if (fromAgent && toAgent) {
        fromAgent.updateState('talking');
        fromAgent.showMessage(payload.text);

        setTimeout(() => {
          fromAgent.updateState('idle');
        }, 3000);
      }
    });
  }

  private spawnAgent(agentData: AgentData) {
    if (this.agents.has(agentData.id)) {
      return; // Agent already exists
    }

    const agent = new Agent(this, agentData);
    this.agents.set(agentData.id, agent);

    // Make agent clickable
    agent.on('pointerdown', () => {
      console.log('[OfficeScene] Clicked agent:', agentData.name);
      // TODO: Open chat dialog in future phase
    });
  }

  update(time: number, delta: number) {
    // Future: Add any per-frame updates here
  }
}
