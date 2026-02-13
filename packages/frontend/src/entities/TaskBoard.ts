import Phaser from 'phaser';
import type { Task } from '../../../../shared/types';

const TILE = 32;

interface TaskCard {
  task: Task;
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  text: Phaser.GameObjects.Text;
  dot?: Phaser.GameObjects.Graphics;
}

// Same palette as OfficeScene for agent colors
const PALETTE = [0x3b82f6, 0xa855f7, 0x22c55e, 0xf59e0b, 0xef4444, 0x06b6d4, 0xec4899, 0x84cc16];
const teamColorMap = new Map<string, number>();
let colorIndex = 0;

function getAgentColor(agentId: string): number {
  if (!teamColorMap.has(agentId)) {
    teamColorMap.set(agentId, PALETTE[colorIndex % PALETTE.length]);
    colorIndex++;
  }
  return teamColorMap.get(agentId)!;
}

export class TaskBoard {
  private scene: Phaser.Scene;
  private tasks: Map<string, TaskCard> = new Map();
  private wallIcon!: Phaser.GameObjects.Container;
  private overlayElement: HTMLDivElement | null = null;
  private isOpen = false;
  private cardWidth = 90;
  private cardHeight = 32;
  private columnWidth = 100;
  private columnGap = 10;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;

    // Create small wall icon instead of full board
    this.createWallIcon(x, y);

    // Create overlay HTML structure
    this.createOverlayDOM();
  }

  private createWallIcon(x: number, y: number) {
    this.wallIcon = this.scene.add.container(x, y);
    this.wallIcon.setDepth(5);

    // Small clipboard/whiteboard icon (2 tiles wide, 1.5 tiles tall)
    const iconWidth = 64; // 2 tiles
    const iconHeight = 48; // 1.5 tiles

    const bg = this.scene.add.graphics();

    // Clipboard backing
    bg.fillStyle(0xc19a6b, 1); // Cork/wood color
    bg.fillRoundedRect(-iconWidth / 2, 0, iconWidth, iconHeight, 4);

    // Clip at top
    bg.fillStyle(0x888888, 1);
    bg.fillRoundedRect(-8, -2, 16, 6, 2);

    // Frame
    bg.lineStyle(2, 0x5c4033, 1);
    bg.strokeRoundedRect(-iconWidth / 2, 0, iconWidth, iconHeight, 4);

    // Simple task lines representation
    bg.lineStyle(1, 0x2a2a2a, 0.5);
    for (let i = 0; i < 3; i++) {
      const lineY = 12 + i * 12;
      bg.lineBetween(-20, lineY, 20, lineY);
    }

    this.wallIcon.add(bg);

    // Hover effect
    const hitArea = new Phaser.Geom.Rectangle(-iconWidth / 2, 0, iconWidth, iconHeight);
    this.wallIcon.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

    this.wallIcon.on('pointerover', () => {
      this.scene.tweens.add({
        targets: this.wallIcon,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 100
      });
    });

    this.wallIcon.on('pointerout', () => {
      this.scene.tweens.add({
        targets: this.wallIcon,
        scaleX: 1,
        scaleY: 1,
        duration: 100
      });
    });

    this.wallIcon.on('pointerdown', () => {
      this.toggleOverlay();
    });
  }

  private createOverlayDOM() {
    // Create overlay container
    const overlay = document.createElement('div');
    overlay.id = 'task-board-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.7);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    `;

    // Create panel container
    const panel = document.createElement('div');
    panel.id = 'task-board-panel';
    panel.style.cssText = `
      background: #c19a6b;
      border: 8px solid #5c4033;
      border-radius: 8px;
      padding: 20px;
      width: 600px;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      image-rendering: pixelated;
      position: relative;
    `;

    // Cork texture background
    panel.style.backgroundImage = `
      radial-gradient(circle at 20% 30%, rgba(166, 138, 92, 0.3) 1px, transparent 1px),
      radial-gradient(circle at 60% 70%, rgba(166, 138, 92, 0.3) 1px, transparent 1px),
      radial-gradient(circle at 40% 50%, rgba(166, 138, 92, 0.3) 1px, transparent 1px)
    `;
    panel.style.backgroundSize = '20px 20px';

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      background: #5c4033;
      color: white;
      border: 2px solid #3a2a1f;
      border-radius: 4px;
      width: 32px;
      height: 32px;
      font-size: 24px;
      cursor: pointer;
      font-family: monospace;
      line-height: 1;
      padding: 0;
    `;
    closeBtn.onmouseover = () => closeBtn.style.background = '#7a5043';
    closeBtn.onmouseout = () => closeBtn.style.background = '#5c4033';
    closeBtn.onclick = () => this.toggleOverlay();

    // Title
    const title = document.createElement('h2');
    title.textContent = 'TASK BOARD';
    title.style.cssText = `
      margin: 0 0 20px 0;
      font-family: monospace;
      font-size: 18px;
      color: #2a2a2a;
      text-align: center;
      font-weight: bold;
    `;

    // Kanban columns container
    const columnsContainer = document.createElement('div');
    columnsContainer.id = 'kanban-columns';
    columnsContainer.style.cssText = `
      display: flex;
      gap: 10px;
      justify-content: space-around;
      min-height: 200px;
    `;

    // Create three columns
    const columns = [
      { id: 'pending', title: 'TO DO', color: '#fff59d' },
      { id: 'in_progress', title: 'IN PROGRESS', color: '#b3e5fc' },
      { id: 'completed', title: 'DONE', color: '#c8e6c9' }
    ];

    columns.forEach(col => {
      const column = document.createElement('div');
      column.className = 'kanban-column';
      column.dataset.status = col.id;
      column.style.cssText = `
        flex: 1;
        min-width: 0;
      `;

      const header = document.createElement('div');
      header.style.cssText = `
        font-family: monospace;
        font-size: 12px;
        font-weight: bold;
        color: #2a2a2a;
        text-align: center;
        margin-bottom: 10px;
        position: relative;
      `;
      header.textContent = col.title;

      // Pin/tack
      const pin = document.createElement('div');
      pin.style.cssText = `
        width: 8px;
        height: 8px;
        background: #cc3333;
        border: 1px solid #888888;
        border-radius: 50%;
        position: absolute;
        top: -5px;
        left: 50%;
        transform: translateX(-50%);
      `;
      header.appendChild(pin);

      const cardsContainer = document.createElement('div');
      cardsContainer.className = 'cards-container';
      cardsContainer.dataset.status = col.id;
      cardsContainer.style.cssText = `
        min-height: 100px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      `;

      column.appendChild(header);
      column.appendChild(cardsContainer);
      columnsContainer.appendChild(column);
    });

    panel.appendChild(closeBtn);
    panel.appendChild(title);
    panel.appendChild(columnsContainer);
    overlay.appendChild(panel);

    // Close on background click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.toggleOverlay();
      }
    });

    // Close on ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.toggleOverlay();
      }
    });

    document.body.appendChild(overlay);
    this.overlayElement = overlay;
  }

  private toggleOverlay() {
    if (!this.overlayElement) return;

    this.isOpen = !this.isOpen;
    this.overlayElement.style.display = this.isOpen ? 'flex' : 'none';

    if (this.isOpen) {
      // Refresh all task cards when opening
      this.renderAllTasks();
    }
  }

  private renderAllTasks() {
    if (!this.overlayElement) return;

    // Clear all columns
    const columns = this.overlayElement.querySelectorAll('.cards-container');
    columns.forEach(col => col.innerHTML = '');

    // Re-render all tasks
    this.tasks.forEach(card => {
      this.renderTaskCard(card.task);
    });
  }

  private renderTaskCard(task: Task) {
    if (!this.overlayElement) return;

    const container = this.overlayElement.querySelector(`.cards-container[data-status="${task.status}"]`);
    if (!container) return;

    // Check if card already exists
    const existingCard = container.querySelector(`[data-task-id="${task.id}"]`);
    if (existingCard) {
      existingCard.remove();
    }

    const colors = {
      pending: '#fff59d',
      in_progress: '#b3e5fc',
      completed: '#c8e6c9'
    };

    const card = document.createElement('div');
    card.dataset.taskId = task.id;
    card.style.cssText = `
      background: ${colors[task.status]};
      border: 1px solid rgba(136, 136, 136, 0.3);
      border-radius: 2px;
      padding: 8px;
      font-family: monospace;
      font-size: 11px;
      color: #2a2a2a;
      box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.1);
      cursor: pointer;
      transition: transform 0.1s;
      position: relative;
    `;

    card.onmouseover = () => {
      card.style.transform = 'scale(1.02)';
      card.style.borderColor = '#444444';
      card.style.borderWidth = '2px';
    };
    card.onmouseout = () => {
      card.style.transform = 'scale(1)';
      card.style.borderColor = 'rgba(136, 136, 136, 0.3)';
      card.style.borderWidth = '1px';
    };
    card.onclick = () => this.showTaskDetailsOverlay(task);

    const text = document.createElement('div');
    text.textContent = task.description;
    text.style.cssText = `
      word-wrap: break-word;
      margin-bottom: 4px;
      padding-right: 16px;
    `;

    const meta = document.createElement('div');
    meta.style.cssText = `
      font-size: 9px;
      color: #666;
      margin-top: 4px;
      display: flex;
      align-items: center;
      gap: 4px;
    `;

    // Get agent color (use agentId if available, fallback to assignedTo)
    const agentIdentifier = task.agentId || task.assignedTo;
    const color = getAgentColor(agentIdentifier);

    // Agent dot (now visible for all statuses)
    const dot = document.createElement('div');
    dot.style.cssText = `
      width: 6px;
      height: 6px;
      background: #${color.toString(16).padStart(6, '0')};
      border: 1px solid white;
      border-radius: 50%;
      flex-shrink: 0;
    `;

    // Agent name
    const agentName = document.createElement('span');
    agentName.textContent = task.agentName || task.assignedTo;
    agentName.style.cssText = `
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    `;

    meta.appendChild(dot);
    meta.appendChild(agentName);

    card.appendChild(text);
    card.appendChild(meta);

    container.appendChild(card);
  }

  private showTaskDetailsOverlay(task: Task) {
    // Create a simple alert-style popup
    const details = `
Task: ${task.description}
Status: ${task.status.replace('_', ' ').toUpperCase()}
Agent: ${task.agentName || task.assignedTo}
Team: ${task.team || 'N/A'}
ID: ${task.id}
    `.trim();
    alert(details);
  }

  addTask(task: Task) {
    if (this.tasks.has(task.id)) {
      this.updateTask(task);
      return;
    }

    // Store task data - rendering happens in DOM overlay
    this.tasks.set(task.id, {
      task,
      container: null as any,
      bg: null as any,
      text: null as any,
      dot: undefined
    });

    // If overlay is open, render the card immediately
    if (this.isOpen) {
      this.renderTaskCard(task);
    }
  }

  updateTask(updatedTask: Task) {
    const card = this.tasks.get(updatedTask.id);
    if (!card) {
      this.addTask(updatedTask);
      return;
    }

    const oldStatus = card.task.status;
    const newStatus = updatedTask.status;

    // Update the card's task data
    card.task = updatedTask;

    // If overlay is open, re-render the task
    if (this.isOpen) {
      this.renderTaskCard(updatedTask);
    }

    // Show completion animation if status changed to completed
    if (oldStatus !== newStatus && newStatus === 'completed') {
      this.showCompletionEffect();
    }
  }

  private showCompletionEffect() {
    // Visual feedback for task completion - flash the wall icon
    if (!this.wallIcon) return;

    this.scene.tweens.add({
      targets: this.wallIcon,
      alpha: 0.5,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 100,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        this.wallIcon.setAlpha(1);
        this.wallIcon.setScale(1);
      }
    });
  }

  clear() {
    this.tasks.clear();
    if (this.isOpen) {
      this.renderAllTasks();
    }
  }
}
